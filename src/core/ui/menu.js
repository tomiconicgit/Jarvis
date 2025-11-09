// src/core/ui/menu.js

// --- Module-level App variable ---
let App;

// --- Module-level button variables ---
let menuBtn;
let workspaceBtn;
let toolsBtn;
let menuItemsContainer;

/**
 * Creates and injects the CSS styles for the new top bar and menu.
 */
function injectStyles() {
    const styleId = 'menu-ui-styles';
    if (document.getElementById(styleId)) return;
    const css = `
        :root {
            --ui-blue: #007aff;
            --ui-blue-pressed: #005ecf;
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 4px 12px rgba(0,0,0,0.15);
            --ui-corner-radius: 12px;
            --ui-safe-top: env(safe-area-inset-top);
            --ui-safe-left: env(safe-area-inset-left);
            --ui-safe-right: env(safe-area-inset-right);
            
            --top-bar-height: 44px;
        }
        
        /* --- UPDATED: Floating Top Bar --- */
        #top-bar {
            position: fixed;
            top: calc(10px + var(--ui-safe-top));
            left: calc(10px + var(--ui-safe-left));
            width: auto; /* Fit content */
            height: var(--top-bar-height);
            
            /* Glassmorphism effect */
            background: rgba(58, 58, 60, 0.8); /* Semi-transparent */
            backdrop-filter: blur(10px) saturate(180%);
            -webkit-backdrop-filter: blur(10px) saturate(180%);
            
            border: 1px solid var(--ui-border);
            border-radius: var(--ui-corner-radius);
            box-shadow: var(--ui-shadow);
            
            z-index: 11;
            display: flex;
            align-items: center;
            padding: 0 4px; /* Internal padding */
            box-sizing: border-box;
        }
        
        .top-bar-btn {
            background: none;
            border: none;
            color: #fff; /* <-- UPDATED: All buttons white */
            font-size: 15px;
            font-weight: 500;
            padding: 10px 12px;
            border-radius: 8px; /* <-- UPDATED: Rounded corners */
            cursor: pointer;
            transition: background-color 0.2s ease, color 0.2s ease;
        }
        
        .top-bar-btn:active {
            background: var(--ui-light-grey);
        }
        
        /* --- UPDATED: Active state uses background --- */
        .top-bar-btn.is-active {
            background: var(--ui-blue);
            color: #fff;
            font-weight: 600;
        }
        
        /* --- GONE: Special color for menu-btn --- */
        
        /* --- Divider --- */
        .top-bar-divider {
            width: 1px;
            height: 20px;
            background: var(--ui-border);
            opacity: 0.5;
        }
        
        /* --- UPDATED: Menu dropdown position --- */
        #menu-items-container {
            position: fixed;
            /* Position below the new floating bar */
            top: calc(var(--top-bar-height) + 15px + var(--ui-safe-top));
            left: calc(10px + var(--ui-safe-left));
            z-index: 10;
            background: var(--ui-grey);
            border-radius: var(--ui-corner-radius);
            box-shadow: var(--ui-shadow);
            clip-path: inset(0 0 100% 0);
            opacity: 0;
            transform: scale(0.95);
            transform-origin: top left;
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: none;
            overflow: hidden;
            min-width: 170px;
        }
        
        /* ... (all other menu dropdown styles are unchanged) ... */
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
            transition: color 0.2s;
        }
        
        /* --- This handles "File" turning blue when open --- */
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
    
    const chevronIcon = `
        <svg class="menu-item-arrow" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6"></path>
        </svg>`;

    const topBar = document.createElement('div');
    topBar.id = 'top-bar';
    topBar.innerHTML = `
        <button id="top-bar-menu-btn" class="top-bar-btn">Menu</button>
        <div class="top-bar-divider"></div>
        <button id="top-bar-workspace-btn" class="top-bar-btn">Workspace</button>
        <div class="top-bar-divider"></div>
        <button id="top-bar-tools-btn" class="top-bar-btn">Tools</button>
    `;

    menuItemsContainer = document.createElement('div'); // Use module-level var
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
    `;

    document.body.appendChild(topBar);
    document.body.appendChild(menuItemsContainer);

    // --- 4. Add Event Listeners ---
    
    // Assign module-level buttons
    menuBtn = document.getElementById('top-bar-menu-btn');
    workspaceBtn = document.getElementById('top-bar-workspace-btn');
    toolsBtn = document.getElementById('top-bar-tools-btn');
    
    const toggleMenu = (event) => {
        if (event) event.stopPropagation(); 
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuBtn.classList.toggle('is-active', isOpen); // Toggle active state
        
        if (!isOpen) {
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => {
                sm.classList.remove('is-open');
            });
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => {
                btn.classList.remove('is-open');
            });
        }
    };

    const closeMenu = () => {
        if (menuItemsContainer.classList.contains('is-open')) {
            menuItemsContainer.classList.remove('is-open');
            menuBtn.classList.remove('is-active'); // Deactivate on close
            
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => {
                sm.classList.remove('is-open');
            });
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => {
                btn.classList.remove('is-open');
            });
        }
    };

    menuBtn.addEventListener('click', toggleMenu);

    // --- (This logic for Workspace/Tools is unchanged from before) ---
    workspaceBtn.addEventListener('click', () => {
        const isWorkspaceOpen = document.getElementById('workspace-container')?.classList.contains('is-open');
        
        if (isWorkspaceOpen) {
            App.workspace.close();
        } else {
            App.workspace.open();
            App.tools.close();
        }
        closeMenu();
    });
    
    toolsBtn.addEventListener('click', () => {
        const isToolsOpen = document.getElementById('tools-container')?.classList.contains('is-open');
        
        if (isToolsOpen) {
            App.tools.close();
        } else {
            App.tools.open();
            App.workspace.close();
        }
        closeMenu();
    });

    // --- (This logic for menu items is unchanged) ---
    menuItemsContainer.addEventListener('click', (event) => {
        const subItem = event.target.closest('.menu-submenu-item');
        const parentItem = event.target.closest('.menu-item');

        if (subItem) {
            // (sub-item click logic is unchanged)
            if (subItem.id === 'menu-file-new') {
                if (App && App.engine && App.engine.newProject) App.engine.newProject();
                else console.error('Engine.newProject() not found.');
            } else if (subItem.id === 'menu-file-save') {
                if (App && App.engine && App.engine.saveProject) App.engine.saveProject();
                else console.error('Engine.saveProject() not found.');
            } else if (subItem.id === 'menu-file-load') {
                if (App && App.engine && App.engine.loadProject) App.engine.loadProject();
                else console.error('Engine.loadProject() not found.');
            } else if (subItem.id === 'menu-import-glb') {
                if (App && App.engine && App.engine.importModel) App.engine.importModel('glb');
                else console.error('Engine.importModel() not found.');
            } else if (subItem.id === 'menu-import-fbx') {
                 if (App && App.engine && App.engine.importModel) App.engine.importModel('fbx');
                else console.error('Engine.importModel() not found.');
            } else if (subItem.id === 'menu-import-obj') {
                 if (App && App.engine && App.engine.importModel) App.engine.importModel('obj');
                else console.error('Engine.importModel() not found.');
            } else if (subItem.id === 'menu-export-glb') {
                if (App && App.engine && App.engine.exportModel) App.engine.exportModel('glb');
                else console.error('Engine.exportModel() not found.');
            } else if (subItem.id === 'menu-export-obj') {
                 if (App && App.engine && App.engine.exportModel) App.engine.exportModel('obj');
                else console.error('Engine.exportModel() not found.');
            } else {
                console.log(`Sub-Item Clicked: ${subItem.textContent}`);
            }
            
            closeMenu();
            return;
        }

        if (parentItem) {
            // (This logic for toggling submenus is unchanged)
            const submenuId = parentItem.dataset.submenu;
            if (!submenuId) return;
            const submenu = document.getElementById(submenuId);
            if (!submenu) return;
            const isAlreadyOpen = submenu.classList.contains('is-open');
            
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => {
                sm.classList.remove('is-open');
            });
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => {
                btn.classList.remove('is-open');
            });
            
            if (!isAlreadyOpen) {
                submenu.classList.add('is-open');
                parentItem.classList.add('is-open'); // This applies the blue text
            }
        }
    });

    document.addEventListener('pointerdown', (event) => {
        const topBar = document.getElementById('top-bar');
        if (topBar && !topBar.contains(event.target) && !menuItemsContainer.contains(event.target)) {
            closeMenu();
        }
    });
}

/**
 * Initializes the main menu UI.
 */
export function initMenu(app) {
    App = app;
    injectStyles();
    createMarkup(); // This creates the buttons

    // --- (This logic is unchanged) ---
    // It finds the buttons and wraps the panel functions.
    
    menuBtn = document.getElementById('top-bar-menu-btn');
    workspaceBtn = document.getElementById('top-bar-workspace-btn');
    toolsBtn = document.getElementById('top-bar-tools-btn');
    
    if (App.workspace) {
        const originalWorkspaceOpen = App.workspace.open;
        const originalWorkspaceClose = App.workspace.close;
        
        App.workspace.open = () => {
            originalWorkspaceOpen();
            workspaceBtn.classList.add('is-active');
            toolsBtn.classList.remove('is-active');
        };
        App.workspace.close = () => {
            originalWorkspaceClose();
            workspaceBtn.classList.remove('is-active');
        };
    }
    
    if (App.tools) {
        const originalToolsOpen = App.tools.open;
        const originalToolsClose = App.tools.close;
        
        App.tools.open = () => {
            originalToolsOpen();
            toolsBtn.classList.add('is-active');
            workspaceBtn.classList.remove('is-active');
        };
        App.tools.close = () => {
            originalToolsClose();
            toolsBtn.classList.remove('is-active');
        };
    }

    console.log('Menu UI Initialized.');
}
