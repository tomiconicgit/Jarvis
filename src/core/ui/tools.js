// src/core/ui/tools.js

// --- 1. Module-level App variable ---
let App;

// --- 2. Module-level elements ---
let toolsContainer;

/**
 * Creates and injects the CSS styles for the tools UI.
 */
function injectStyles() {
    const styleId = 'tools-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        /* --- UPDATED: New variable --- */
        :root {
            --ui-blue: #007aff;
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 4px 12px rgba(0,0,0,0.15);
            --workspace-transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            /* --- UPDATED: New variable for bottom bar height --- */
            --bottom-bar-height: calc(60px + env(safe-area-inset-bottom));
        }

        /* --- Styles for the slide-out panel --- */
        #tools-container {
            position: fixed;
            /* --- UPDATED: Sits above the new bottom bar --- */
            bottom: var(--bottom-bar-height);
            right: 0;
            width: 100%;
            height: 40vh; /* <-- UPDATED: Shortened panel */
            background: transparent;
            z-index: 5;
            display: flex;
            flex-direction: column;
            transform: translateX(100%); 
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #tools-container.is-open {
            transform: translateX(0);
        }

        .tools-header {
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
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin: 0;
            padding: 0;
            flex-grow: 1;
        }

        .tools-close-btn {
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
            width: 20px;
            height: 20px;
            stroke: #fff;
            stroke-width: 2;
        }
        
        /* --- Tab Bar Styles --- */
        .tools-tab-bar {
            display: flex;
            flex-shrink: 0;
            background: var(--ui-light-grey);
            border-bottom: 1px solid var(--ui-border);
        }
        
        .tools-tab-btn {
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
            color: #fff;
            border-bottom-color: var(--ui-blue);
        }
        
        .tools-tab-btn:active {
            background: var(--ui-grey);
        }

        .tools-content {
            flex-grow: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            background: var(--ui-grey);
            color: var(--workspace-text-color, #f5f5f7);
            padding: 8px;
        }
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
    
    // 1. Main Container
    toolsContainer = document.createElement('div'); // Use module-level var
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

    // 2. Append to body
    document.body.appendChild(toolsContainer);
}

// --- 3. UI Interaction Functions ---

function openToolsPanel() {
    toolsContainer.classList.add('is-open');
}

function closeToolsPanel() {
    toolsContainer.classList.remove('is-open');
}

/**
 * Initializes the tools UI.
 */
export function initTools(app) {
    App = app; // Store App object
    
    // --- (Public API unchanged) ---
    if (!App.tools) App.tools = {};
    App.tools.open = openToolsPanel;
    App.tools.close = closeToolsPanel;
    
    injectStyles();
    createMarkup();

    // --- 4. Add Event Listeners ---
    const closeBtn = toolsContainer.querySelector('.tools-close-btn');
    closeBtn.addEventListener('click', closeToolsPanel);
    
    // Tab switching logic
    const tabBar = toolsContainer.querySelector('.tools-tab-bar');
    tabBar.addEventListener('click', (e) => {
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
