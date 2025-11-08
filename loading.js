// loading.js
import { initDebugger, checkForErrors } from './debugger.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const loadingInfo = document.getElementById('loading-info');

const modules = [
    { name: 'Main', path: './src/main.js' },
    { name: 'Viewport', path: './src/core/viewport.js' },
    { name: 'Camera', path: './src/core/camera.js' }
];

async function loadModules() {
    initDebugger();
    let loaded = 0;
    loadingInfo.textContent = 'Initializing...';

    for (const mod of modules) {
        loadingInfo.textContent = `Loading ${mod.name}...`;
        try {
            await import(mod.path);
            checkForErrors(mod.name);
            loaded++;
            const percent = (loaded / modules.length) * 100;
            loadingProgress.style.width = `${percent}%`;
        } catch (error) {
            const msg = `Error loading ${mod.name}: ${error.message}`;
            loadingInfo.textContent = msg;
            console.error(msg, error);
            return; // Don't continue; keep loading screen with error message
        }
    }

    loadingInfo.textContent = 'Loading complete. Starting scene...';

    try {
        const mainModule = await import('./src/main.js');

        if (typeof mainModule.orchestrateModules !== 'function') {
            throw new Error('orchestrateModules() not exported from src/main.js');
        }

        mainModule.orchestrateModules();

        setTimeout(() => {
            if (loadingScreen) loadingScreen.style.display = 'none';
        }, 800);
    } catch (error) {
        const msg = `Error starting application: ${error.message}`;
        loadingInfo.textContent = msg;
        console.error('Orchestration failed:', error);
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // If you host in a subdirectory (GitHub Pages), change '/sw.js' to 'sw.js'
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                })
                .catch((err) => {
                    console.error('ServiceWorker registration failed:', err);
                });
        });
    }
}

loadModules();
registerServiceWorker();