// src/core/filemanagement.js

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
 */
function registerFile(file) {
    const parentFolder = state.folders.find(f => f.id === file.parentId);
    
    if (parentFolder) {
        parentFolder.items.push({
            id: file.id,
            name: file.name,
            icon: file.icon
        });
    } else {
        console.warn(`File Manager: Could not find parent folder with id "${file.parentId}"`);
    }
}

/**
 * Returns the raw folder data.
 */
function getFolders() {
    return state.folders;
}

/**
 * NEW: Resets the file state to be empty.
 */
function reset() {
    state.folders.forEach(folder => {
        folder.items = []; // Clear all items from all folders
    });
    console.log('File Manager: State reset.');
}

/**
 * Initializes the File Management service.
 */
export function initFileManagement(App) {
    App.fileManager = {
        registerFile: registerFile,
        getFolders: getFolders,
        reset: reset // <-- ADDED
    };

    console.log('File Management Initialized.');
}
