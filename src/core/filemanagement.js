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
 * NEW: Registers a new folder in the workspace.
 * @param {object} folder - { id, name, isOpen }
 */
function registerFolder(folder) {
    if (!folder || !folder.id || !folder.name) {
        console.error('File Manager: Invalid folder object.', folder);
        return;
    }
    
    if (state.folders.find(f => f.id === folder.id)) {
        console.warn(`File Manager: Folder with id "${folder.id}" already exists.`);
        return;
    }

    state.folders.push({
        id: folder.id,
        name: folder.name,
        isOpen: folder.isOpen || false,
        items: []
    });
}

/**
 * Returns the raw folder data.
 */
function getFolders() {
    return state.folders;
}

/**
 * UPDATED: Resets the file state.
 * Removes all non-default folders and clears items from the default folder.
 */
function reset() {
    // Keep only the default folder
    state.folders = state.folders.filter(f => f.id === 'default');
    
    // Reset the default folder
    if (state.folders[0]) {
        state.folders[0].items = [];
        state.folders[0].isOpen = false; // Close it
    }
    
    console.log('File Manager: State reset.');
}

/**
 * Initializes the File Management service.
 */
export function initFileManagement(App) {
    App.fileManager = {
        registerFile: registerFile,
        registerFolder: registerFolder, // <-- ADDED
        getFolders: getFolders,
        reset: reset
    };

    console.log('File Management Initialized.');
}
