// src/core/ui/menu.js

// --- Module-level App variable ---
let App;

// --- Module-level button variables ---
let menuBtn;
let workspaceBtn;
let addBtn;
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
    // ... (css is unchanged)
    const styleId = 'menu-ui-styles';
    if (document.getElementById(styleId)) return;
    const css = `...`;
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
    
    App.events.subscribe('closeMenu', closeMenu);

    menuBtn.addEventListener('click', () => {
        toggleMenu();
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
    
    // --- UPDATED: Add button listener ---
    addBtn.addEventListener('click', () => {
        if (App.addPanel) App.addPanel.toggle();
        closeMenu();
    });
    
    // --- UPDATED: Play button listener ---
    playBtn.addEventListener('click', () => {
        if (App.engine) App.engine.startTestMode();
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
    
    // --- UPDATED: Wrapper for Add Panel ---
    if (!App.addPanel) App.addPanel = {}; // Ensure it exists
    const originalAddOpen = App.addPanel.open || (() => {});
    const originalAddClose = App.addPanel.close || (() => {});
    
    App.addPanel.open = () => {
        originalAddOpen();
        if (addBtn) addBtn.classList.add('is-active');
    };
    App.addPanel.close = () => {
        originalAddClose();
        if (addBtn) addBtn.classList.remove('is-active');
    };

    console.log('Menu UI Initialized.');
}
