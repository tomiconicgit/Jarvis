// src/core/ui/menu.js
// This module initializes the main bottom bar (the "tab bar")
// and the slide-up "Menu" panel that it controls.

// --- Module-level App variable ---
let App;

// --- Module-level button variables ---
// We store references to these buttons so we can
// add/remove the '.is-active' class on them.
let menuBtn;
let workspaceBtn;
let addBtn;
let playBtn;
let menuItemsContainer; // The slide-up panel

// --- SVG Icons ---
// Storing the SVG markup in a constant keeps the HTML
// in createMarkup() cleaner and easier to read.
const ICONS = {
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    workspace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
};

/**
 * Creates and injects the CSS styles for the bottom bar and menu panel.
 */
function injectStyles() {
    const styleId = 'menu-ui-styles';
    if (document.getElementById(styleId)) return;
    
    const css = `
        /* --- CSS Variables --- */
        /* We define the core UI colors and dimensions here in :root
           so all other UI modules can reuse them. */
        :root {
            --ui-blue: #007aff; /* Apple's "active" blue */
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-dark-grey: #1c1c1c; 
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 -4px 12px rgba(0,0,0,0.15);
            
            /* 'safe-area-inset-bottom' is for the iPhone "home bar" */
            --ui-safe-bottom: env(safe-area-inset-bottom);
            
            /* Define standard heights */
            --main-bar-height: 60px;
            --editor-bar-height: 50px;
            
            /* Calculate the total height of all bars combined */
            --total-bar-height: calc(var(--main-bar-height) + var(--editor-bar-height) + var(--ui-safe-bottom));
        }
        
        /* --- Bottom Tab Bar --- */
        #bottom-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            /* The bar's height is 60px *plus* the safe area */
            height: calc(var(--main-bar-height) + var(--ui-safe-bottom));
            background: var(--ui-dark-grey); 
            border-top: 1px solid var(--ui-border);
            z-index: 11; /* Above editor bar (10) */
            display: flex;
            align-items: flex-start; /* Aligns icons to the top */
            padding-top: 5px;
            /* Padding-bottom accounts for the home bar */
            padding-bottom: var(--ui-safe-bottom);
            box-sizing: border-box;
            justify-content: space-around;
        }
        
        .bottom-bar-btn {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7; /* Faded when inactive */
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            flex-direction: column; /* Stack icon and text */
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
            background: var(--ui-light-grey); /* Click feedback */
        }
        
        .bottom-bar-btn.is-active {
            color: var(--ui-blue); /* Active color */
            opacity: 1.0;
        }
        
        /* --- Menu "Drop-Up" Panel --- */
        #menu-items-container {
            position: fixed;
            /* Positioned just above the main bar */
            bottom: calc(var(--main-bar-height) + var(--ui-safe-bottom) + 5px);
            left: 5px; /* Aligned with the 'Menu' button */
            
            /* Must be on top of *everything* else */
            z-index: 12; 
            
            background: var(--ui-grey);
            border-radius: 8px; 
            box-shadow: var(--ui-shadow);
            
            /* --- Animation: Start hidden --- */
            /* 'clip-path' is a performant way to animate visibility */
            clip-path: inset(100% 0 0 0); /* Starts fully clipped (hidden) */
            opacity: 0;
            transform: scale(0.95);
            transform-origin: bottom left;
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: none; /* Can't be clicked when hidden */
            overflow: hidden; 
            min-width: 170px;
        }
        
        /* --- Animation: Show --- */
        #menu-items-container.is-open {
            clip-path: inset(0 0 0 0); /* Un-clips to 100% visible */
            opacity: 1;
            transform: scale(1);
            pointer-events: auto; /* Becomes clickable */
        }
        
        /* --- Menu Items --- */
        .menu-item-separator {
            height: 1px;
            background: var(--ui-border);
            margin: 0 8px; /* Inset separator */
        }
        .menu-item-separator-full {
             height: 1px;
             background: var(--ui-border);
             margin: 0; /* Full-width separator */
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
            transform: rotate(90deg); /* Animate arrow */
        }
        
        /* --- Sub-menu panel --- */
        .menu-submenu {
            background: var(--ui-light-grey);
            overflow: hidden;
            max-height: 0; /* Start collapsed */
            transition: max-height 0.3s ease-out; /* Animate open/close */
        }
        .menu-submenu.is-open {
            max-height: 200px; /* Animate to this height */
        }
        .menu-submenu-item {
            background: none;
            border: none;
            display: block;
            width: 100%;
            color: var(--workspace-text-color, #f5f5f7);
            font-size: 14px;
            padding: 12px 18px 12px 28px; /* Indented */
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
    
    // A reusable chevron icon for sub-menus
    const chevronIcon = `
        <svg class="menu-item-arrow" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6"></path>
        </svg>`;

    // --- 1. Create the Bottom Bar ---
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

    // --- 2. Create the Menu Panel (hidden by default) ---
    menuItemsContainer = document.createElement('div');
    menuItemsContainer.id = 'menu-items-container';
    menuItemsContainer.innerHTML = `
        <div class="menu-item-wrapper">
            <button class="menu-item" data-submenu="file-submenu">
                <span>File</span>
                ${chevronIcon}
            </button>
            <div class="menu-submenu" id="file-submenu">
                <button class="menu-submenu-item" id="menu-file-new">New Project</button>
                <div class="menu-item-separator"></div>
                <button class="menu-submenu-item" id="menu-file-save">Save Project</button>
                <div class="menu-item-separator"></div>
                <button class="menu-submenu-item" id="menu-file-load">Load Project</button>
            </div>
        </div>
        
        <div class="menu-item-separator-full"></div>

        <div class="menu-item-wrapper">
            <button class="menu-item" data-submenu="import-submenu">
                <span>Import</span>
                ${chevronIcon}
            </button>
            <div class="menu-submenu" id="import-submenu">
                <button class="menu-submenu-item" id="menu-import-glb">GLB</button>
                <div class="menu-item-separator"></div>
                <button class="menu-submenu-item" id="menu-import-fbx">FBX</button>
                <div class="menu-item-separator"></div>
                <button class="menu-submenu-item" id="menu-import-obj">OBJ</button>
            </div>
        </div>
        
        <div class="menu-item-separator-full"></div>

        <div class="menu-item-wrapper">
            <button class="menu-item" data-submenu="export-submenu">
                <span>Export</span>
                ${chevronIcon}
            </button>
            <div class="menu-submenu" id="export-submenu">
                <button class="menu-submenu-item" id="menu-export-glb">GLB</button>
                <div class="menu-item-separator"></div>
                <button class="menu-submenu-item" id="menu-export-obj">OBJ</button>
            </div>
        </div>
        
        <div class="menu-item-separator-full"></div>
        
        <div class="menu-item-wrapper">
            <button class="menu-item" id="menu-debugger-btn">
                <span>Debugger</span>
            </button>
        </div>
    `;

    // --- 3. Add Elements to the Document ---
    document.body.appendChild(bottomBar);
    document.body.appendChild(menuItemsContainer);

    // --- 4. Get References and Add Event Listeners ---
    
    // Get refs to the 4 main tab bar buttons
    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    addBtn = document.getElementById('bottom-bar-add-btn');
    playBtn = document.getElementById('bottom-bar-play-btn');
    
    // --- Menu Button Logic ---
    const toggleMenu = (event) => {
        if (event) event.stopPropagation(); // Stop click from bubbling up
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuBtn.classList.toggle('is-active', isOpen);
    };

    const closeMenu = () => {
        if (menuItemsContainer.classList.contains('is-open')) {
            menuItemsContainer.classList.remove('is-open');
            menuBtn.classList.remove('is-active');
        }
    };
    
    // Allow other modules to close the menu (e.g., selectioncontext)
    App.events.subscribe('closeMenu', closeMenu);

    menuBtn.addEventListener('click', () => {
        toggleMenu();
        // --- UI Coordination ---
        // When the menu opens, close all other panels.
        App.workspace.close();
        App.editorBar.closeAllPanels();
        if (App.addPanel) App.addPanel.close();
    });

    // --- Workspace Button Logic ---
    workspaceBtn.addEventListener('click', () => {
        // App.workspace.toggle() doesn't exist, so we check
        // the class list ourselves.
        const isWorkspaceOpen = document.getElementById('workspace-container')?.classList.contains('is-open');
        
        if (isWorkspaceOpen) {
            App.workspace.close();
        } else {
            App.workspace.open();
            // --- UI Coordination ---
            App.editorBar.closeAllPanels();
            if (App.addPanel) App.addPanel.close();
        }
        closeMenu(); // Always close the menu panel
    });
    
    // --- Add Button Logic ---
    addBtn.addEventListener('click', () => {
        if (App.addPanel) App.addPanel.toggle();
        closeMenu(); // Always close the menu panel
    });
    
    // --- Play Button Logic ---
    playBtn.addEventListener('click', () => {
        if (App.engine) App.engine.startTestMode();
        closeMenu(); // Always close the menu panel
    });

    // --- Menu Panel Item Logic (Event Delegation) ---
    menuItemsContainer.addEventListener('click', (event) => {
        const subItem = event.target.closest('.menu-submenu-item');
        const parentItem = event.target.closest('.menu-item');
        const debuggerBtn = event.target.closest('#menu-debugger-btn');

        if (debuggerBtn) {
            // Special case for debugger
            showDebuggerModal();
            closeMenu();
            return;
        }

        // --- Handle Sub-menu Item Clicks (e.g., "New Project", "Import GLB") ---
        if (subItem) {
            // --- Call the correct App.engine function based on the button's ID ---
            if (subItem.id === 'menu-file-new') {
                if (App && App.engine && App.engine.newProject) App.engine.newProject();
            } else if (subItem.id === 'menu-file-save') {
                if (App && App.engine && App.engine.saveProject) App.engine.saveProject();
            } else if (subItem.id === 'menu-file-load') {
                if (App && App.engine && App.engine.loadProject) App.engine.loadProject();
            
            } else if (subItem.id === 'menu-import-glb') {
                if (App && App.engine && App.engine.importModel) App.engine.importModel('glb');
            } else if (subItem.id === 'menu-import-fbx') {
                 if (App && App.engine && App.engine.importModel) App.engine.importModel('fbx');
            } else if (subItem.id === 'menu-import-obj') {
                 if (App && App.engine && App.engine.importModel) App.engine.importModel('obj');
            
            } else if (subItem.id === 'menu-export-glb') {
                if (App && App.engine && App.engine.exportModel) App.engine.exportModel('glb');
            } else if (subItem.id === 'menu-export-obj') {
                 if (App && App.engine && App.engine.exportModel) App.engine.exportModel('obj');
            }
            
            closeMenu(); // Close the menu after action
            return;
        }

        // --- Handle Parent Menu Item Clicks (e.g., "File", "Import") ---
        if (parentItem) {
            const submenuId = parentItem.dataset.submenu;
            if (!submenuId) return; // Not a submenu item
            
            const submenu = document.getElementById(submenuId);
            if (!submenu) return;
            
            const isAlreadyOpen = submenu.classList.contains('is-open');
            
            // --- Accordion Logic ---
            // Close all *other* open sub-menus
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => {
                sm.classList.remove('is-open');
            });
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => {
                btn.classList.remove('is-open');
            });
            
            // If this one wasn't already open, open it.
            if (!isAlreadyOpen) {
                submenu.classList.add('is-open');
                parentItem.classList.add('is-open');
            }
            // If it *was* open, the code above already closed it.
        }
    });

    // --- Global "Click Off" Listener ---
    // Listen for clicks on the *entire document*.
    document.addEventListener('pointerdown', (event) => {
        const bottomBar = document.getElementById('bottom-bar');
        // If the click was *not* on the bottom bar and *not* on the menu panel...
        if (bottomBar && !bottomBar.contains(event.target) && !menuItemsContainer.contains(event.target)) {
            // ...close the menu.
            closeMenu();
        }
    });
}

/**
 * --- (Debugger modal function is unchanged) ---
 * This function just shows the error log from the debugger.js module.
 */
function showDebuggerModal() {
    if (!App || !App.debugger) {
        App.modal.alert('Debugger not initialized.');
        return;
    }
    const log = App.debugger.getErrorLog();
    const logHtml = log.length 
        ? log.map(entry => `<div style="border-bottom: 1px solid #444; padding: 5px; font-family: monospace; font-size: 12px; text-align: left;">${entry}</div>`).join('')
        : 'No errors logged.';
    
    App.modal.custom({
        title: "Debugger Log",
        html: `<div style="max-height: 40vh; overflow-y: auto;">${logHtml}</div>`,
        confirmText: "Close"
    });
}


/**
 * Initializes the main menu UI.
 * @param {object} app - The main App object.
 */
export function initMenu(app) {
    App = app;
    injectStyles();
    createMarkup();

    // Get references to the buttons *after* markup is created
    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    addBtn = document.getElementById('bottom-bar-add-btn');
    
    // --- Monkey-Patching for UI State ---
    // We wrap the Workspace's open/close functions to also
    // manage the 'is-active' class on our 'workspaceBtn'.
    
    if (App.workspace) {
        const originalWorkspaceOpen = App.workspace.open;
        const originalWorkspaceClose = App.workspace.close;
        
        App.workspace.open = () => {
            originalWorkspaceOpen();
            workspaceBtn.classList.add('is-active'); // Add class
        };
        App.workspace.close = () => {
            originalWorkspaceClose();
            workspaceBtn.classList.remove('is-active'); // Remove class
        };
    }
    
    // --- Do the same for the Add Panel button ---
    if (!App.addPanel) App.addPanel = {}; // Ensure it exists
    const originalAddOpen = App.addPanel.open || (() => {});
    const originalAddClose = App.addPanel.close || (() => {});
    
    App.addPanel.open = () => {
        originalAddOpen();
        if (addBtn) addBtn.classList.add('is-active'); // Add class
    };
    App.addPanel.close = () => {
        originalAddClose();
        if (addBtn) addBtn.classList.remove('is-active'); // Remove class
    };

    console.log('Menu UI Initialized.');
}
