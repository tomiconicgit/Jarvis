// loading.js
import { initDebugger, checkForErrors } from './debugger.js';
import { orchestrateModules } from './src/main.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const loadingInfo = document.getElementById('loading-info');

const modules = [
    { name: 'Debugger', path: './debugger.js' },
    { name: 'Main', path: './src/main.js' },
    { name: 'Viewport', path: './src/core/viewport.js' },
    { name: 'Camera', path: './src/core/camera.js' }
    // Add more modules here as needed
];

async function loadModules() {
    initDebugger();
    let loaded = 0;
    loadingInfo.textContent = 'Initializing...';

    for (const mod of modules) {
        loadingInfo.textContent = `Loading ${mod.name}...`;
        try {
            await import(mod.path); // Dynamic import for checking
            checkForErrors(mod.name); // Integrate debugger check
            loaded++;
            const percent = (loaded / modules.length) * 100;
            loadingProgress.style.width = `${percent}%`;
        } catch (error) {
            loadingInfo.textContent = `Error loading ${mod.name}: ${error.message}`;
            console.error(error);
            return; // Stop on error
        }
    }

    loadingInfo.textContent = 'Loading complete. Starting orchestration...';
    orchestrateModules();
    setTimeout(() => loadingScreen.style.display = 'none', 1000);
}

loadModules();