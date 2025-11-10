// src/core/ui/menu.js

// --- Module-level App variable ---
let App;

// --- Module-level button variables ---
let menuBtn;
let workspaceBtn;
let addBtn;
let playBtn;
// --- GONE: toolsBtn removed ---
let menuItemsContainer;

// --- SVG Icons for the tab bar ---
const ICONS = {
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    workspace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    // --- GONE: tools icon removed ---
};

/**
 * Creates and injects the CSS styles for the new bottom bar and menu.
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
            
            --main-bar-height: 60px; /* --- RENAMED --- */
            --editor-bar-height: 50px; /* --- ADDED --- */
            --total-bar-height: calc(var(--main-bar-height) + var(--editor-bar-height) + var(--ui-safe-bottom));
        }
        
        /* --- Bottom Tab Bar --- */
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
        
        /* --- Menu "Drop-Up" Container --- */
        #menu-items-container {
            position: fixed;
            /* --- UPDATED: Position above main bar --- */
            bottom: calc(var(--main-bar-height) + var(--ui-safe-bottom) + 5px);
            left: 5px;
            z-index: 10;
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
        /* ... (rest of menu styles are unchanged) ... */
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

    // --- Create Bottom Bar ---
    const bottomBar = document.createElement('div');
    bottomBar.id = 'bottom-bar';
    // --- GONE: Tools button removed ---
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

    document.body.appendChild(bottomBar);
    document.body.appendChild(menuItemsContainer);

    // --- 4. Add Event Listeners ---
    
    // --- GONE: toolsBtn removed ---
    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    addBtn = document.getElementById('bottom-bar-add-btn');
    playBtn = document.getElementById('bottom-bar-play-btn');
    
    const toggleMenu = (event) => {
        if (event) event.stopPropagation(); 
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuBtn.classList.toggle('is-active', isOpen);
        
        if (!isOpen) {
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => sm.classList.remove('is-open'));
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => btn.classList.remove('is-open'));
        }
    };

    const closeMenu = () => {
        if (menuItemsContainer.classList.contains('is-open')) {
            menuItemsContainer.classList.remove('is-open');
            menuBtn.classList.remove('is-active');
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => sm.classList.remove('is-open'));
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => btn.classList.remove('is-open'));
        }
    };

    menuBtn.addEventListener('click', toggleMenu);

    workspaceBtn.addEventListener('click', () => {
        const isWorkspaceOpen = document.getElementById('workspace-container')?.classList.contains('is-open');
        
        if (isWorkspaceOpen) {
            App.workspace.close();
        } else {
            App.workspace.open();
            App.editorBar.closeAllPanels(); // --- ADDED: Close editor panels
        }
        closeMenu();
    });
    
    // --- GONE: toolsBtn listener removed ---

    addBtn.addEventListener('click', () => {
        App.modal.alert("Add function not yet implemented.");
        closeMenu();
    });
    playBtn.addEventListener('click', () => {
        App.modal.alert("Play function not yet implemented.");
        closeMenu();
    });

    menuItemsContainer.addEventListener('click', (event) => {
        const subItem = event.target.closest('.menu-submenu-item');
        const parentItem = event.target.closest('.menu-item');
        const debuggerBtn = event.target.closest('#menu-debugger-btn');

        if (debuggerBtn) {
            showDebuggerModal();
            closeMenu();
            return;
        }

        if (subItem) {
            // ... (sub-item click logic is unchanged) ...
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
            
            closeMenu();
            return;
        }

        if (parentItem) {
            // ... (parent-item click logic is unchanged) ...
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
        const bottomBar = document.getElementById('bottom-bar');
        if (bottomBar && !bottomBar.contains(event.target) && !menuItemsContainer.contains(event.target)) {
            closeMenu();
        }
    });
}

/**
 * --- (Debugger modal function is unchanged) ---
 */
function showDebuggerModal() {
    // ... (function content is unchanged) ...
    if (!App || !App.debugger || !App.modal) {
        console.error('Debugger or Modal service not available.');
        return;
    }
    const errorLog = App.debugger.getErrorLog();
    let logHtml = '';
    if (errorLog.length === 0) {
        logHtml = `<div style="text-align: center; opacity: 0.7;">No errors recorded.</div>`;
    } else {
        logHtml = errorLog.slice().reverse().map((entry, index) => `
            <div class="debug-entry">
                <span>[${errorLog.length - index}] ${entry}</span>
                <button class="copy-error-btn" data-error-text="${CSS.escape(entry)}">Copy</button>
            </div>
        `).join('');
    }
    const modalCSS = `... (css is unchanged) ...`;
    App.modal.custom({
        title: "Debugger Log",
        html: modalCSS + logHtml,
        confirmText: "Close",
        onConfirm: (modalBody) => { App.modal.hide(); },
        onCancel: null
    });
    document.querySelectorAll('.copy-error-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const textToCopy = e.target.dataset.errorText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                e.target.textContent = 'Copied!';
                setTimeout(() => { e.target.textContent = 'Copy'; }, 2000);
            }).catch(err => {
                console.warn('Failed to copy error to clipboard:', err);
            });
        });
    });
}


/**
 * Initializes the main menu UI.
 */
export function initMenu(app) {
    App = app;
    injectStyles();
    createMarkup();

    // --- UPDATED: Wrapper logic ---
    
    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    // --- GONE: toolsBtn wrapper removed ---
    
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
    
    // --- GONE: App.tools wrapper removed ---

    console.log('Menu UI Initialized.');
}
