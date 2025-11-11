// src/core/ui/workspace.js
// This module creates the slide-out "Workspace" panel.
// This panel displays a hierarchical "file tree" of all the
// manageable assets in the scene (lights, meshes, imported models, scripts).
// It reads its data directly from the 'App.fileManager' module.

// --- 1. App VARIABLE ---
let App; // Module-level reference to the main App object

// --- 2. Module-level elements ---
let workspaceContainer; // The main HTML element for the slide-out panel

// --- ICONS ---
// An object to store all the SVG icon markup.
// This keeps the HTML generation logic clean.
const ICONS = {
    mesh: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 6.5-10 6.5-10-6.5L12 2zM2 15l10 6.5L22 15M2 8.5l10 6.5L22 8.5"></path></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    arrow: `<svg class="folder-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>`,
    light: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    sky: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`,
    player: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    // --- NEW ---
    script: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>`
};

/**
 * A helper function to get the correct SVG markup for an icon name.
 * @param {string} iconName - The name of the icon (e.g., 'mesh', 'light').
 * @returns {string} The SVG string, or a fallback 'mesh' icon.
 */
export function getIconSVG(iconName) {
    return ICONS[iconName] || ICONS.mesh;
}

/**
 * Creates and injects the CSS styles for the workspace panel.
 */
function injectStyles() {
    const styleId = 'workspace-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    // We use CSS variables (e.g., --total-bar-height) defined in 'menu.js'
    const css = `
        /* NOTE: This :root block is a duplicate from menu.js and tools.js.
           It should be defined in one place, like a 'global.css' or in 'menu.js'.
        */
        :root {
            /* ... (variables) ... */
            --total-bar-height: calc(110px + env(safe-area-inset-bottom));
        }

        #workspace-container {
            position: fixed;
            /* Positioned directly above all the bottom bars */
            bottom: var(--total-bar-height); 
            left: 0;
            width: 100%; /* Full screen width */
            height: 40vh; /* 40% of the viewport height */
            background: transparent;
            
            /* Highest z-index for panels so it slides *over* the editor bar */
            z-index: 12; 
            
            display: flex;
            flex-direction: column;
            
            /* --- Animation: Start hidden --- */
            /* Starts 100% to the *left* (off-screen) */
            transform: translateX(-100%);
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #workspace-container.is-open {
            /* --- Animation: Show --- */
            /* Slides in to its final position */
            transform: translateX(0);
        }

        .workspace-header {
            display: flex;
            align-items: center;
            padding: 0 16px;
            height: 48px;
            flex-shrink: 0;
            background: var(--ui-blue); /* Blue header */
            color: #fff;
        }

        .workspace-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            padding: 0;
        }

        /* The 'X' close button */
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

        /* The scrollable content area */
        .workspace-content {
            flex-grow: 1; /* Take all remaining vertical space */
            overflow-y: auto;
            -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
            background: var(--ui-dark-grey);
            color: #f5f5f7;
        }
        
        /* --- STYLES FOR FOLDERS/FILES --- */
        
        .ws-folder-header {
            display: flex;
            align-items: center;
            padding: 12px 10px;
            cursor: pointer;
            border-bottom: 1px solid var(--ui-border);
        }
        .ws-folder-header:active {
             background: var(--ui-light-grey); /* Click feedback */
        }
        
        .ws-folder-header.is-selected {
            background: var(--ui-blue); /* Highlight when selected */
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
            transform: rotate(90deg); /* Pointing down (open) by default */
        }
        
        .ws-folder-header .folder-icon {
            width: 20px;
            height: 20px;
            stroke: #fff;
            margin-right: 8px;
            opacity: 0.8;
            pointer-events: none; /* Click passes through */
        }

        .ws-folder-name {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            pointer-events: none; /* Click passes through */
        }
        
        /* The container for all the files in a folder */
        .ws-folder-items {
            overflow: hidden;
            max-height: 500px; /* An arbitrary large height */
            transition: max-height 0.3s ease-out; /* Animate open/close */
        }
        .ws-folder.is-closed .ws-folder-items {
            max-height: 0; /* Animate to 0 height when closed */
        }
        .ws-folder.is-closed .folder-arrow {
            transform: rotate(0deg); /* Pointing right (closed) */
        }

        /* A single file item */
        .ws-file-item {
            display: flex;
            align-items: center;
            font-size: 14px;
            border-bottom: 1px solid var(--ui-border);
            cursor: pointer;
            background: var(--ui-grey); /* Slightly lighter than the main bg */
            color: #f5f5f7;
            padding: 12px 16px 12px 28px; /* Indented from the folder */
        }
        .ws-file-item[data-depth="1"] {
            font-size: 13px;
            opacity: 0.9;
        }
        .ws-file-item[data-depth="1"] .file-icon {
            opacity: 0.9;
        }
        .ws-file-item:active {
            background: var(--ui-light-grey);
        }
        
        .ws-file-item.is-selected {
            background: var(--ui-blue); /* Highlight when selected */
            color: #fff;
        }
        
        .ws-file-item .file-icon {
            width: 18px;
            height: 18px;
            stroke: #fff;
            margin-right: 10px;
            opacity: 0.7;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * PUBLIC: Closes (hides) the workspace panel.
 */
function closeWorkspace() {
    if (workspaceContainer) {
        workspaceContainer.classList.remove('is-open');
    }
}

/**
 * PUBLIC: Opens (shows) the workspace panel.
 */
function openWorkspace() {
    if (workspaceContainer) {
        workspaceContainer.classList.add('is-open');
    }
}

/**
 * (Private) Creates the HTML markup for the panel shell.
 */
function createMarkup() {
    // SVG for the 'X' close button
    const closeIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;

    // 1. Create the main container
    workspaceContainer = document.createElement('div');
    workspaceContainer.id = 'workspace-container';
    
    // 2. Set its inner HTML (header + empty content area)
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

    // 3. Add to the document
    document.body.appendChild(workspaceContainer);

    // 4. Add listener for the close button
    const closeBtn = workspaceContainer.querySelector('.workspace-close-btn');
    closeBtn.addEventListener('click', closeWorkspace);
}

/**
 * PUBLIC: Re-renders the *content* of the workspace panel.
 * This is the main function that reads from App.fileManager
 * and builds the folder/file list HTML.
 */
function renderWorkspaceUI() {
    const content = document.querySelector('.workspace-content');
    if (!content) return; // Exit if the content div isn't found

    // 1. Get the data from the file manager
    if (!App || !App.fileManager) {
        console.error('Workspace: App.fileManager not ready for render.');
        return;
    }
    const folders = App.fileManager.getFolders();

    // 2. Clear all existing content
    content.innerHTML = '';

    // 3. Loop over each folder from the file manager
    for (const folder of folders) {
        // 3a. Create the folder <div>
        const folderDiv = document.createElement('div');
        folderDiv.className = `ws-folder ${folder.isOpen ? '' : 'is-closed'}`;
        
        // 3b. Create the folder header <button>
        const header = document.createElement('div');
        header.className = 'ws-folder-header';
        header.innerHTML = `
            ${ICONS.arrow}
            <span class="folder-icon">${ICONS.folder}</span>
            <span class="ws-folder-name">${folder.name}</span>
        `;
        
        // 3c. Create the <div> to hold the items
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'ws-folder-items';
        
        renderFolderItems(folder.items, itemsDiv);

        // 3e. Assemble the folder
        folderDiv.appendChild(header);
        folderDiv.appendChild(itemsDiv);
        content.appendChild(folderDiv);
        
        // --- Add click listener for the *folder header* ---
        header.addEventListener('click', (event) => {
            const folderArrow = event.target.closest('.folder-arrow');

            // Case 1: User clicked the little arrow
            if (folderArrow) {
                // Toggle the folder open/closed
                folderDiv.classList.toggle('is-closed');
            } else {
            // Case 2: User clicked anywhere else on the header
                if (!App || !App.selectionContext) {
                    console.warn('SelectionContext not available on App');
                    return;
                }
                
                // Find the 3D object *by name* (e.g., the Group)
                const objectName = folder.name;
                const objectInScene = App.scene.getObjectByName(objectName);
                
                if (objectInScene) {
                    // Select the object (e.g., the whole imported model Group)
                    App.selectionContext.select(objectInScene);
                    
                    // --- Update UI selection state ---
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

function renderFolderItems(items, container, depth = 0) {
    for (const item of items) {
        if (depth === 0 && item.parentItemId) {
            // Skip nested items at the top level; they'll render with their parent.
            continue;
        }

        const itemDiv = createFileItemElement(item, depth);
        container.appendChild(itemDiv);

        if (item.children && item.children.length) {
            renderFolderItems(item.children, container, depth + 1);
        }
    }
}

function createFileItemElement(item, depth) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'ws-file-item';
    itemDiv.dataset.id = item.id;
    itemDiv.dataset.name = item.name;
    itemDiv.dataset.depth = depth;
    itemDiv.innerHTML = `
        <span class="file-icon">${getIconSVG(item.icon)}</span> <span>${item.name}</span>
    `;

    if (depth > 0) {
        itemDiv.style.paddingLeft = `${28 + depth * 20}px`;
    }

    itemDiv.addEventListener('click', () => {
        if (item.icon === 'script') {
            App.modal.alert(`Script selected: ${item.name}. (Editor not implemented)`);
            return;
        }

        if (!App || !App.selectionContext) {
            console.warn('SelectionContext not available on App');
            return;
        }

        const objectInScene = App.scene.getObjectByProperty('uuid', item.id);

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
            console.warn(`Could not find object in scene with uuid: "${item.id}"`);
            App.selectionContext.clear();
        }
    });

    return itemDiv;
}

/**
 * Initializes the Workspace UI module.
 * @param {object} app - The main App object.
 */
export function initWorkspace(app) {
    App = app;
    
    // Create the public API on the App object
    if (!App.workspace) App.workspace = {};
    App.workspace.render = renderWorkspaceUI; // Function to rebuild the list
    App.workspace.open = openWorkspace; // Function to show the panel
    App.workspace.close = closeWorkspace; // Function to hide the panel
    
    // Create the HTML and CSS
    injectStyles();
    createMarkup();
    
    console.log('Workspace UI Initialized.');
}
