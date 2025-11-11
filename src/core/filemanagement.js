// src/core/filemanagement.js
// This module acts as a state manager for the workspace file tree.
// It holds a simple, in-memory representation of the folders and
// files (assets) in the current project. The Workspace UI (workspace.js)
// reads from this module to render itself.

// This is the module-level "database" or "state" object.
// It's not directly exposed. Modules must use the exported
// functions (like registerFile) to modify it.
const state = {
    // It starts with one "Default" folder, which will hold
    // the default terrain, light, and environment.
    folders: [
        {
            id: 'default',
            name: 'Default',
            isOpen: false, // Start collapsed by default
            items: [] // An array to hold file objects
        }
    ]
};

/**
 * Adds a new file entry (like a mesh, light, or script) to a folder.
 * @param {object} file - The file object to register.
 * @param {string} file.id - The unique ID of the asset (often the object's UUID).
 * @param {string} file.name - The display name.
 * @param {string} file.icon - The name of the icon to use (e.g., 'mesh', 'light').
 * @param {string} file.parentId - The 'id' of the folder this file belongs to.
 */
function registerFile(file) {
    // 1. Find the parent folder in our 'state' object.
    const parentFolder = state.folders.find(f => f.id === file.parentId);

    if (!parentFolder) {
        // Log a warning if the folder ID was invalid.
        console.warn(`File Manager: Could not find parent folder with id "${file.parentId}"`);
        return;
    }

    const fileEntry = {
        id: file.id,
        name: file.name,
        icon: file.icon,
        parentId: file.parentId,
        parentItemId: file.parentItemId || null,
        children: []
    };

    if (file.parentItemId) {
        const parentItem = findItemInItems(parentFolder.items, file.parentItemId);
        if (parentItem) {
            if (!Array.isArray(parentItem.children)) {
                parentItem.children = [];
            }
            parentItem.children.push(fileEntry);
            return;
        }

        console.warn(`File Manager: Could not find parent item with id "${file.parentItemId}" inside folder "${file.parentId}". Adding to folder root instead.`);
    }

    parentFolder.items.push(fileEntry);
}

/**
 * Adds a new, empty folder to the workspace.
 * @param {object} folder - The folder object to register.
 * @param {string} folder.id - The unique ID for this folder.
 * @param {string} folder.name - The display name.
 * @param {boolean} [folder.isOpen] - Whether the folder should be open (expanded) by default.
 */
function registerFolder(folder) {
    // 1. Basic validation.
    if (!folder || !folder.id || !folder.name) {
        console.error('File Manager: Invalid folder object.', folder);
        return;
    }
    
    // 2. Check for duplicates.
    if (state.folders.find(f => f.id === folder.id)) {
        console.warn(`File Manager: Folder with id "${folder.id}" already exists.`);
        return;
    }

    // 3. Add the new folder object to the 'folders' array.
    state.folders.push({
        id: folder.id,
        name: folder.name,
        isOpen: folder.isOpen || false, // Default to closed
        items: [] // Start with an empty items array
    });
}

/**
 * Returns a direct reference to the raw 'folders' array.
 * This is used by the Workspace UI to render itself.
 * @returns {Array<object>} The array of folder objects from the state.
 */
function getFolders() {
    return state.folders;
}

/**
 * Resets the file manager to its initial state.
 * Called by "New Project" and "Load Project" (before loading).
 * It removes all folders *except* the 'default' one and clears
 * all items from the 'default' folder.
 */
function reset() {
    // Filter the array to only keep the folder with id 'default'.
    state.folders = state.folders.filter(f => f.id === 'default');
    
    // Check if the 'default' folder still exists (it should)
    if (state.folders[0]) {
        // Clear its items and reset its 'open' state.
        state.folders[0].items = [];
        state.folders[0].isOpen = false;
    }
    console.log('File Manager: State reset.');
}

/**
 * --- NEW: Finds a file's data entry by its ID ---
 * Searches all folders to find a file with the given ID.
 * @param {string} fileId - The ID of the file to find.
 * @returns {object | null} The file object or null if not found.
 */
function findFileById(fileId) {
    // Loop through each folder and search recursively.
    for (const folder of state.folders) {
        const file = findItemInItems(folder.items, fileId);
        if (file) return file; // Found it!
    }
    return null; // Not found
}

/**
 * --- NEW: Moves a file from one folder to another ---
 * This is used by the properties panel to re-parent objects.
 * @param {string} fileId - The ID of the file to move.
 * @param {string} newParentFolderId - The ID of the folder to move it to.
 */
function moveFile(fileId, newParentFolderId) {
    const context = findItemContext(fileId);

    if (!context) {
        console.error(`[File Manager] moveFile: Could not find file with id ${fileId}`);
        return;
    }

    const newParentFolder = state.folders.find(f => f.id === newParentFolderId);
    if (!newParentFolder) {
        console.error(`[File Manager] moveFile: Could not find new parent folder with id ${newParentFolderId}`);
        return;
    }

    // Remove from current collection (either folder root or parent's children)
    context.collection.splice(context.index, 1);

    // Reset parent references to reflect folder move
    context.item.parentId = newParentFolderId;
    context.item.parentItemId = null;

    newParentFolder.items.push(context.item);

    console.log(`[File Manager] Moved ${context.item.name} to ${newParentFolder.name}`);
}

/**
 * Initializes the File Management service by attaching its
 * public API to the main App object.
 * @param {object} App - The main application object.
 */
export function initFileManagement(App) {
    // Create the 'fileManager' namespace on the App object.
    App.fileManager = {
        registerFile: registerFile,
        registerFolder: registerFolder,
        getFolders: getFolders,
        reset: reset,
        findFileById: findFileById, // <-- Expose the new function
        moveFile: moveFile         // <-- Expose the new function
    };

    console.log('File Management Initialized.');
}

/**
 * Recursively searches a list of items (and their children) for a matching ID.
 * @param {Array<object>} items - The items to search.
 * @param {string} targetId - The ID to locate.
 * @returns {object | null} The item if found, otherwise null.
 */
function findItemInItems(items, targetId) {
    for (const item of items) {
        if (item.id === targetId) {
            return item;
        }

        if (item.children && item.children.length) {
            const childResult = findItemInItems(item.children, targetId);
            if (childResult) {
                return childResult;
            }
        }
    }

    return null;
}

/**
 * Finds an item and metadata about where it is stored (folder, parent item, index).
 * @param {string} targetId - The item ID to search for.
 * @returns {{ item: object, collection: Array<object>, index: number } | null}
 */
function findItemContext(targetId) {
    for (const folder of state.folders) {
        const result = findContextRecursive(folder.items, targetId);
        if (result) {
            return result;
        }
    }

    return null;
}

function findContextRecursive(collection, targetId) {
    for (let index = 0; index < collection.length; index++) {
        const item = collection[index];
        if (item.id === targetId) {
            return { item, collection, index };
        }

        if (item.children && item.children.length) {
            const result = findContextRecursive(item.children, targetId);
            if (result) {
                return result;
            }
        }
    }

    return null;
}
