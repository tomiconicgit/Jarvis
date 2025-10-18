// --- DASHBOARD.JS ---
// Renders the main dashboard, handles card parallax effects, and launches tools.

window.Jarvis = (function() {
    let appContainer = null;
    let cardAnimationId;

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
                         <button id="bus-tool-btn" class="w-full h-full bg-white/10 backdrop-blur-md rounded-2xl flex flex-col items-center justify-end p-4 border border-white/20 overflow-hidden relative">
                            <canvas class="absolute inset-0 w-full h-full"></canvas>
                            <span class="text-white font-medium z-10">Bus Times</span>
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
        
        // Initialize animations and effects
        initParallax();
        initCardAnimation(document.querySelector('#bus-tool-btn canvas'));
    }

    // --- LAUNCHERS ---
    function launchBusTool() {
        if (window.Jarvis.BusTool && typeof window.Jarvis.BusTool.show === 'function') {
            window.Jarvis.BusTool.show(appContainer);
            // Stop animations when leaving dashboard
            cancelAnimationFrame(cardAnimationId);
            window.removeEventListener('deviceorientation', handleOrientation);
        } else {
            console.error('Bus Tool module not found!');
        }
    }

    // --- VISUAL EFFECTS ---
    function initCardAnimation(canvas) {
        if (!canvas || typeof THREE === 'undefined') return;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);

        const geometry = new THREE.TorusGeometry(2, 0.5, 16, 100);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x9333ea, // Purple
            roughness: 0.5,
            metalness: 0.8,
            emissive: 0x9333ea,
            emissiveIntensity: 0.3
        });
        const torus = new THREE.Mesh(geometry, material);
        scene.add(torus);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);

        camera.position.z = 5;

        function animate() {
            cardAnimationId = requestAnimationFrame(animate);
            torus.rotation.x += 0.01;
            torus.rotation.y += 0.005;
            renderer.render(scene, camera);
        }
        animate();
    }

    let handleOrientation; // To store the function for removal

    function initParallax() {
        const cards = document.querySelectorAll('.tool-card');
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            // For simplicity, we'll attach to the window and assume permission is granted or not required.
            // A real app would have a button to request permission.
        }

        handleOrientation = function(event) {
            const beta = event.beta;  // front-back tilt (-180 to 180)
            const gamma = event.gamma; // left-right tilt (-90 to 90)

            cards.forEach(card => {
                const rotateX = (beta / 180) * 30; // Max rotation 30deg
                const rotateY = (gamma / 90) * 30; // Max rotation 30deg
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


