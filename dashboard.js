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
        bus: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-2.2-1.8-4-4-4H6c-2.2 0-4 1.8-4 4v3c0 .6.4 1 1 1h2"/><path d="M19 17H5v-5a7 7 0 0 1 14 0v5z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>`,
        mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
        backArrow: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
        mic: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`
    };

    // --- RENDER FUNCTIONS ---
    function renderDashboard() {
        appContainer.innerHTML = `
            <div id="dashboard" class="h-full bg-black flex flex-col justify-between p-4 safe-area-inset-top safe-area-inset-bottom">
                <div>
                    <h1 class="text-4xl font-bold text-white">Hello</h1>
                    <p class="text-xl text-gray-400">How can I help?</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4 my-8">
                    <button id="bus-tool-btn" class="aspect-square bg-white/10 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 border border-white/20">
                        <div class="text-purple-400">${icons.bus}</div>
                        <span class="text-white mt-2 font-medium">Bus Times</span>
                    </button>
                    <!-- Add more tools here with the same styling -->
                </div>

                <div class="relative w-full">
                    <div class="absolute -inset-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-75"></div>
                    <div class="relative flex items-center bg-gray-900/80 backdrop-blur-xl border border-white/20 rounded-full p-2">
                        <input type="text" placeholder="Ask Jarvis..." class="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none px-4">
                        <button class="p-2 text-white">${icons.mic}</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('bus-tool-btn').addEventListener('click', renderBusTool);
    }
    
    function renderBusTool() {
        appContainer.innerHTML = `
            <div id="bus-tool" class="h-full w-full relative bg-black">
                <div id="map" class="absolute inset-0"></div>
                 <div id="bus-info-panel" class="bg-gray-900/80 backdrop-blur-md p-4 rounded-t-3xl absolute bottom-20 left-0 right-0 transform translate-y-full transition-transform duration-300 ease-in-out max-h-[40%] overflow-y-auto safe-area-inset-bottom">
                    <!-- Bus times will be injected here -->
                </div>
                <nav class="absolute bottom-0 w-full bg-black/50 backdrop-blur-md flex justify-around items-center h-20 safe-area-inset-bottom">
                   <button id="back-to-dashboard" class="text-white p-3 rounded-full bg-gray-700">${icons.backArrow}</button>
                   <button id="find-local-buses" class="text-black bg-white font-semibold py-3 px-6 rounded-full">Find Local Buses</button>
                   <div class="w-12"></div> <!-- spacer -->
                </nav>
            </div>
        `;
        // Adjust map container to not overlap the nav bar
        const mapElement = document.getElementById('map');
        mapElement.style.bottom = '80px'; // Height of the nav bar
        
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
        map = L.map('map', { zoomControl: false }).setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const userLatLng = [latitude, longitude];
                map.setView(userLatLng, 16);
                if(userMarker) userMarker.remove();
                userMarker = L.marker(userLatLng).addTo(map);
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
                const YARDS_IN_METERS = 0.9144;
                const searchRadius = 100 * YARDS_IN_METERS;

                let nearbyStops = [];

                mockBusStops.forEach(stop => {
                    const stopLatLng = L.latLng(stop.lat, stop.lon);
                    const distance = userLatLng.distanceTo(stopLatLng);
                    if (distance <= searchRadius) {
                        nearbyStops.push(stop);
                        L.marker([stop.lat, stop.lon]).addTo(map).bindPopup(`<b>Stop ${stop.id}</b><br>${stop.name}`);
                    }
                });
                
                if (nearbyStops.length > 0) {
                     map.setView([nearbyStops[0].lat, nearbyStops[0].lon], 17);
                    showBusInfoPanel(nearbyStops);
                } else {
                     showBusInfoPanel([]); // Show an empty state
                }
            },
            () => alert("Please enable location services to find local buses."),
            { enableHighAccuracy: true }
        );
    }
    
    function showBusInfoPanel(stops) {
        const panel = document.getElementById('bus-info-panel');
        if (!panel) return;

        let content = '';
        if (stops && stops.length > 0) {
            content = stops.map(stop => {
                const busList = stop.buses.map(bus => `
                    <div class="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                        <div class="flex items-center">
                            <div class="bg-yellow-400 text-black font-bold rounded w-10 text-center mr-4 p-1">${bus.route}</div>
                            <span class="text-white">${bus.destination}</span>
                        </div>
                        <div class="text-lg font-semibold text-white">${bus.arrival === 'Due' ? 'Due' : `${bus.arrival} min`}</div>
                    </div>
                `).join('');
                
                return `
                    <div class="mb-6">
                        <h2 class="text-xl font-bold text-white">Stop ${stop.id} - ${stop.name}</h2>
                        <div class="mt-2">${busList}</div>
                    </div>
                `;
            }).join('');
        } else {
            content = `<p class="text-gray-400 text-center py-4">No bus stops found within 100 yards.</p>`;
        }
        
        panel.innerHTML = content;
        // Slide panel up
        setTimeout(() => panel.style.transform = 'translateY(0)', 100);
    }


    // --- PUBLIC API ---
    return {
        initDashboard: function(container) {
            appContainer = container;
            renderDashboard();
        }
    };

})();


