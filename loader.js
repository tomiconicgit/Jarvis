// --- LOADER.JS ---
// Responsible for showing a loading screen and dynamically loading all other application scripts.

(function() {
    const appContainer = document.getElementById('app');
    let animationFrameId;
    let scene, camera, renderer, particleSystem;
    const mouse = new THREE.Vector2();

    function showLoadingScreen() {
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

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const particleCount = 7000;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x8257E5,
            size: 0.02,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.8
        });

        particleSystem = new THREE.Points(particles, particleMaterial);
        scene.add(particleSystem);
        
        camera.position.z = 5;

        window.addEventListener('resize', onWindowResize, false);
        document.addEventListener('mousemove', onMouseMove, false);

        animate();
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    const clock = new THREE.Clock();

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Animate particles
        particleSystem.rotation.y = elapsedTime * 0.1;
        particleSystem.rotation.x = elapsedTime * 0.05;

        // Mouse interaction
        camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (-mouse.y * 0.5 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    function hideLoadingScreen() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                cancelAnimationFrame(animationFrameId);
                document.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('resize', onWindowResize);
                loader.remove();
            }, 1000);
        }
    }

    async function loadScripts() {
        // We'll dynamically import main.js to get the list of scripts
        const mainModule = await import('./src/main.js');
        const scriptsToLoad = mainModule.default.scripts;

        const scriptPromises = scriptsToLoad.map(src => {
            return new Promise((resolve, reject) => {
                // Skip loading scripts that might already be on the page
                if (document.querySelector(`script[src="${src}"]`)) {
                    resolve();
                    return;
                }
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

        // Since Three.js is already in index.html, we can wait a bit for it to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        const scriptsLoaded = await loadScripts();

        if (scriptsLoaded) {
            // A delay to enjoy the animation
            setTimeout(() => {
                hideLoadingScreen();
                if (window.Jarvis && typeof window.Jarvis.initDashboard === 'function') {
                    window.Jarvis.initDashboard(appContainer);
                } else {
                    console.error('Jarvis.initDashboard function not found!');
                    appContainer.innerHTML = `<div class="p-4 text-red-500">Error: Application failed to initialize.</div>`;
                }
            }, 3500);
        } else {
            document.getElementById('loader-content').innerHTML = `<p class="text-red-500">Failed to load essential scripts.</p>`;
        }
    }

    initialize();
})();
