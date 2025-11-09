// src/core/ui/menu.js

// --- Module-level App variable ---
let App;

// --- Module-level button variables ---
let menuBtn;
let workspaceBtn;
let toolsBtn;
let addBtn;
let playBtn;
let menuItemsContainer;

// --- SVG Icons for the tab bar ---
const ICONS = {
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    workspace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    tools: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39 1.04c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.44h-3.84a.5.5 0 0 0-.5.44l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-1.04a.5.5 0 0 0-.61.22l-1.92 3.32a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32a.5.5 0 0 0 .61.22l2.39-1.04c.5.38 1.03-.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.44h3.84a.5.5 0 0 0 .5.44l.36 2.54c.59-.24-1.13-.57-1.62.94l2.39 1.04a.5.5 0 0 0 .61-.22l1.92 3.32a.5.5 0 0 0-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"></path></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
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
            
            --bottom-bar-height: 60px;
        }
        
        /* --- Bottom Tab Bar --- */
        #bottom-bar {
            position: fixed;
            
            /* --- UPDATED FOR ROUNDED CORNERS --- */
            bottom: 5px; /* Push up from bottom */
            left: 5px;   /* Inset from left */
            right: 5px;  /* Inset from right */
            width: auto; /* Let left/right/bottom handle positioning */
            border-radius: 8px; /* Round the bar's corners */
            box-shadow: var(--ui-shadow); /* Add shadow to floating bar */
            border-top: none; /* Remove border-top, use shadow instead */
            /* --- END UPDATE --- */

            height: calc(var(--bottom-bar-height) + var(--ui-safe-bottom));
            background: var(--ui-dark-grey); 
            z-index: 11;
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
            transition: opacity 0.2s, color 0.2s;
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
            /* --- UPDATED: Adjust to new floating bar --- */
            bottom: calc(var(--bottom-bar-height) + var(--ui-safe-bottom) + 10px); /* 5px bar gap + 5px extra */
            left: 10px; /* 5px bar gap + 5px extra */
            /* --- END UPDATE --- */
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
            transition: color 0.2s;
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
    
    const chevronIcon = `
        <svg class="menu-item-arrow" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6"></path>
        </svg>`;

    // --- Create Bottom Bar ---
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
        <button id="bottom-bar-tools-btn" class="bottom-bar-btn">
            ${ICONS.tools}
            <span>Tools</span>
        </button>
        <button id="bottom-bar-play-btn" class="bottom-bar-btn">
            ${ICONS.play}
            <span>Play</span>
        </button>
    `;

    menuItemsContainer = document.createElement('div'); // Use module-level var
    menuItemsContainer.id = 'menu-items-container';
    
    // --- (innerHTML for menuItemsContainer is unchanged) ---
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
    
    // Assign module-level buttons
    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    toolsBtn = document.getElementById('bottom-bar-tools-btn');
    addBtn = document.getElementById('bottom-bar-add-btn');
    playBtn = document.getElementById('bottom-bar-play-btn');
    
    const toggleMenu = (event) => {
        if (event) event.stopPropagation(); 
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuBtn.classList.toggle('is-active', isOpen);
        
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
            menuBtn.classList.remove('is-active');
            
            menuItemsContainer.querySelectorAll('.menu-submenu.is-open').forEach(sm => {
                sm.classList.remove('is-open');
            });
            menuItemsContainer.querySelectorAll('.menu-item.is-open').forEach(btn => {
                btn.classList.remove('is-open');
            });
        }
    };

    menuBtn.addEventListener('click', toggleMenu);

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
            // (sub-item click logic is unchanged)
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
 * --- (Function to show the debugger modal is unchanged) ---
 */
function showDebuggerModal() {
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
    
    const modalCSS = `
        <style>
            .debug-entry {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--ui-border, #555);
                font-family: monospace;
                font-size: 13px;
                white-space: pre-wrap;
                word-break: break-all;
                text-align: left;
            }
            .debug-entry span { padding-right: 15px; }
            .copy-error-btn {
                background: var(--ui-light-grey, #4a4a4c);
                border: 1px solid var(--ui-border, #555);
                color: #fff;
                padding: 4px 10px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 11px;
                flex-shrink: 0;
            }
            .copy-error-btn:active { background: var(--ui-grey, #3a3a3c); }
        </style>
    `;

    App.modal.custom({
        title: "Debugger Log",
        html: modalCSS + logHtml,
        confirmText: "Close",
        onConfirm: (modalBody) => {
            App.modal.hide();
        },
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

    // --- (This logic for wrapping panel functions is unchanged) ---
    
    menuBtn = document.getElementById('bottom-bar-menu-btn');
    workspaceBtn = document.getElementById('bottom-bar-workspace-btn');
    toolsBtn = document.getElementById('bottom-bar-tools-btn');
    
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
