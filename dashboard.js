// --- DASHBOARD.JS ---
// Renders the main dashboard, handles card parallax effects, and launches tools.

window.Jarvis = (function() {
    let appContainer = null;

    // --- RENDER FUNCTION ---
    function renderDashboard() {
        appContainer.innerHTML = `
            <div id="dashboard" class="h-full bg-black flex flex-col justify-between p-4 safe-area-inset-top safe-area-inset-bottom overflow-hidden">
                <div>
                    <h1 class="text-4xl font-bold text-white">Hello</h1>
                    <p class="text-xl text-gray-400">How can I help?</p>
                </div>
                
                <div id="tool-cards-container" class="grid grid-cols-2 gap-4 my-8" style="perspective: 1000px;">
                    <div class="tool-card aspect-square">
                         <button id="bus-tool-btn" class="w-full h-full bg-gray-900 rounded-2xl flex flex-col items-center justify-end p-4 border border-white/10 overflow-hidden relative shadow-lg">
                            <!-- SVG Poster for Bus Times -->
                            <div class="absolute inset-0 flex items-center justify-center">
                                <svg width="100%" height="100%" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" class="opacity-80">
                                    <!-- Abstract map background -->
                                    <path d="M 10 10 L 80 10 L 140 40 L 140 110 L 70 140 L 10 110 Z" fill="rgba(192, 132, 252, 0.1)"/>
                                    <!-- Route line -->
                                    <path d="M 30 80 Q 75 120, 120 70" stroke="#c084fc" stroke-width="4" fill="none" stroke-linecap="round"/>
                                    <!-- Bus Icon -->
                                    <g transform="translate(15, 65) scale(1.5)">
                                        <rect x="2" y="5" width="16" height="8" rx="2" stroke="white" stroke-width="1.2" fill="none"/>
                                        <rect x="0" y="3" width="20" height="4" rx="2" fill="#c084fc"/>
                                        <circle cx="5" cy="15" r="2" fill="white"/>
                                        <circle cx="15" cy="15" r="2" fill="white"/>
                                    </g>
                                </svg>
                            </div>
                            <span class="text-white font-medium z-10 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">Bus Times</span>
                        </button>
                    </div>
                    <!-- Add more cards here -->
                </div>

                <div class="relative w-full">
                    <div class="absolute -inset-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-75"></div>
                    <div class="relative flex items-center bg-gray-900/80 backdrop-blur-xl border border-white/20 rounded-full p-2">
                        <input type="text" placeholder="Ask Jarvis..." class="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none px-4">
                        <button class="p-2 text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('bus-tool-btn').addEventListener('click', launchBusTool);
        
        // Initialize effects
        initParallax();
    }

    // --- LAUNCHERS ---
    function launchBusTool() {
        if (window.Jarvis.BusTool && typeof window.Jarvis.BusTool.show === 'function') {
            window.Jarvis.BusTool.show(appContainer);
            // Stop parallax effect when leaving dashboard
            window.removeEventListener('deviceorientation', handleOrientation);
        } else {
            console.error('Bus Tool module not found!');
        }
    }

    // --- VISUAL EFFECTS ---
    let handleOrientation; // To store the function for removal

    function initParallax() {
        const cards = document.querySelectorAll('.tool-card');
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
           // On a real device, you'd have a UI element to trigger this permission request.
           // For now, we proceed assuming it's granted or not needed.
        }

        handleOrientation = function(event) {
            const beta = event.beta;  // front-back tilt (-180 to 180)
            const gamma = event.gamma; // left-right tilt (-90 to 90)

            cards.forEach(card => {
                const rotateX = (beta / 180) * 20; // Reduced max rotation
                const rotateY = (gamma / 90) * 20; // Reduced max rotation
                card.style.transform = `rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
            });
        }
        window.addEventListener('deviceorientation', handleOrientation);
    }

    // --- PUBLIC API ---
    return {
        initDashboard: function(container) {
            appContainer = container;
            renderDashboard();
        },
    };
})();


