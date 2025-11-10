// src/core/ui/addpanel.js

let App;
let addPanel;
let addBtn;

// Placeholder SVGs for the new items
const ICONS = {
    script: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>`,
    shape: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76zM15 15l-3-3"/></svg>`,
    animation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`,
    effect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
};

/**
 * Creates and injects the CSS styles for the add panel.
 */
function injectStyles() {
    const styleId = 'addpanel-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        /* This panel slides up from the main bottom bar */
        #add-panel {
            position: fixed;
            /* Sit right on top of the main bar */
            bottom: calc(var(--main-bar-height) + var(--ui-safe-bottom)); 
            left: 0;
            width: 100%;
            /* Make it one row high */
            height: var(--editor-bar-height); 
            background: var(--ui-dark-grey);
            border-top: 1px solid var(--ui-border);
            z-index: 10; /* Same as editor bar */
            
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 0 5px;
            box-sizing: border-box;
            
            /* Hidden by default, slides up */
            transform: translateY(100%);
            transition: transform 0.3s ease-out;
        }
        
        #add-panel.is-open {
            transform: translateY(0);
        }

        .add-panel-btn {
            background: none;
            border: none;
            color: #fff;
            opacity: 0.7;
            border-radius: 8px;
            height: 40px;
            flex-grow: 1;
            margin: 0 5px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            
            /* Icon layout */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .add-panel-btn svg {
            width: 20px;
            height: 20px;
            margin-bottom: 2px;
        }
        
        .add-panel-btn:active {
            background: var(--ui-light-grey);
        }
        
        .add-panel-btn:hover {
            opacity: 1.0;
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the add panel.
 */
function createMarkup() {
    addPanel = document.createElement('div');
    addPanel.id = 'add-panel';
    addPanel.innerHTML = `
        <button class="add-panel-btn" data-action="add-script">
            ${ICONS.script}
            <span>Script</span>
        </button>
        <button class="add-panel-btn" data-action="add-shape">
            ${ICONS.shape}
            <span>Shape</span>
        </button>
        <button class="add-panel-btn" data-action="add-animation">
            ${ICONS.animation}
            <span>Animation</span>
        </button>
        <button class="add-panel-btn" data-action="add-effect">
            ${ICONS.effect}
            <span>Effect</span>
        </button>
    `;

    document.body.appendChild(addPanel);

    // Add listeners
    addPanel.addEventListener('click', (e) => {
        const target = e.target.closest('.add-panel-btn');
        if (!target) return;

        const action = target.dataset.action;
        // Placeholder for now
        App.modal.alert(`Selected: ${action}`);
        
        // Close the panel after clicking an item
        closePanel();
    });
}

function openPanel() {
    if (addPanel) addPanel.classList.add('is-open');
    if (addBtn) addBtn.classList.add('is-active');
    
    // Close other panels
    App.workspace.close();
    App.editorBar.closeAllPanels();
}

function closePanel() {
    if (addPanel) addPanel.classList.remove('is-open');
    if (addBtn) addBtn.classList.remove('is-active');
}

function togglePanel() {
    if (addPanel.classList.contains('is-open')) {
        closePanel();
    } else {
        openPanel();
    }
}

/**
 * Initializes the Add Panel module.
 */
export function initAddPanel(app) {
    App = app;
    
    injectStyles();
    createMarkup();

    // Attach public API
    if (!App.addPanel) App.addPanel = {};
    App.addPanel.open = openPanel;
    App.addPanel.close = closePanel;
    App.addPanel.toggle = togglePanel;

    // --- Add wrapper for the add button in menu.js ---
    setTimeout(() => {
        addBtn = document.getElementById('bottom-bar-add-btn');
        if (addBtn) {
            // Replace the old alert listener
            addBtn.replaceWith(addBtn.cloneNode(true));
            // Get new reference and add the real listener
            addBtn = document.getElementById('bottom-bar-add-btn');
            addBtn.addEventListener('click', () => {
                togglePanel();
                // Close the main menu if it's open
                App.events.publish('closeMenu'); 
            });
        }
    }, 1000); // Wait for menu.js to create the button

    console.log('Add Panel Initialized.');
}
