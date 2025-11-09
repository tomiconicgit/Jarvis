// src/core/ui/tools.js

// --- 1. Module-level App variable ---
let App;

// --- 2. Module-level elements ---
let toolsContainer;
// --- GONE: let toolsOpenBtn; ---

/**
 * Creates and injects the CSS styles for the tools UI.
 */
function injectStyles() {
    const styleId = 'tools-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        /* --- Styles for the slide-out panel --- */
        #tools-container {
            position: fixed;
            bottom: var(--status-bar-height);
            right: 0; /* Positioned on the right */
            width: 100%;
            height: 45vh;
            background: transparent;
            z-index: 5;
            display: flex;
            flex-direction: column;
            
            /* --- UPDATED: Start hidden off-screen to the right --- */
            transform: translateX(100%); 
            transition: var(--workspace-transition);
            will-change: transform;
        }

        /* --- UPDATED: Open state --- */
        #tools-container.is-open {
            transform: translateX(0);
        }

        .tools-header {
            /* ... (styles unchanged) ... */
            display: flex;
            align-items: center;
            padding: 0 16px;
            height: 48px;
            flex-shrink: 0;
            background: var(--ui-blue);
            color: #fff;
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-bottom: 1px solid rgba(0,0,0,0.2);
        }

        .tools-title {
            /* ... (styles unchanged) ... */
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin: 0;
            padding: 0;
            flex-grow: 1;
        }

        .tools-close-btn {
            /* ... (styles unchanged) ... */
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-right: -12px;
            margin-left: 8px;
        }
        
        .tools-close-btn svg {
            /* ... (styles unchanged) ... */
            width: 20px;
            height: 20px;
            stroke: #fff;
            stroke-width: 2;
        }
        
        .tools-tab-bar {
            /* ... (styles unchanged) ... */
            display: flex;
            flex-shrink: 0;
            background: var(--ui-light-grey);
            border-bottom: 1px solid var(--ui-border);
        }
        
        .tools-tab-btn {
            /* ... (styles unchanged) ... */
            flex: 1;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
            font-weight: 600;
            padding: 12px 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .tools-tab-btn.is-active {
            /* ... (styles unchanged) ... */
            color: #fff;
            border-bottom-color: var(--ui-blue);
        }
        
        .tools-tab-btn:active {
            /* ... (styles unchanged) ... */
            background: var(--ui-grey);
        }

        .tools-content {
            /* ... (styles unchanged) ... */
            flex-grow: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            background: var(--ui-grey);
            color: var(--workspace-text-color, #f5f5f7);
            padding: 8px;
        }

        /* --- GONE: All styles for #tools-open-btn removed --- */
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the tools UI.
 */
function createMarkup() {
    // 'X' icon for close
    const closeIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
    
    // --- GONE: cogIcon ---

    // 1. Main Container
    toolsContainer = document.createElement('div'); // <-- Use module-level var
    toolsContainer.id = 'tools-container';
    toolsContainer.innerHTML = `
        <div class="tools-header">
            <h2 class="tools-title">Tools</h2>
            <button class="tools-close-btn" aria-label="Close Tools">
                ${closeIcon}
            </button>
        </div>
        <div class="tools-tab-bar">
            <button class="tools-tab-btn is-active" data-tab="properties">Properties</button>
            <button class="tools-tab-btn" data-tab="transform">Transform</button>
        </div>
        <div class="tools-content">
            </div>
    `;

    // 2. --- GONE: Open Button ---

    // 3. Append to body
    document.body.appendChild(toolsContainer);
}

// --- 3. UI Interaction Functions ---

function openToolsPanel() {
    toolsContainer.classList.add('is-open');
    // --- GONE: toolsOpenBtn logic ---
}

function closeToolsPanel() {
    toolsContainer.classList.remove('is-open');
    // --- GONE: toolsOpenBtn logic ---
}

/**
 * Initializes the tools UI.
 */
export function initTools(app) {
    App = app; // Store App object
    
    // --- NEW: Create tools namespace and add API ---
    if (!App.tools) App.tools = {};
    App.tools.open = openToolsPanel;
    App.tools.close = closeToolsPanel;
    // ---
    
    injectStyles();
    createMarkup();

    // --- 4. Add Event Listeners ---
    const closeBtn = toolsContainer.querySelector('.tools-close-btn');
    closeBtn.addEventListener('click', closeToolsPanel);
    
    // --- GONE: toolsOpenBtn listener ---
    
    // Tab switching logic
    const tabBar = toolsContainer.querySelector('.tools-tab-bar');
    tabBar.addEventListener('click', (e) => {
        // ... (this logic is unchanged) ...
        const target = e.target.closest('.tools-tab-btn');
        if (!target) return;
        
        tabBar.querySelectorAll('.tools-tab-btn').forEach(btn => {
            btn.classList.remove('is-active');
        });
        
        target.classList.add('is-active');
        
        const tabName = target.dataset.tab;
        console.log(`Switched to tab: ${tabName}`);
    });

    console.log('Tools UI Initialized.');
}
