// --- In bus-tool.js ---

function findAndShowLocalBuses() {
    const button = document.getElementById('find-local-buses');
    button.querySelector('.animate-pulse').classList.remove('animate-pulse');

    navigator.geolocation.getCurrentPosition(pos => {
        const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        // 1. INCREASED SEARCH RADIUS to 800 meters (approx. 0.5 miles)
        const searchRadius = 800; 
        
        let nearbyStops = [];

        mockBusStops.forEach(stop => {
            const stopLatLng = L.latLng(stop.lat, stop.lon);
            const distance = userLatLng.distanceTo(stopLatLng); // Calculate distance

            if (distance <= searchRadius) {
                // 2. STORE THE DISTANCE along with the stop info
                nearbyStops.push({ ...stop, distance: distance }); 
            }
        });
        
        // 3. SORT THE STOPS by distance, closest first
        nearbyStops.sort((a, b) => a.distance - b.distance);
        
        // Add markers for all found stops
        nearbyStops.forEach(stop => {
             L.marker([stop.lat, stop.lon]).addTo(map).bindPopup(`<b>Stop ${stop.id}</b><br>${stop.name}`);
        });

        if (nearbyStops.length > 0) {
            // Pan the map to the CLOSEST stop
            map.setView([nearbyStops[0].lat, nearbyStops[0].lon], 17, { animate: true });
            updateBusInfoPanel(nearbyStops);
        } else {
            // Update the message to reflect the new radius
            const panel = document.getElementById('bus-info-panel');
            const contentEl = document.getElementById('bus-info-content');
            contentEl.innerHTML = `<p class="text-gray-400 text-center py-4">No bus stops found within 800 meters.</p>`;
            panel.style.transform = 'translateY(0)';
        }
    }, () => alert("Please enable location services to find local buses."));
}
