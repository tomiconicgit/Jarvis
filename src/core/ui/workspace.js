// src/core/ui/workspace.js

// --- 1. App VARIABLE ---
let App;

// --- 2. Module-level elements ---
let workspaceContainer;
// --- GONE: let workspaceOpenBtn; ---

// --- ICONS and getIconSVG (unchanged) ---
const ICONS = {
    mesh: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 6.5-10 6.5-10-6.5L12 2zM2 15l10 6.5L22 15M2 8.5l10 6.5L22 8.5"></path></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    arrow: `<svg class="folder-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>`,
    light: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    sky: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`
};

export function getIconSVG(iconName) {
    return ICONS[iconName] || '';
}

function injectStyles() {
    const styleId = 'workspace-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        :root {
            /* ... (theme variables unchanged) ... */
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
            
            /* --- UPDATED: Start hidden by default --- */
            transform: translateX(-100%);
            transition: var(--workspace-transition);
            will-change: transform;
        }

        /* --- NEW: Open state --- */
        #workspace-container.is-open {
            transform: translateX(0);
        }
        
        /* --- GONE: .is-hidden state removed --- */

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
        
        /* ... (folder/file styles are unchanged) ... */
        .ws-folder-header {
            display: flex;
            align-items: center;
            padding: 10px 8px;
            cursor: pointer;
        }
        .ws-folder-header:active {
             background: var(--ui-light-grey);
        }
        .ws-folder-header.is-selected {
            background: var(--ui-blue);
            color: #fff;
        }
        .ws-folder-header .folder-arrow {
            width: 16px;
            height: 16px;
            stroke: #fff;
            opacity: 0.7;
            margin-right: 6px;
            transition: transform 0.2s ease;
            padding: 4px;
            margin-left: -4px;
        }
        .ws-folder-header .folder-icon {
            width: 20px;
            height: 20px;
            stroke: #fff;
            margin-right: 8px;
            opacity: 0.8;
            pointer-events: none;
        }
        .ws-folder-name {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            pointer-events: none;
        }
        .ws-folder-items {
            overflow: hidden;
            max-height: 500px;
            transition: max-height 0.3s ease-out;
            padding-left: 12px;
        }
        .ws-folder.is-closed .ws-folder-items {
            max-height: 0;
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

        /* --- GONE: All styles for #workspace-open-btn removed --- */
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

// --- NEW: Moved functions to module scope ---
function closeWorkspace() {
    if (workspaceContainer) {
        workspaceContainer.classList.remove('is-open');
    }
    // --- GONE: openBtn logic ---
}

function openWorkspace() {
    if (workspaceContainer) {
        workspaceContainer.classList.add('is-open');
    }
    // --- GONE: openBtn logic ---
}

function createMarkup() {
    // 'X' icon for close
    const closeIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
    
    // --- GONE: openIcon ---

    // 1. Main Container
    workspaceContainer = document.createElement('div'); // <-- Use module-level var
    workspaceContainer.id = 'workspace-container';
    workspaceContainer.innerHTML = `
        <div class="workspace-header">
            <button class="workspace-close-btn" aria-label="Close Workspace">
                ${closeIcon}
            </button>
            <h2 class="workspace-title">Workspace</h2>
        </div>
        <div class="workspace-content">
            </div>
    `;

    // 2. --- GONE: Open Button ---

    // 3. Append to body
    document.body.appendChild(workspaceContainer);

    // --- Add Event Listeners ---
    const closeBtn = workspaceContainer.querySelector('.workspace-close-btn');
    
    // --- Listeners now call module-scope functions ---
    closeBtn.addEventListener('click', closeWorkspace);
    
    // --- GONE: openBtn listener ---
}

/**
 * Renders the dynamic content of the workspace.
 */
export function renderWorkspaceUI() {
    // ... (This function is unchanged) ...
    const content = document.querySelector('.workspace-content');
    if (!content) return;

    if (!App || !App.fileManager) {
        console.error('Workspace: App.fileManager not ready for render.');
        return;
    }
    const folders = App.fileManager.getFolders();

    content.innerHTML = ''; // Clear old content

    for (const folder of folders) {
        const folderDiv = document.createElement('div');
        folderDiv.className = `ws-folder ${folder.isOpen ? '' : 'is-closed'}`;
        
        const header = document.createElement('div');
        header.className = 'ws-folder-header';
        header.innerHTML = `
            ${ICONS.arrow}
            <span class="folder-icon">${ICONS.folder}</span>
            <span class="ws-folder-name">${folder.name}</span>
        `;
        
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'ws-folder-items';
        
        for (const item of folder.items) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ws-file-item';
            itemDiv.dataset.id = item.id;
            itemDiv.dataset.name = item.name;
            itemDiv.innerHTML = `
                <span class="file-icon">${getIconSVG(item.icon)}</span> <span>${item.name}</span>
            `;
            
            itemDiv.addEventListener('click', () => {
                if (!App || !App.selectionContext) {
                    console.warn('SelectionContext not available on App');
                    return;
                }
                
                const objectName = itemDiv.dataset.name;
                const objectInScene = App.scene.getObjectByName(objectName);
                
                if (objectInScene) {
                    App.selectionContext.select(objectInScene);
                    
                    document.querySelectorAll('.ws-file-item.is-selected').forEach(el => {
                        el.classList.remove('is-selected');
                    });
                    document.querySelectorAll('.ws-folder-header.is-selected').forEach(el => {
                        el.classList.remove('is-selected');
                    });
                    
                    itemDiv.classList.add('is-selected');
                    
                } else {
                    console.warn(`Could not find object in scene named: "${objectName}"`);
                    App.selectionContext.clear();
                }
            });
            
            itemsDiv.appendChild(itemDiv);
        }
        
        folderDiv.appendChild(header);
        folderDiv.appendChild(itemsDiv);
        content.appendChild(folderDiv);
        
        header.addEventListener('click', (event) => {
            const folderArrow = event.target.closest('.folder-arrow');

            if (folderArrow) {
                folderDiv.classList.toggle('is-closed');
            } else {
                if (!App || !App.selectionContext) {
                    console.warn('SelectionContext not available on App');
                    return;
                }
                
                const objectName = folder.name;
                const objectInScene = App.scene.getObjectByName(objectName);
                
                if (objectInScene) {
                    App.selectionContext.select(objectInScene);
                    
                    document.querySelectorAll('.ws-file-item.is-selected').forEach(el => {
                        el.classList.remove('is-selected');
                    });
                    document.querySelectorAll('.ws-folder-header.is-selected').forEach(el => {
                        el.classList.remove('is-selected');
                    });
                    
                    header.classList.add('is-selected');
                    
                } else {
                    console.warn(`Could not find object in scene named: "${objectName}"`);
                    App.selectionContext.clear();
                }
            }
        });
    }
}


/**
 * Initializes the workspace UI shell.
 */
export function initWorkspace(app) {
    App = app;
    
    // --- UPDATED: Attach public API to the App object ---
    if (!App.workspace) App.workspace = {};
    App.workspace.render = renderWorkspaceUI;
    App.workspace.open = openWorkspace;   // <-- NEW
    App.workspace.close = closeWorkspace; // <-- NEW
    
    injectStyles();
    createMarkup();
    console.log('Workspace UI Initialized.');
}
