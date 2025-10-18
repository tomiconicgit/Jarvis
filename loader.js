// --- LOADER.JS ---
// Responsible for showing a loading screen and dynamically loading all other application scripts.

(function() {
    const appContainer = document.getElementById('app');

    function showLoadingScreen() {
        const loaderHTML = `
            <div id="loader" class="fixed inset-0 bg-black flex flex-col items-center justify-center transition-opacity duration-500 z-50">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" stroke="rgba(255, 255, 255, 0.2)" stroke-width="8" fill="none"/>
                    <circle cx="50" cy="50" r="45" stroke="#fff" stroke-width="8" fill="none"
                        stroke-dasharray="282.74"
                        stroke-dashoffset="282.74"
                        transform="rotate(-90 50 50)">
                        <animate attributeName="stroke-dashoffset" from="282.74" to="0" dur="2s" repeatCount="1" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1"/>
                    </circle>
                </svg>
                <p class="text-white mt-4 text-lg tracking-wider">JARVIS</p>
            </div>
        `;
        appContainer.innerHTML = loaderHTML;
    }

    function hideLoadingScreen() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    }

    async function loadScripts() {
        // Dynamically import the main.js module to get the list of files
        const mainModule = await import('./src/main.js');
        const scriptsToLoad = mainModule.default.scripts;

        const scriptPromises = scriptsToLoad.map(src => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = false; // Load scripts in order
                script.onload = () => {
                    console.log(`Loaded: ${src}`);
                    resolve();
                };
                script.onerror = () => {
                    console.error(`Failed to load: ${src}`);
                    reject(new Error(`Script load error for ${src}`));
                };
                document.head.appendChild(script);
            });
        });

        try {
            await Promise.all(scriptPromises);
            console.log('All scripts loaded successfully.');
            return true;
        } catch (error) {
            console.error('Core script loading failed:', error);
            // You could display an error message to the user here
            return false;
        }
    }
    
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    }

    async function initialize() {
        showLoadingScreen();
        registerServiceWorker();

        const scriptsLoaded = await loadScripts();

        if (scriptsLoaded) {
            // Wait for a bit to appreciate the animation, then start the app
            setTimeout(() => {
                hideLoadingScreen();
                // Call the initialization function from dashboard.js
                if (window.Jarvis && typeof window.Jarvis.initDashboard === 'function') {
                    window.Jarvis.initDashboard(appContainer);
                } else {
                    console.error('Jarvis.initDashboard function not found!');
                    appContainer.innerHTML = `<div class="p-4 text-red-500">Error: Application failed to initialize.</div>`;
                }
            }, 2500);
        }
    }

    initialize();
})();

