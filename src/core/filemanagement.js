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
            icon: file.icon,
            parentId: file.parentId // <-- Store this
        });
    } else {
        console.warn(`File Manager: Could not find parent folder with id "${file.parentId}"`);
    }
}

/**
 * Registers a new folder in the workspace.
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
 * Resets the file state.
 */
function reset() {
    state.folders = state.folders.filter(f => f.id === 'default');
    if (state.folders[0]) {
        state.folders[0].items = [];
        state.folders[0].isOpen = false;
    }
    console.log('File Manager: State reset.');
}

/**
 * --- NEW: Finds a file's data entry by its ID ---
 */
function findFileById(fileId) {
    for (const folder of state.folders) {
        const file = folder.items.find(i => i.id === fileId);
        if (file) return file;
    }
    return null;
}

/**
 * --- NEW: Moves a file from one folder to another ---
 */
function moveFile(fileId, newParentFolderId) {
    let file, oldFolder, fileIndex = -1;

    // 1. Find the file and its current folder
    for (const folder of state.folders) {
        fileIndex = folder.items.findIndex(i => i.id === fileId);
        if (fileIndex > -1) {
            file = folder.items[fileIndex];
            oldFolder = folder;
            break;
        }
    }

    if (!file) {
        console.error(`[File Manager] moveFile: Could not find file with id ${fileId}`);
        return;
    }

    // 2. Find the new parent folder
    const newParentFolder = state.folders.find(f => f.id === newParentFolderId);
    if (!newParentFolder) {
        console.error(`[File Manager] moveFile: Could not find new parent folder with id ${newParentFolderId}`);
        return;
    }
    
    // 3. Perform the move
    const [movedFile] = oldFolder.items.splice(fileIndex, 1);
    movedFile.parentId = newParentFolderId; // Update internal parentId
    newParentFolder.items.push(movedFile);
    
    console.log(`[File Manager] Moved ${movedFile.name} to ${newParentFolder.name}`);
}

/**
 * Initializes the File Management service.
 */
export function initFileManagement(App) {
    App.fileManager = {
        registerFile: registerFile,
        registerFolder: registerFolder,
        getFolders: getFolders,
        reset: reset,
        findFileById: findFileById, // <-- ADDED
        moveFile: moveFile         // <-- ADDED
    };

    console.log('File Management Initialized.');
}
