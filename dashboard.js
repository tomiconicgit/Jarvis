// --- DASHBOARD.JS ---
// Contains all UI elements and logic for the dashboard and its tools.

window.Jarvis = (function() {

    let appContainer = null;
    let map = null;
    let userMarker = null;

    // --- MOCK DATA ---
    // In a real app, you would fetch this from a live transport API.
    const mockBusStops = [
        { id: 'A', name: "Victoria Station", lat: 51.4952, lon: -0.1436, buses: [ { route: '11', destination: 'Fulham Broadway', arrival: 2 }, { route: '211', destination: 'Hammersmith', arrival: 5 }, { route: 'C1', destination: 'White City', arrival: 9 }] },
        { id: 'B', name: "Parliament Square", lat: 51.5008, lon: -0.1265, buses: [ { route: '3', destination: 'Trafalgar Square', arrival: 'Due' }, { route: '87', destination: 'Aldwych', arrival: 4 }] },
        { id: 'C', name: "Trafalgar Square", lat: 51.5080, lon: -0.1281, buses: [ { route: '9', destination: 'Hyde Park Corner', arrival: 1 }, { route: '15', destination: 'Blackwall', arrival: 6 }] },
        { id: 'D', name: "Waterloo Station", lat: 51.5031, lon: -0.1123, buses: [ { route: '1', destination: 'Holborn', arrival: 3 }, { route: '26', destination: 'Hackney Wick', arrival: 8 }, { route: '76', destination: 'Tottenham Hale', arrival: 12 }] },
    ];

    // --- SVGs ---
    const icons = {
        bus: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-2.2-1.8-4-4-4H6c-2.2 0-4 1.8-4 4v3c0 .6.4 1 1 1h2"/><path d="M19 17H5v-5a7 7 0 0 1 14 0v5z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>`,
        mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
        backArrow: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
    };

    // --- RENDER FUNCTIONS ---
    function renderDashboard() {
        appContainer.innerHTML = `
            <div id="dashboard" class="h-full bg-black p-4 pt-16">
                <h1 class="text-4xl font-bold text-white">Jarvis</h1>
                <div class="grid grid-cols-2 gap-4 mt-8">
                    <button id="bus-tool-btn" class="aspect-square bg-gray-800 rounded-2xl flex flex-col items-center justify-center p-4">
                        <div class="text-blue-400">${icons.bus}</div>
                        <span class="text-white mt-2">Bus Times</span>
                    </button>
                    <!-- Add more tools here -->
                </div>
            </div>
        `;
        document.getElementById('bus-tool-btn').addEventListener('click', renderBusTool);
    }
    
    function renderBusTool() {
        appContainer.innerHTML = `
            <div id="bus-tool" class="h-full w-full flex flex-col bg-black">
                <div id="map" class="flex-grow"></div>
                <div id="bus-info-panel" class="bg-gray-900 p-4 rounded-t-2xl absolute bottom-0 left-0 right-0 transform translate-y-full transition-transform duration-300 ease-in-out max-h-[40%] overflow-y-auto">
                    <!-- Bus times will be injected here -->
                </div>
                <nav class="absolute bottom-0 w-full bg-black/50 backdrop-blur-md flex justify-around items-center p-2 h-20 safe-area-inset-bottom">
                   <button id="back-to-dashboard" class="text-white p-3 rounded-full bg-gray-700">${icons.backArrow}</button>
                   <button id="find-local-buses" class="text-black bg-white font-semibold py-3 px-6 rounded-full">Find Local Buses</button>
                   <div class="w-12"></div> <!-- spacer -->
                </nav>
            </div>
        `;
        document.getElementById('back-to-dashboard').addEventListener('click', renderDashboard);
        document.getElementById('find-local-buses').addEventListener('click', findAndShowLocalBuses);
        
        initializeMap();
    }

    // --- BUS TOOL LOGIC ---
    function initializeMap() {
        if (!L) {
            console.error("Leaflet is not loaded!");
            return;
        }
        // Initial view on London
        map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        // Try to get user's location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const userLatLng = [latitude, longitude];
                map.setView(userLatLng, 16);
                if(userMarker) userMarker.remove();
                userMarker = L.marker(userLatLng).addTo(map).bindPopup("You are here").openPopup();
            },
            () => console.log("Could not get user location."),
            { enableHighAccuracy: true }
        );
    }

    function findAndShowLocalBuses() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const userLatLng = L.latLng(latitude, longitude);
                
                // Find the closest bus stop from mock data
                let closestStop = null;
                let minDistance = Infinity;

                mockBusStops.forEach(stop => {
                    const stopLatLng = L.latLng(stop.lat, stop.lon);
                    const distance = userLatLng.distanceTo(stopLatLng);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestStop = stop;
                    }
                     // Add all stops to the map
                    L.marker([stop.lat, stop.lon]).addTo(map).bindPopup(`Stop ${stop.id}: ${stop.name}`);
                });
                
                if (closestStop) {
                    map.setView([closestStop.lat, closestStop.lon], 17);
                    showBusInfoPanel(closestStop);
                } else {
                     showBusInfoPanel(null); // Show an empty state
                }
            },
            () => alert("Please enable location services to find local buses."),
            { enableHighAccuracy: true }
        );
    }
    
    function showBusInfoPanel(stop) {
        const panel = document.getElementById('bus-info-panel');
        if (!panel) return;

        let content = '';
        if (stop) {
            const busList = stop.buses.map(bus => `
                <div class="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                    <div class="flex items-center">
                        <div class="bg-yellow-400 text-black font-bold rounded w-10 text-center mr-4">${bus.route}</div>
                        <span class="text-white">${bus.destination}</span>
                    </div>
                    <div class="text-lg font-semibold text-white">${bus.arrival === 'Due' ? 'Due' : `${bus.arrival} min`}</div>
                </div>
            `).join('');
            
            content = `
                <h2 class="text-xl font-bold text-white">Stop ${stop.id} - ${stop.name}</h2>
                <div class="mt-4">${busList}</div>
            `;
        } else {
            content = `<p class="text-gray-400 text-center">No bus stops found nearby.</p>`;
        }
        
        panel.innerHTML = content;
        panel.classList.remove('translate-y-full'); // Slide panel up
    }


    // --- PUBLIC API ---
    return {
        initDashboard: function(container) {
            appContainer = container;
            renderDashboard();
        }
    };

})();

