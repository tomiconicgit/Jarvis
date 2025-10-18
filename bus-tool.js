// --- BUS-TOOL.JS ---
// The complete, self-contained module for the Bus Times tool.

window.Jarvis.BusTool = (function() {
    let appContainer = null;
    let map = null;
    let userMarker = null;

    // --- MOCK DATA ---
    const mockBusStops = [
        { id: 'A', name: "Victoria Station", lat: 51.4952, lon: -0.1436, buses: [ { route: '11', destination: 'Fulham Broadway', arrival: 2 }, { route: '211', destination: 'Hammersmith', arrival: 5 }, { route: 'C1', destination: 'White City', arrival: 9 }] },
        { id: 'B', name: "Parliament Square", lat: 51.5008, lon: -0.1265, buses: [ { route: '3', destination: 'Trafalgar Square', arrival: 'Due' }, { route: '87', destination: 'Aldwych', arrival: 4 }] },
        { id: 'C', name: "Trafalgar Square", lat: 51.5080, lon: -0.1281, buses: [ { route: '9', destination: 'Hyde Park Corner', arrival: 1 }, { route: '15', destination: 'Blackwall', arrival: 6 }] },
        { id: 'D', name: "Waterloo Station", lat: 51.5031, lon: -0.1123, buses: [ { route: '1', destination: 'Holborn', arrival: 3 }, { route: '26', destination: 'Hackney Wick', arrival: 8 }, { route: '76', destination: 'Tottenham Hale', arrival: 12 }] },
    ];

    // --- RENDER FUNCTION ---
    function show(container) {
        appContainer = container;
        appContainer.innerHTML = `
            <style>
                /* Custom map tile styling */
                .map-jarvis-style .leaflet-tile-pane {
                    filter: grayscale(1) contrast(1.2) brightness(0.7) sepia(1) hue-rotate(-280deg) saturate(5);
                }
            </style>
            <div id="bus-tool" class="h-full w-full flex flex-col bg-black transition-opacity duration-500 opacity-0">
                <header class="bg-black/30 backdrop-blur-md flex items-center p-4 h-24 z-20 safe-area-inset-top flex-shrink-0">
                    <button id="back-to-dashboard" class="text-white p-2 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
                    <h1 class="text-2xl font-bold text-white ml-4">Bus Times</h1>
                </header>
                
                <main class="flex-grow relative">
                    <div id="map" class="absolute inset-0"></div>
                    
                    <button id="find-local-buses" class="absolute bottom-10 right-5 z-10 p-4 rounded-full">
                        <div class="absolute -inset-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md opacity-75 animate-pulse"></div>
                        <div class="relative text-white"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
                    </button>

                     <div id="bus-info-panel" class="bg-gray-900/80 backdrop-blur-xl p-4 rounded-t-3xl absolute bottom-0 left-0 right-0 transform translate-y-full transition-transform duration-500 ease-in-out max-h-[60%] overflow-y-auto safe-area-inset-bottom">
                        <div class="w-10 h-1.5 bg-gray-600 rounded-full mx-auto mb-4"></div>
                        <div id="bus-info-content">
                            <p class="text-gray-400 text-center py-4">Tap the location button to find nearby bus stops.</p>
                        </div>
                    </div>
                </main>
            </div>
        `;

        // Fade in the tool
        setTimeout(() => {
            const toolEl = document.getElementById('bus-tool');
            if (toolEl) toolEl.style.opacity = '1';
        }, 50);

        document.getElementById('back-to-dashboard').addEventListener('click', hide);
        document.getElementById('find-local-buses').addEventListener('click', findAndShowLocalBuses);
        
        initializeMap();
    }
    
    function hide() {
        if (window.Jarvis && typeof window.Jarvis.initDashboard === 'function') {
            if (map) map.remove(); // Clean up map instance
            window.Jarvis.initDashboard(appContainer);
        }
    }

    // --- MAP & BUS LOGIC ---
    function initializeMap() {
        if (!L) { console.error("Leaflet is not loaded!"); return; }
        map = L.map('map', { zoomControl: false, attributionControl: false }).setView([51.505, -0.09], 13);
        map.getContainer().classList.add('map-jarvis-style'); // Add class for custom styling
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

        navigator.geolocation.getCurrentPosition(
            pos => {
                const userLatLng = [pos.coords.latitude, pos.coords.longitude];
                map.setView(userLatLng, 16);
                if(userMarker) userMarker.remove();
                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    html: '<div class="ringring"></div><div class="circle"></div>'
                });
                const userMarkerStyle = document.createElement('style');
                userMarkerStyle.innerHTML = `@keyframes sonar-effect { 0% {transform: scale(0.9); opacity: 1;} 100% {transform: scale(2); opacity: 0;} } .user-location-marker .ringring { border: 3px solid #a78bfa; border-radius: 50%; height: 25px; width: 25px; position: absolute; left: -0.5px; top: -0.5px; animation: sonar-effect 1.3s ease-out 75ms infinite; } .user-location-marker .circle { width: 15px; height: 15px; background-color: #a78bfa; border: 2px solid white; border-radius: 50%; position: absolute; left: 4.5px; top: 4.5px; }`;
                document.head.appendChild(userMarkerStyle);
                userMarker = L.marker(userLatLng, {icon: userIcon}).addTo(map);
            }, () => console.log("Could not get user location."), { enableHighAccuracy: true });
    }

    function findAndShowLocalBuses() {
        const button = document.getElementById('find-local-buses');
        button.querySelector('.animate-pulse').classList.remove('animate-pulse');

        navigator.geolocation.getCurrentPosition(pos => {
            const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
            const searchRadius = 100 * 0.9144; // 100 yards in meters
            let nearbyStops = [];

            mockBusStops.forEach(stop => {
                const stopLatLng = L.latLng(stop.lat, stop.lon);
                if (userLatLng.distanceTo(stopLatLng) <= searchRadius) {
                    nearbyStops.push(stop);
                    L.marker([stop.lat, stop.lon]).addTo(map).bindPopup(`<b>Stop ${stop.id}</b><br>${stop.name}`);
                }
            });
            
            if (nearbyStops.length > 0) {
                map.setView([nearbyStops[0].lat, nearbyStops[0].lon], 17, { animate: true });
                updateBusInfoPanel(nearbyStops);
            } else {
                updateBusInfoPanel([]);
            }
        }, () => alert("Please enable location services to find local buses."));
    }
    
    function updateBusInfoPanel(stops) {
        const panel = document.getElementById('bus-info-panel');
        const contentEl = document.getElementById('bus-info-content');
        if (!panel || !contentEl) return;

        let content = '';
        if (stops && stops.length > 0) {
            content = stops.map(stop => {
                const busList = stop.buses.map(bus => `
                    <div class="flex items-center justify-between py-4 border-b border-gray-700 last:border-b-0">
                        <div class="flex items-center">
                            <div class="bg-purple-500 text-white font-bold rounded-lg w-12 text-center mr-4 p-2">${bus.route}</div>
                            <div><span class="text-white font-medium">${bus.destination}</span></div>
                        </div>
                        <div class="text-xl font-semibold text-white">${bus.arrival === 'Due' ? 'Due' : `<span class="text-2xl">${bus.arrival}</span> min`}</div>
                    </div>`).join('');
                return `<div class="mb-6"><h2 class="text-xl font-bold text-white mb-2">Stop ${stop.id} - ${stop.name}</h2><div>${busList}</div></div>`;
            }).join('');
        } else {
            content = `<p class="text-gray-400 text-center py-4">No bus stops found within 100 yards.</p>`;
        }
        
        contentEl.innerHTML = content;
        panel.style.transform = 'translateY(0)'; // Slide panel up
    }

    // --- PUBLIC API ---
    return { show };
})();


