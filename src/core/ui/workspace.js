// src/core/ui/workspace.js

// --- 1. ADD A MODULE-LEVEL App VARIABLE ---
let App;

// --- We now provide icons as SVGs for the file manager ---
const ICONS = {
    mesh: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 6.5-10 6.5-10-6.5L12 2zM2 15l10 6.5L22 15M2 8.5l10 6.5L22 8.5"></path></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    arrow: `<svg class="folder-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>`
};

/**
 * Public function to get an icon's SVG markup.
 * @param {string} iconName - The name of the icon (e.g., 'mesh')
 * @returns {string} The SVG string.
 */
export function getIconSVG(iconName) {
    return ICONS[iconName] || '';
}


/**
 * Creates and injects the CSS styles for the workspace UI.
 */
function injectStyles() {
    const styleId = 'workspace-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        :root {
            /* ... (omitting all the existing theme variables for brevity) ... */
            --ui-blue: #007aff;
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 4px 12px rgba(0,0,0,0.15);
            --ui-corner-radius: 12px;
            --workspace-transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            --status-bar-height: calc(40px + env(safe-area-inset-bottom));
        }

        #workspace-container {
            position: fixed;
            bottom: var(--status-bar-height);
            left: 0;
            width: 100%;
            height: 45vh;
            background: transparent;
            border-top: none;
            z-index: 5;
            display: flex;
            flex-direction: column;
            transform: translateX(0);
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #workspace-container.is-hidden {
            transform: translateX(-100%);
        }

        .workspace-header {
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

        .workspace-title {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin: 0;
            padding: 0;
        }

        .workspace-close-btn {
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: -12px;
            margin-right: 8px;
        }
        
        .workspace-close-btn svg {
            width: 20px;
            height: 20px;
            stroke: #fff;
            stroke-width: 2;
        }

        .workspace-content {
            flex-grow: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            background: var(--ui-grey);
            color: var(--workspace-text-color, #f5f5f7);
            padding: 8px;
        }
        
        /* --- NEW STYLES FOR FOLDERS/FILES --- */
        
        .ws-folder-header {
            display: flex;
            align-items: center;
            padding: 10px 8px;
            cursor: pointer;
        }
        .ws-folder-header:active {
             background: var(--ui-light-grey);
        }
        
        .ws-folder-header .folder-arrow {
            width: 16px;
            height: 16px;
            stroke: #fff;
            opacity: 0.7;
            margin-right: 6px;
            transition: transform 0.2s ease;
        }
        
        .ws-folder-header .folder-icon {
            width: 20px;
            height: 20px;
            stroke: #fff;
            margin-right: 8px;
            opacity: 0.8;
        }

        .ws-folder-name {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
        }
        
        /* Folder open/closed states */
        .ws-folder-items {
            overflow: hidden;
            max-height: 500px; /* Animate to */
            transition: max-height 0.3s ease-out;
            padding-left: 12px;
        }
        .ws-folder.is-closed .ws-folder-items {
            max-height: 0; /* Animate from */
        }
        .ws-folder.is-closed .folder-arrow {
            transform: rotate(-90deg);
        }

        .ws-file-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            color: var(--workspace-text-color, #f5f5f7);
            font-size: 14px;
            border-bottom: 1px solid var(--ui-border);
            cursor: pointer;
        }
        .ws-file-item:last-child {
            border-bottom: none;
        }
        .ws-file-item:active {
            background: var(--ui-light-grey);
        }
        
        .ws-file-item.is-selected {
            background: var(--ui-blue);
            color: #fff;
        }
        
        .ws-file-item .file-icon {
            width: 18px;
            height: 18px;
            stroke: #fff;
            margin-right: 10px;
            opacity: 0.7;
        }

        /* --- STYLES FOR OPEN BUTTON --- */
        #workspace-open-btn {
            position: fixed;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            background: var(--ui-blue);
            border: none;
            box-shadow: var(--ui-shadow);
            width: 44px;
            height: 60px;
            border-radius: 0 var(--ui-corner-radius) var(--ui-corner-radius) 0;
            display: grid;
            place-items: center;
            cursor: pointer;
            z-index: 4;
            transform: translateX(-100%) translateY(-50%);
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #workspace-open-btn.is-visible {
            transform: translateX(0) translateY(-50%);
        }
        
        #workspace-open-btn:active {
            background: var(--ui-blue-pressed);
        }
        
        #workspace-open-btn svg {
             width: 24px;
             height: 24px;
             stroke: #fff;
             stroke-width: 2;
             transform: translateX(2px);
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the workspace shell.
 * The content area is now empty.
 */
function createMarkup() {
    // 'X' icon for close
    const closeIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
    
    // "Three Lines" (Hamburger) Icon
    const openIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12" stroke-linecap="round"/><line x1="3" y1="6" x2="21" y2="6" stroke-linecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke-linecap="round"/></svg>`;

    // 1. Main Container
    const container = document.createElement('div');
    container.id = 'workspace-container';
    container.innerHTML = `
        <div class="workspace-header">
            <button class="workspace-close-btn" aria-label="Close Workspace">
                ${closeIcon}
            </button>
            <h2 class="workspace-title">Workspace</h2>
        </div>
        <div class="workspace-content">
            </div>
    `;

    // 2. Open Button
    const openBtn = document.createElement('button');
    openBtn.id = 'workspace-open-btn';
    openBtn.setAttribute('aria-label', 'Open Workspace');
    openBtn.innerHTML = openIcon;

    // 3. Append to body
    document.body.appendChild(container);
    document.body.appendChild(openBtn);

    // --- Add Event Listeners ---
    const closeBtn = container.querySelector('.workspace-close-btn');

    const closeWorkspace = () => {
        container.classList.add('is-hidden');
        openBtn.classList.add('is-visible');
    };

    const openWorkspace = () => {
        container.classList.remove('is-hidden');
        openBtn.classList.remove('is-visible');
    };

    closeBtn.addEventListener('click', closeWorkspace);
    openBtn.addEventListener('click', openWorkspace);
}

/**
 * NEW: Renders the dynamic content of the workspace.
 * This is called by the file manager.
 * @param {Array} folders - The array of folder objects from the file manager.
 */
export function renderWorkspaceUI(folders) {
    const content = document.querySelector('.workspace-content');
    if (!content) return;

    content.innerHTML = ''; // Clear old content

    // Build the new HTML
    for (const folder of folders) {
        // 1. Create Folder Wrapper
        const folderDiv = document.createElement('div');
        folderDiv.className = `ws-folder ${folder.isOpen ? '' : 'is-closed'}`;
        
        // 2. Create Folder Header
        const header = document.createElement('div');
        header.className = 'ws-folder-header';
        header.innerHTML = `
            ${ICONS.arrow}
            <span class="folder-icon">${ICONS.folder}</span>
            <span class="ws-folder-name">${folder.name}</span>
        `;
        
        // 3. Create Items Container
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'ws-folder-items';
        
        // 4. Create File Items
        for (const item of folder.items) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ws-file-item';
            itemDiv.dataset.id = item.id;
            itemDiv.dataset.name = item.name; // Store name
            itemDiv.innerHTML = `
                <span class="file-icon">${item.icon}</span>
                <span>${item.name}</span>
            `;
            
            // Add click listener to select object
            itemDiv.addEventListener('click', () => {
                if (!App || !App.selectionContext) {
                    console.warn('SelectionContext not available on App');
                    return;
                }
                
                // Find the 3D object in the scene by its name
                const objectName = itemDiv.dataset.name;
                const objectInScene = App.scene.getObjectByName(objectName);
                
                if (objectInScene) {
                    App.selectionContext.select(objectInScene);
                    
                    // (Optional) Highlight the selected item in the UI
                    document.querySelectorAll('.ws-file-item.is-selected').forEach(el => {
                        el.classList.remove('is-selected');
                    }); // <-- *** FIX #1 WAS HERE ***
                    itemDiv.classList.add('is-selected');
                    
                } else {
                    console.warn(`Could not find object in scene named: "${objectName}"`);
                    App.selectionContext.clear();
                }
            });
            
            itemsDiv.appendChild(itemDiv);
        }
        
        // 5. Assemble
        folderDiv.appendChild(header);
        folderDiv.appendChild(itemsDiv);
        content.appendChild(folderDiv);
        
        // 6. Add click listener for toggle
        header.addEventListener('click', () => {
            folderDiv.classList.toggle('is-closed');
        });
    }
}


/**
 * Initializes the workspace UI shell.
 */
export function initWorkspace(app) { // <-- Make sure 'app' is passed in
    App = app; // <-- Make sure this line is here
    
    injectStyles();
    createMarkup();
    console.log('Workspace UI Initialized.'); // <-- *** FIX #2 WAS HERE ***
}
