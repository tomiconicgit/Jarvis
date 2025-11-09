// src/core/engine/exportengine.js

// Module-level App object
let App;

/**
 * Triggers a browser download for the given content.
 * @param {string} filename - The desired filename.
 * @param {BlobPart} data - The content to download (string or ArrayBuffer).
 * @param {string} mimeType - The mime type (e.g., "model/gltf-binary").
 */
function triggerDownload(filename, data, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`[Engine] Exported ${filename}`);
}

/**
 * Gathers the form data from the export modal.
 * @param {HTMLElement} modalBody - The modal's content body.
 * @returns {object}
 */
function getExportOptions(modalBody) {
    const getToggle = (id) => modalBody.querySelector(`#${id}`)?.classList.contains('is-checked');
    const getValue = (id) => modalBody.querySelector(`#${id}`)?.value;

    return {
        // Form values
        folderId: getValue('export-model-select'),
        filename: getValue('export-filename') || 'export',
        
        // Toggles
        binary: getToggle('export-toggle-binary'),
        textures: getToggle('export-toggle-textures'),
        animations: getToggle('export-toggle-animations'),
        trs: getToggle('export-toggle-transforms')
        // draco: getToggle('export-toggle-draco') // Not implemented
    };
}

/**
 * Shows the modal for exporting a GLB/GLTF file.
 */
function showGlbExportModal() {
    // 1. Get the list of "model folders" (any non-default folder)
    const folders = App.fileManager.getFolders().filter(f => f.id !== 'default');
    
    if (folders.length === 0) {
        App.modal.alert("No imported models found in the workspace to export.");
        return;
    }

    // 2. Build the <select> options
    const modelOptions = folders.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('');
    
    // 3. Build the modal HTML
    const modalHtml = `
        <div class="modal-form-group">
            <label for="export-model-select">Model to Export</label>
            <select id="export-model-select" class="modal-select">
                ${modelOptions}
            </select>
        </div>
        
        <div class="modal-form-group">
            <label for="export-filename">Export Filename</label>
            <input type="text" id="export-filename" class="modal-input" placeholder="MyModel">
        </div>

        <!-- Toggles -->
        <div class="modal-toggle-group">
            <label for="export-toggle-binary">
                Binary (.glb)
                <small>Export a single compact .glb file.</small>
            </label>
            <div class="modal-toggle is-checked" id="export-toggle-binary"></div>
        </div>
        
        <div class="modal-toggle-group" title="Draco compression requires a more complex build setup and is not yet enabled.">
            <label for="export-toggle-draco">
                Draco Compression
                <small>Compress geometry (coming soon).</small>
            </label>
            <div class="modal-toggle is-disabled" id="export-toggle-draco"></div>
        </div>

        <div class="modal-toggle-group">
            <label for="export-toggle-textures">
                Include Textures
                <small>Embed textures in the file.</small>
            </label>
            <div class="modal-toggle is-checked" id="export-toggle-textures"></div>
        </div>
        
        <div class="modal-toggle-group">
            <label for="export-toggle-animations">
                Include Animations
                <small>Embed all animation clips.</small>
            </label>
            <div class="modal-toggle is-checked" id="export-toggle-animations"></div>
        </div>
        
        <div class="modal-toggle-group">
            <label for="export-toggle-transforms">
                Bake Transforms
                <small>Bake position/rotation/scale into geometry.</small>
            </label>
            <div class="modal-toggle" id="export-toggle-transforms"></div>
        </div>

        <!-- Placeholder for advanced features -->
        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-align: center; margin-top: 10px;">
            Advanced options (simplification, baking, etc.) are not yet implemented.
        </div>
    `;

    // 4. Show the custom modal
    App.modal.custom({
        title: "Export GLB / GLTF",
        html: modalHtml,
        confirmText: "Export",
        onConfirm: (modalBody) => {
            // This is the callback when the user clicks "Export"
            executeGlbExport(modalBody);
        }
    });
}

/**
 * The actual export logic, called by the modal's confirm button.
 * @param {HTMLElement} modalBody
 */
async function executeGlbExport(modalBody) {
    try {
        const options = getExportOptions(modalBody);

        // 1. Find the object in the scene
        const folder = App.fileManager.getFolders().find(f => f.id === options.folderId);
        if (!folder) throw new Error("Could not find selected model folder.");
        
        const objectToExport = App.scene.getObjectByName(folder.name);
        if (!objectToExport) throw new Error(`Object "${folder.name}" not found in scene.`);

        // 2. Dynamically load the exporter
        const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
        const exporter = new GLTFExporter();

        // 3. Set exporter options
        const exporterOptions = {
            binary: options.binary,
            embedImages: options.textures,
            animations: objectToExport.animations || [], // Pass animations
            includeCustomExtensions: true,
            trs: options.trs
            // draco: options.draco // Requires full library setup
        };

        // 4. Run the exporter
        exporter.parse(
            objectToExport,
            (result) => {
                // 5. Handle the result and trigger download
                if (exporterOptions.binary) {
                    // Result is ArrayBuffer
                    triggerDownload(`${options.filename}.glb`, result, 'model/gltf-binary');
                } else {
                    // Result is JSON string
                    triggerDownload(`${options.filename}.gltf`, JSON.stringify(result, null, 2), 'model/gltf+json');
                }
                
                App.modal.hide(); // Close the modal on success
            },
            (error) => {
                console.error('[Engine] GLTFExporter failed:', error);
                App.modal.alert(`Export Failed: ${error}`);
            },
            exporterOptions
        );

    } catch (error) {
        console.error('[Engine] Export failed:', error);
        App.modal.alert(`Export Failed: ${error.message}`);
    }
}

/**
 * The public-facing export function.
 * @param {string} type - 'glb', 'fbx', or 'obj'
 */
function exportModel(type) {
    switch (type) {
        case 'glb':
            showGlbExportModal();
            break;
        case 'fbx':
            App.modal.alert("FBX Exporter is not yet implemented.");
            break;
        case 'obj':
            App.modal.alert("OBJ Exporter is not yet implemented.");
            break;
        default:
            console.error(`[ExportEngine] Unknown export type: ${type}`);
    }
}

/**
 * Initializes the Export Engine module.
 */
export function initExportEngine(app) {
    if (!app || !app.engine) {
        throw new Error('initExportEngine requires App.engine to be initialized first.');
    }
    
    App = app; // Store the app reference
    
    // Add exportModel to the existing engine
    App.engine.exportModel = exportModel;
    
    console.log('Export Engine Initialized.');
}
