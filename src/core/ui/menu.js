// src/core/ui/menu.js

// --- Module-level App variable ---
let App;

// --- Module-level button variables ---
let menuBtn;
let workspaceBtn;
let addBtn; // <-- Retained for the wrapper
let playBtn;
let menuItemsContainer;

// --- SVG Icons (unchanged) ---
const ICONS = {
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    workspace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
};

/**
 * --- (injectStyles function is unchanged) ---
 */
function injectStyles() {
    const styleId = 'menu-ui-styles';
    if (document.getElementById(styleId)) return;
    const css = `
        :root {
            --ui-blue: #007aff;
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-dark-grey: #1c1c1c; 
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 -4px 12px rgba(0,0,0,0.15);
            --ui-safe-bottom: env(safe-area-inset-bottom);
            
            --main-bar-height: 60px;
            --editor-bar-height: 50px;
            --total-bar-height: calc(var(--main-bar-height) + var(--editor-bar-height) + var(--ui-safe-bottom));
        }
        
        #bottom-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: calc(var(--main-bar-height) + var(--ui-safe-bottom));
            background: var(--ui-dark-grey); 
            border-top: 1px solid var(--ui-border);
            z-index: 11; /* Above editor bar */
            display: flex;
            align-items: flex-start;
            padding-top: 5px;
            padding-bottom: var(--ui-safe-bottom);
            box-sizing: border-box;
            justify-content: space-around;
        }
        
        .bottom-bar-btn {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 50px;
            border-radius: 10px;
        }
        .bottom-bar-btn svg {
            width: 24px;
            height: 24px;
            margin-bottom: 2px;
        }
        
        .bottom-bar-btn:active {
            background: var(--ui-light-grey);
        }
        
        .bottom-bar-btn.is-active {
            color: var(--ui-blue);
            opacity: 1.0;
        }
        
        #menu-items-container {
            position: fixed;
            bottom: calc(var(--main-bar-height) + var(--ui-safe-bottom) + 5px);
            left: 5px;
            z-index: 12; 
            background: var(--ui-grey);
            border-radius: 8px; 
            box-shadow: var(--ui-shadow);
            clip-path: inset(100% 0 0 0);
            opacity: 0;
            transform: scale(0.95);
            transform-origin: bottom left;
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: none;
            overflow: hidden; 
            min-width: 170px;
        }
        
        #menu-items-container.is-open {
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: scale(1);
            pointer-events: auto;
        }
        .menu-item-separator {
            height: 1px;
            background: var(--ui-border);
            margin: 0 8px;
        }
        .menu-item-separator-full {
             height: 1px;
             background: var(--ui-border);
             margin: 0;
        }
        .menu-item {
            background: none;
            border: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            color: var(--workspace-text-color, #f5f5f7);
            font-size: 15px;
            padding: 14px 12px 14px 18px;
            cursor: pointer;
            text-align: left;
        }
        .menu-item.is-open {
            color: var(--ui-blue);
        }
        .menu-item:active {
            background: var(--ui-light-grey);
        }
        .menu-item-arrow {
            width: 16px;
            height: 16px;
            stroke: var(--workspace-text-color, #f5f5f7);
            stroke-width: 2.5;
            transition: transform 0.3s ease-out;
            opacity: 0.7;
        }
        .menu-item.is-open .menu-item-arrow {
            transform: rotate(90deg);
        }
        .menu-submenu {
            background: var(--ui-light-grey);
            overflow: hidden;
            max-height: 0; 
            transition: max-height 0.3s ease-out;
        }
        .menu-submenu.is-open {
            max-height: 200px;
        }
        .menu-submenu-item {
            background: none;
            border: none;
            display: block;
            width: 100%;
            color: var(--workspace-text-color, #f5f5f7);
            font-size: 14px;
            padding: 12px 18px 12px 28px;
            cursor: pointer;
            text-align: left;
        }
        .menu-submenu-item:active {
            background: var(--ui-grey);
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the menu and attaches event listeners.
 */
function createMarkup() {
    
    const chevronIcon = `... (icon unchanged) ...`;

    // --- Create Bottom Bar (unchanged) ---
    const bottomBar = document.createElement('div');
    bottomBar.id = 'bottom-bar';
    bottomBar.innerHTML = `
        <button id="bottom-bar-menu-btn" class="bottom-bar-btn">
            ${ICONS.menu}
            <span>Menu</span>
        </button>
        <button id="bottom-bar-workspace-btn" class="bottom-bar-btn">
            ${ICONS.workspace}
            <span>Workspace</span>
        </button>
        <button id="bottom-bar-add-btn" class="bottom-bar-btn">
            ${ICONS.add}
        </button>
        <button id="bottom-bar-play-btn" class="bottom-bar-btn">
            ${ICONS.play}
            <span>Play</span>
        </button>
    `;

    // --- Menu Items Container (unchanged) ---
    menuItemsContainer = document.createElement('div');
    menuItemsContainer.id = 'menu-items-container';
    menuItemsContainer.innerHTML = `... (content unchanged) ...`;

    document.body.appendChild(bottomBar);
    document.body.appendChild(menuItemsContainer);

    // --- 4. Add Event Listeners ---
    
    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    addBtn = document.getElementById('bottom-bar-add-btn');
    playBtn = document.getElementById('bottom-bar-play-btn');
    
    const toggleMenu = (event) => {
        if (event) event.stopPropagation(); 
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuBtn.classList.toggle('is-active', isOpen);
    };

    const closeMenu = () => {
        if (menuItemsContainer.classList.contains('is-open')) {
            menuItemsContainer.classList.remove('is-open');
            menuBtn.classList.remove('is-active');
        }
    };
    
    // --- NEW: Subscribe to the closeMenu event ---
    App.events.subscribe('closeMenu', closeMenu);

    menuBtn.addEventListener('click', () => {
        toggleMenu();
        // Close other panels when opening menu
        App.workspace.close();
        App.editorBar.closeAllPanels();
        if (App.addPanel) App.addPanel.close();
    });

    workspaceBtn.addEventListener('click', () => {
        const isWorkspaceOpen = document.getElementById('workspace-container')?.classList.contains('is-open');
        
        if (isWorkspaceOpen) {
            App.workspace.close();
        } else {
            App.workspace.open();
            App.editorBar.closeAllPanels();
            if (App.addPanel) App.addPanel.close();
        }
        closeMenu();
    });
    
    // --- UPDATED: Removed old listener ---
    // The listener for addBtn is now in addpanel.js
    
    playBtn.addEventListener('click', () => {
        // This will be replaced by testplay.js
        App.modal.alert("Play function not yet implemented.");
        closeMenu();
    });

    // --- (Rest of menu click/document listeners are unchanged) ---
    menuItemsContainer.addEventListener('click', (event) => {
        // ... (function logic unchanged) ...
    });

    document.addEventListener('pointerdown', (event) => {
        // ... (function logic unchanged) ...
    });
}

/**
 * --- (Debugger modal function is unchanged) ---
 */
function showDebuggerModal() {
    // ... (omitted for brevity, unchanged)
}


/**
 * Initializes the main menu UI.
 */
export function initMenu(app) {
    App = app;
    injectStyles();
    createMarkup();

    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    addBtn = document.getElementById('bottom-bar-add-btn'); // Get ref
    
    if (App.workspace) {
        const originalWorkspaceOpen = App.workspace.open;
        const originalWorkspaceClose = App.workspace.close;
        
        App.workspace.open = () => {
            originalWorkspaceOpen();
            workspaceBtn.classList.add('is-active');
        };
        App.workspace.close = () => {
            originalWorkspaceClose();
            workspaceBtn.classList.remove('is-active');
        };
    }
    
    // --- NEW: Wrapper for Add Panel ---
    // This will be populated by addpanel.js
    if (!App.addPanel) App.addPanel = {};
    const originalAddOpen = App.addPanel.open || (() => {});
    const originalAddClose = App.addPanel.close || (() => {});
    
    App.addPanel.open = () => {
        originalAddOpen();
        addBtn.classList.add('is-active');
    };
    App.addPanel.close = () => {
        originalAddClose();
        addBtn.classList.remove('is-active');
    };

    console.log('Menu UI Initialized.');
}
