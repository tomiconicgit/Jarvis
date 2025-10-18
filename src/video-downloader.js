// --- SRC/VIDEO-DOWNLOADER.JS ---
// A tool to fetch videos from social media links.

window.Jarvis.VideoDownloader = (function() {
    let appContainer = null;
    let selectedPlatform = 'instagram'; // Default platform

    function render() {
        const toolHTML = `
            <style>
                /* Custom styles for the radio buttons */
                .platform-selector input[type="radio"] { display: none; }
                .platform-selector label {
                    cursor: pointer;
                    padding: 0.5rem 1rem;
                    border-radius: 9999px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.2s ease-in-out;
                    color: rgba(255, 255, 255, 0.6);
                }
                .platform-selector input[type="radio"]:checked + label {
                    color: white;
                    font-weight: 500;
                    border-color: #a855f7; /* Purple */
                    background-color: rgba(168, 85, 247, 0.2);
                }
            </style>
            <div id="video-downloader-tool" class="h-full bg-black flex flex-col p-4 safe-area-inset-top safe-area-inset-bottom">
                <div class="flex items-center mb-6">
                    <button id="back-to-dashboard" class="text-gray-300 mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <h2 class="text-2xl font-bold text-white">Video Downloader</h2>
                </div>

                <form id="video-form" class="flex flex-col gap-6">
                    <div>
                        <label for="video-url" class="text-sm font-medium text-gray-400 mb-2 block">Video Link</label>
                        <input type="url" id="video-url" placeholder="Paste link here..." class="w-full bg-gray-900 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-400 mb-2 block">Platform</label>
                        <div class="platform-selector flex items-center gap-3">
                            <input type="radio" id="platform-ig" name="platform" value="instagram" checked>
                            <label for="platform-ig">Instagram</label>
                            <input type="radio" id="platform-x" name="platform" value="x">
                            <label for="platform-x">X</label>
                            <input type="radio" id="platform-tiktok" name="platform" value="tiktok">
                            <label for="platform-tiktok">TikTok</label>
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200">
                        Fetch Video
                    </button>
                </form>
                
                <div id="status-area" class="text-center text-gray-400 mt-6"></div>
                <div id="result-area" class="hidden mt-6 bg-gray-900 border border-white/10 rounded-lg p-4">
                    <img id="video-thumbnail" src="" alt="Video Thumbnail" class="w-full h-48 object-cover rounded-md mb-4">
                    <h3 id="video-title" class="text-white font-semibold mb-2"></h3>
                    <p id="video-author" class="text-sm text-gray-400 mb-4"></p>
                    <a id="download-btn" href="#" download class="block w-full text-center bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors duration-200">
                        Download Now
                    </a>
                </div>

            </div>
        `;
        appContainer.innerHTML = toolHTML;
        attachEventListeners();
    }

    function attachEventListeners() {
        document.getElementById('back-to-dashboard').addEventListener('click', () => {
            // Reload the dashboard view
            if (window.Jarvis && typeof window.Jarvis.initDashboard === 'function') {
                window.Jarvis.initDashboard(appContainer);
            }
        });

        document.getElementById('video-form').addEventListener('submit', handleFetch);
        
        document.querySelectorAll('.platform-selector input[name="platform"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedPlatform = e.target.value;
                console.log('Platform changed to:', selectedPlatform);
            });
        });
    }

    function handleFetch(event) {
        event.preventDefault();
        const urlInput = document.getElementById('video-url');
        const statusArea = document.getElementById('status-area');
        const resultArea = document.getElementById('result-area');
        
        resultArea.classList.add('hidden'); // Hide previous results
        
        const url = urlInput.value.trim();
        if (!url) {
            statusArea.textContent = 'Please paste a video link.';
            statusArea.className = 'text-center text-red-500 mt-6';
            return;
        }

        statusArea.textContent = `Fetching from ${selectedPlatform}...`;
        statusArea.className = 'text-center text-gray-400 mt-6';

        // --- IMPORTANT ---
        // In a real application, you would send the 'url' and 'selectedPlatform' to your own server-side API here.
        // Your server would then handle the complex and platform-specific logic of fetching the video.
        // Direct client-side downloading is not feasible due to CORS policies and Terms of Service.
        // The following is a SIMULATION of a successful fetch.
        
        console.log(`Simulating fetch for URL: ${url} on platform: ${selectedPlatform}`);
        
        // Simulate a network delay
        setTimeout(() => {
            statusArea.textContent = ''; // Clear status message
            
            // Populate and show the result area with mock data
            document.getElementById('video-thumbnail').src = 'https://placehold.co/600x400/8257E5/FFFFFF?text=Video+Fetched';
            document.getElementById('video-title').textContent = 'Your Awesome Video Title';
            document.getElementById('video-author').textContent = 'by @youraccount';
            document.getElementById('download-btn').href = '#'; // In a real app, this would be the direct video URL from your server
            
            resultArea.classList.remove('hidden');

        }, 2000);
    }

    // --- PUBLIC API ---
    return {
        show: function(container) {
            appContainer = container;
            render();
        }
    };
})();
