// src/core/filemanagement.js

import { renderWorkspaceUI, getIconSVG } from './ui/workspace.js';

// This is the master state for the workspace file tree.
const state = {
    folders: [
        {
            id: 'default',
            name: 'Default',
            isOpen: false, // <-- THE FIX IS HERE (was true)
            items: []
        }
    ]
};

/**
 * Registers a new file in the workspace.
 * This is the public API for other modules to use.
 * @param {object} file - e.g., { id: 'terrain-1', name: 'Default Terrain', icon: 'mesh', parentId: 'default' }
 */
function registerFile(file) {
    const parentFolder = state.folders.find(f => f.id === file.parentId);
    
    if (parentFolder) {
        // Add the file (with its icon SVG) to the folder's items
        parentFolder.items.push({
            id: file.id,
            name: file.name,
            icon: getIconSVG(file.icon) // Get the SVG markup
        });
    } else {
        console.warn(`File Manager: Could not find parent folder with id "${file.parentId}"`);
    }
}

/**
 * Renders the entire workspace UI based on the current state.
 */
function render() {
    renderWorkspaceUI(state.folders);
}

/**
 * Initializes the File Management service and attaches its
 * public API to the main App object.
 */
export function initFileManagement(App) {
    // Attach our public API to the App object
    // so other modules can use it.
    App.fileManager = {
        registerFile: registerFile,
        render: render
    };

    console.log('File Management Initialized.');
}
