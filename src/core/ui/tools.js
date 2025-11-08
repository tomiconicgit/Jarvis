// src/core/ui/tools.js

// --- 1. Module-level App variable ---
let App;

// --- 2. Module-level elements for easy access ---
let toolsContainer;
let toolsOpenBtn;

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
            
            /* Start hidden off-screen to the right */
            transform: translateX(100%); 
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #tools-container.is-open {
            /* Slide into view */
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
            flex-grow: 1; /* Take up space */
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
        
        /* --- NEW: Tab Bar Styles --- */
        .tools-tab-bar {
            display: flex;
            flex-shrink: 0;
            background: var(--ui-light-grey);
            border-bottom: 1px solid var(--ui-border);
        }
        
        .tools-tab-btn {
            flex: 1; /* Each tab takes 50% width */
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

        /* --- Styles for the slide-in open button --- */
        #tools-open-btn {
            position: fixed;
            right: 0; /* Positioned on the right */
            top: 50%;
            background: var(--ui-blue);
            border: none;
            box-shadow: var(--ui-shadow);
            width: 44px;
            height: 60px;
            border-radius: var(--ui-corner-radius) 0 0 var(--ui-corner-radius);
            display: grid;
            place-items: center;
            cursor: pointer;
            z-index: 4;
            
            /* --- UPDATED: Start VISIBLE --- */
            transform: translateX(0) translateY(-50%);
            transition: var(--workspace-transition);
            will-change: transform;
        }

        /* --- UPDATED: New hidden state --- */
        #tools-open-btn.is-hidden {
            /* Hide off-screen to the right */
            transform: translateX(100%) translateY(-50%);
        }
        
        #tools-open-btn:active {
            background: var(--ui-blue-pressed);
        }
        
        #tools-open-btn svg {
             width: 24px;
             height: 24px;
             stroke: #fff;
             stroke-width: 2;
             transform: translateX(-2px);
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
    
    // "Cog" Icon
    const cogIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39 1.04c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.44h-3.84a.5.5 0 0 0-.5.44l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-1.04a.5.5 0 0 0-.61.22l-1.92 3.32a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32a.5.5 0 0 0 .61.22l2.39-1.04c.5.38 1.03.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.44h3.84a.5.5 0 0 0 .5-.44l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39 1.04a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"></path></svg>`;

    // 1. Main Container
    toolsContainer = document.createElement('div');
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

    // 2. Open Button
    toolsOpenBtn = document.createElement('button');
    toolsOpenBtn.id = 'tools-open-btn';
    toolsOpenBtn.setAttribute('aria-label', 'Open Tools');
    toolsOpenBtn.innerHTML = cogIcon;

    // 3. Append to body
    document.body.appendChild(toolsContainer);
    document.body.appendChild(toolsOpenBtn);
}

// --- 3. UI Interaction Functions ---

function openToolsPanel() {
    toolsContainer.classList.add('is-open');
    toolsOpenBtn.classList.add('is-hidden'); // --- UPDATED
}

function closeToolsPanel() {
    toolsContainer.classList.remove('is-open');
    toolsOpenBtn.classList.remove('is-hidden'); // --- UPDATED
}

// --- GONE: showToolsButton() and hideToolsButton() are removed ---

/**
 * Initializes the tools UI.
 */
export function initTools(app) {
    App = app; // Store App object
    
    injectStyles();
    createMarkup();

    // --- 4. Add Event Listeners ---
    const closeBtn = toolsContainer.querySelector('.tools-close-btn');
    closeBtn.addEventListener('click', closeToolsPanel);
    toolsOpenBtn.addEventListener('click', openToolsPanel);
    
    // Tab switching logic
    const tabBar = toolsContainer.querySelector('.tools-tab-bar');
    tabBar.addEventListener('click', (e) => {
        const target = e.target.closest('.tools-tab-btn');
        if (!target) return;
        
        // Remove active from all tabs
        tabBar.querySelectorAll('.tools-tab-btn').forEach(btn => {
            btn.classList.remove('is-active');
        });
        
        // Add active to the clicked tab
        target.classList.add('is-active');
        
        // TODO: Show content for the active tab
        const tabName = target.dataset.tab;
        console.log(`Switched to tab: ${tabName}`);
    });

    // --- 5. GONE: No more registration with Selection Context ---

    console.log('Tools UI Initialized.');
}
