// src/core/ui/menu.js

// --- ADD: Module-level App variable ---
let App;

/**
 * Creates and injects the CSS styles for the main menu UI.
 */
function injectStyles() {
    const styleId = 'menu-ui-styles';
    if (document.getElementById(styleId)) return;
    const css = `
        :root {
            /* Shared UI Theme */
            --ui-blue: #007aff;
            --ui-blue-pressed: #005ecf;
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 4px 12px rgba(0,0,0,0.15);
            --ui-corner-radius: 12px;
            --ui-safe-top: env(safe-area-inset-top);
            --ui-safe-left: env(safe-area-inset-left);
        }
        @keyframes button-bounce {
            0%   { transform: scale(1); }
            50%  { transform: scale(1.08); }
            100% { transform: scale(1); }
        }
        #menu-toggle-btn {
            position: fixed;
            top: calc(10px + var(--ui-safe-top));
            left: calc(10px + var(--ui-safe-left));
            z-index: 11;
            background: var(--ui-blue);
            color: #fff;
            font-size: 15px;
            font-weight: 600;
            padding: 10px 16px;
            border: none;
            border-radius: var(--ui-corner-radius);
            box-shadow: var(--ui-shadow);
            cursor: pointer;
            transition: background-color 0.2s ease, transform 0.1s ease;
        }
        #menu-toggle-btn.is-bouncing {
            animation: button-bounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #menu-toggle-btn:active {
            background: var(--ui-blue-pressed);
            transform: scale(0.96);
        }
        #menu-items-container {
            position: fixed;
            top: calc(64px + var(--ui-safe-top));
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

    const menuToggleBtn = document.createElement('button');
    menuToggleBtn.id = 'menu-toggle-btn';
    menuToggleBtn.setAttribute('aria-label', 'Open Menu');
    menuToggleBtn.textContent = 'Menu';
    
    const menuItemsContainer = document.createElement('div');
    menuItemsContainer.id = 'menu-items-container';
    
    // --- UPDATED: Removed FBX Export ---
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

    document.body.appendChild(menuToggleBtn);
    document.body.appendChild(menuItemsContainer);

    // --- 4. Add Event Listeners ---
    
    const toggleMenu = (event) => {
        if (event) event.stopPropagation(); 
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuToggleBtn.classList.toggle('is-open', isOpen);
        menuToggleBtn.setAttribute('aria-expanded', isOpen);
        if (isOpen) {
            menuToggleBtn.classList.add('is-bouncing');
            setTimeout(() => {
                menuToggleBtn.classList.remove('is-bouncing');
            }, 300);
        } else {
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
            menuToggleBtn.classList.remove('is-open');
            menuToggleBtn.setAttribute('aria-expanded', 'false');
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => {
                sm.classList.remove('is-open');
            });
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => {
                btn.classList.remove('is-open');
            });
        }
    };

    menuToggleBtn.addEventListener('click', toggleMenu);

    menuItemsContainer.addEventListener('click', (event) => {
        const subItem = event.target.closest('.menu-submenu-item');
        const parentItem = event.target.closest('.menu-item');

        // Clicked on a final action item
        if (subItem) {
            
            // --- UPDATED: Removed menu-export-fbx logic ---
            
            // File Actions
            if (subItem.id === 'menu-file-new') {
                if (App && App.engine && App.engine.newProject) App.engine.newProject();
                else console.error('Engine.newProject() not found.');
            } else if (subItem.id === 'menu-file-save') {
                if (App && App.engine && App.engine.saveProject) App.engine.saveProject();
                else console.error('Engine.saveProject() not found.');
            } else if (subItem.id === 'menu-file-load') {
                if (App && App.engine && App.engine.loadProject) App.engine.loadProject();
                else console.error('Engine.loadProject() not found.');
            
            // Import Actions
            } else if (subItem.id === 'menu-import-glb') {
                if (App && App.engine && App.engine.importModel) App.engine.importModel('glb');
                else console.error('Engine.importModel() not found.');
            } else if (subItem.id === 'menu-import-fbx') {
                 if (App && App.engine && App.engine.importModel) App.engine.importModel('fbx');
                else console.error('Engine.importModel() not found.');
            } else if (subItem.id === 'menu-import-obj') {
                 if (App && App.engine && App.engine.importModel) App.engine.importModel('obj');
                else console.error('Engine.importModel() not found.');
            
            // --- Export handlers ---
            } else if (subItem.id === 'menu-export-glb') {
                if (App && App.engine && App.engine.exportModel) App.engine.exportModel('glb');
                else console.error('Engine.exportModel() not found.');
            } else if (subItem.id === 'menu-export-obj') {
                 if (App && App.engine && App.engine.exportModel) App.engine.exportModel('obj');
                else console.error('Engine.exportModel() not found.');
            
            } else {
                console.log(`Sub-Item Clicked: ${subItem.textContent}`);
            }
            
            closeMenu(); // Close the whole menu
            return;
        }

        // Clicked on a parent item (e.g., "File")
        if (parentItem) {
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
                parentItem.classList.add('is-open');
            }
        }
    });

    document.addEventListener('pointerdown', (event) => {
        if (!menuToggleBtn.contains(event.target) && !menuItemsContainer.contains(event.target)) {
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
    createMarkup();
    console.log('Menu UI Initialized.');
}
