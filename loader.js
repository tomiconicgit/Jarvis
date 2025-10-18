// --- LOADER.JS ---
// Responsible for showing a loading screen and dynamically loading all other application scripts.

(function() {
    const appContainer = document.getElementById('app');
    let animationFrameId;

    function showLoadingScreen() {
        // Create spans for each letter for animation
        const title = 'JARVIS'.split('').map((char, i) => 
            `<span style="--i: ${i+1}">${char}</span>`
        ).join('');

        const loaderHTML = `
            <style>
                .jarvis-title span {
                    display: inline-block;
                    opacity: 0;
                    transform: scale(0.8) translateY(20px);
                    animation: fadeInChar 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                    animation-delay: calc(var(--i) * 100ms + 0.5s);
                }
                @keyframes fadeInChar {
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            </style>
            <div id="loader" class="fixed inset-0 bg-black flex flex-col items-center justify-center transition-opacity duration-1000 z-50">
                <canvas id="loader-canvas"></canvas>
                <div id="loader-content" class="z-50 text-center transition-opacity duration-1000 opacity-100">
                    <h1 class="jarvis-title text-white text-5xl font-semibold tracking-[0.4em] ml-3">${title}</h1>
                </div>
            </div>
        `;
        appContainer.innerHTML = loaderHTML;

        initThreeJSAnimation();
    }
    
    function initThreeJSAnimation() {
        if (typeof THREE === 'undefined') {
            console.error("Three.js is not loaded!");
            return;
        }

        const canvas = document.getElementById('loader-canvas');
        if (!canvas) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const particleCount = 7000;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 15;
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x8257E5, // A nice purple
            size: 0.02,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.7
        });

        const particleSystem = new THREE.Points(particles, particleMaterial);
        scene.add(particleSystem);
        
        camera.position.z = 5;

        const clock = new THREE.Clock();

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            particleSystem.rotation.y = elapsedTime * 0.1;
            particleSystem.rotation.x = elapsedTime * 0.05;

            renderer.render(scene, camera);
        }
        
        animate();
    }


    function hideLoadingScreen() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                cancelAnimationFrame(animationFrameId); // Stop animation
                loader.remove();
            }, 1000);
        }
    }

    async function loadScripts() {
        const mainModule = await import('./src/main.js');
        const scriptsToLoad = mainModule.default.scripts;

        const scriptPromises = scriptsToLoad.map(src => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = () => { console.log(`Loaded: ${src}`); resolve(); };
                script.onerror = () => { console.error(`Failed to load: ${src}`); reject(new Error(`Script load error for ${src}`)); };
                document.head.appendChild(script);
            });
        });

        try {
            await Promise.all(scriptPromises);
            console.log('All modules loaded successfully.');
            return true;
        } catch (error) {
            console.error('Core script loading failed:', error);
            return false;
        }
    }
    
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(reg => console.log('ServiceWorker registration successful'))
                    .catch(err => console.log('ServiceWorker registration failed: ', err));
            });
        }
    }

    async function initialize() {
        showLoadingScreen();
        registerServiceWorker();

        const scriptsLoaded = await loadScripts();

        if (scriptsLoaded) {
            setTimeout(() => {
                hideLoadingScreen();
                if (window.Jarvis && typeof window.Jarvis.initDashboard === 'function') {
                    window.Jarvis.initDashboard(appContainer);
                } else {
                    console.error('Jarvis.initDashboard function not found!');
                    appContainer.innerHTML = `<div class="p-4 text-red-500">Error: Application failed to initialize.</div>`;
                }
            }, 3500);
        }
    }

    initialize();
})();


