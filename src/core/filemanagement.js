// src/core/filemanagement.js

// --- GONE: No more import from workspace.js ---

// This is the master state for the workspace file tree.
const state = {
    folders: [
        {
            id: 'default',
            name: 'Default',
            isOpen: false,
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
        // Add the file (with its icon name) to the folder's items
        parentFolder.items.push({
            id: file.id,
            name: file.name,
            icon: file.icon // <-- FIX: Store the icon *name* string
        });
    } else {
        console.warn(`File Manager: Could not find parent folder with id "${file.parentId}"`);
    }
}

/**
 * NEW: Returns the raw folder data.
 */
function getFolders() {
    return state.folders;
}

/**
 * Initializes the File Management service and attaches its
 * public API to the main App object.
 */
export function initFileManagement(App) {
    // Attach our public API to the App object
    App.fileManager = {
        registerFile: registerFile,
        getFolders: getFolders // <-- FIX: Expose the data getter
        // --- GONE: The 'render' function is removed
    };

    console.log('File Management Initialized.');
}
