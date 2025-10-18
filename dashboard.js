// --- SRC/DASHBOARD.JS ---
// Renders the main dashboard, handles card parallax effects, and launches tools.

window.Jarvis = (function() {
    let appContainer = null;
    let handleOrientation; // To store the function for removal

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
                            <div class="absolute inset-0 flex items-center justify-center">
                                <svg width="100%" height="100%" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" class="opacity-80">
                                    <path d="M 10 10 L 80 10 L 140 40 L 140 110 L 70 140 L 10 110 Z" fill="rgba(192, 132, 252, 0.1)"/>
                                    <path d="M 30 80 Q 75 120, 120 70" stroke="#c084fc" stroke-width="4" fill="none" stroke-linecap="round"/>
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
                    
                    <div class="tool-card aspect-square">
                         <button id="video-tool-btn" class="w-full h-full bg-gray-900 rounded-2xl flex flex-col items-center justify-end p-4 border border-white/10 overflow-hidden relative shadow-lg">
                            <div class="absolute inset-0 flex items-center justify-center">
                                <svg width="100%" height="100%" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" class="opacity-80">
                                     <path d="M 10 40 L 10 110 L 140 110 L 140 40 Z" fill="rgba(34, 197, 94, 0.1)"/>
                                     <polyline points="50,70 75,95 100,70" stroke="#22c55e" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                                     <line x1="75" y1="50" x2="75" y2="95" stroke="#22c55e" stroke-width="6" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <span class="text-white font-medium z-10 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">Video Downloader</span>
                        </button>
                    </div>

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
        document.getElementById('video-tool-btn').addEventListener('click', launchVideoDownloader);
        
        // Initialize effects
        initParallax();
    }

    // --- LAUNCHERS ---
    function stopParallax() {
        if (handleOrientation) {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
    }

    function launchBusTool() {
        if (window.Jarvis.BusTool && typeof window.Jarvis.BusTool.show === 'function') {
            stopParallax();
            window.Jarvis.BusTool.show(appContainer);
        } else {
            console.error('Bus Tool module not found!');
        }
    }
    
    function launchVideoDownloader() {
        if (window.Jarvis.VideoDownloader && typeof window.Jarvis.VideoDownloader.show === 'function') {
            stopParallax();
            window.Jarvis.VideoDownloader.show(appContainer);
        } else {
            console.error('Video Downloader module not found!');
        }
    }

    // --- VISUAL EFFECTS ---
    function initParallax() {
        const cards = document.querySelectorAll('.tool-card');
        if ('DeviceOrientationEvent' in window) {
            handleOrientation = function(event) {
                const beta = event.beta;  // front-back tilt
                const gamma = event.gamma; // left-right tilt

                // Normalize and cap the values for a subtle effect
                const rotX = Math.min(Math.max(beta, -45), 45) / 45 * 10;
                const rotY = Math.min(Math.max(gamma, -45), 45) / 45 * 10;

                cards.forEach(card => {
                    card.style.transform = `rotateX(${-rotX}deg) rotateY(${rotY}deg)`;
                });
            }
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

    // --- PUBLIC API ---
    return {
        initDashboard: function(container) {
            appContainer = container;
            renderDashboard();
        },
    };
})();
