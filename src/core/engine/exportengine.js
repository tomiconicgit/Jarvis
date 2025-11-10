// src/core/engine/exportengine.js
// This module provides the logic for exporting parts of the
// 3D scene (like imported models) into shareable file formats
// such as GLB and OBJ.

import * as THREE from 'three';

// Module-level variable to store a reference to the main App object.
// This is set once during initialization.
let App;

/**
 * A utility function that creates a file in the user's browser
 * and triggers a "Save As..." download prompt.
 *
 * @param {string} filename - The desired filename for the download (e.g., "MyModel.glb").
 * @param {BlobPart} data - The content to be saved. This can be a string (like JSON
 * or an .obj file) or an ArrayBuffer (for binary files like .glb).
 * @param {string} mimeType - The standard MIME type for the file, which tells
 * the browser what kind of file it is (e.g., "model/gltf-binary" or "application/zip").
 */
function triggerDownload(filename, data, mimeType) {
    // 1. Create a Blob (Binary Large Object) from the data.
    // A Blob is an object that represents raw, immutable data.
    const blob = new Blob([data], { type: mimeType });
    
    // 2. Create a temporary URL that points to this Blob in the browser's memory.
    const url = URL.createObjectURL(blob);
    
    // 3. Create a hidden <a> (anchor/link) element.
    const a = document.createElement('a');
    a.href = url; // Set the link's target to our blob URL.
    a.download = filename; // This attribute tells the browser to download the file.
    
    // 4. Add the link to the document, click it, and then remove it.
    document.body.appendChild(a);
    a.click(); // This programmatically triggers the download.
    
    // 5. Clean up.
    document.body.removeChild(a); // Remove the hidden link.
    // Revoke the temporary URL to free up browser memory.
    URL.revokeObjectURL(url);
    
    console.log(`[Engine] Exported ${filename}`);
}

/**
 * A helper function to read the values from the export modal's form.
 *
 * @param {HTMLElement} modalBody - The 'modal-content' element containing the form.
 * @returns {object} An object containing all the user-selected export options.
 */
function getExportOptions(modalBody) {
    // Helper to check if a custom toggle (a <div>) has the 'is-checked' class.
    const getToggle = (id) => modalBody.querySelector(`#${id}`)?.classList.contains('is-checked');
    // Helper to get the value from an <input> or <select> element.
    const getValue = (id) => modalBody.querySelector(`#${id}`)?.value;

    return {
        // Form values
        folderId: getValue('export-model-select'), // The ID of the model/folder to export
        filename: getValue('export-filename') || 'export', // The desired filename
        
        // GLB Toggles
        binary: getToggle('export-toggle-binary'), // .glb (true) or .gltf (false)
        textures: getToggle('export-toggle-textures'), // Embed textures?
        animations: getToggle('export-toggle-animations'), // Include animations?
        trs: getToggle('export-toggle-transforms'), // Bake transforms?
        
        // OBJ Toggles
        includeMaterials: getToggle('export-toggle-materials') // Export .mtl and textures?
    };
}

// ---
// --- GLB/GLTF EXPORT
// ---

/**
 * Dynamically builds and shows the modal dialog for exporting a GLB/GLTF file.
 */
function showGlbExportModal() {
    // 1. Get the list of "model folders" (any folder that isn't the 'default' one).
    // This assumes that any user-imported model gets its own folder.
    const folders = App.fileManager.getFolders().filter(f => f.id !== 'default');
    
    if (folders.length === 0) {
        App.modal.alert("No imported models found in the workspace to export.");
        return;
    }

    // 2. Build the <select> options from the list of folders.
    const modelOptions = folders.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('');
    
    // 3. Define the HTML content for the modal.
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

        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-align: center; margin-top: 10px;">
            Advanced options (simplification, baking, etc.) are not yet implemented.
        </div>
    `;

    // 4. Show the custom modal.
    App.modal.custom({
        title: "Export GLB / GLTF",
        html: modalHtml,
        confirmText: "Export",
        onConfirm: (modalBody) => {
            // This is the callback function that runs when the user
            // clicks the "Export" button.
            executeGlbExport(modalBody);
        }
    });
}

/**
 * The actual logic that performs the GLB export, called by the modal.
 * @param {HTMLElement} modalBody - The modal body containing the form options.
 */
async function executeGlbExport(modalBody) {
    try {
        const options = getExportOptions(modalBody);

        // 1. Find the object in the scene to export.
        // We find the folder data, then use its name to find the corresponding
        // THREE.Object3D in the main scene.
        const folder = App.fileManager.getFolders().find(f => f.id === options.folderId);
        if (!folder) throw new Error("Could not find selected model folder.");
        
        const objectToExport = App.scene.getObjectByName(folder.name);
        if (!objectToExport) throw new Error(`Object "${folder.name}" not found in scene.`);

        // 2. Dynamically load the GLTFExporter module.
        // We only load this code when the user *actually* exports,
        // saving on initial app load time.
        const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
        const exporter = new GLTFExporter();

        // 3. Set exporter options based on the user's choices.
        const exporterOptions = {
            binary: options.binary, // true for .glb, false for .gltf + .bin
            embedImages: options.textures, // Embed textures in the file
            animations: objectToExport.animations || [], // Pass any animations
            includeCustomExtensions: true, // For custom data
            trs: options.trs // Apply (bake) transforms or keep them separate
        };

        // 4. Run the exporter. This is an asynchronous operation.
        exporter.parse(
            objectToExport, // The Three.js object to export
            
            // 5. onSuccess Callback
            (result) => {
                // 'result' is either an ArrayBuffer (if binary) or a JSON object.
                if (exporterOptions.binary) {
                    // It's a .glb (binary), trigger download directly.
                    triggerDownload(`${options.filename}.glb`, result, 'model/gltf-binary');
                } else {
                    // It's a .gltf (JSON), stringify it and trigger download.
                    triggerDownload(`${options.filename}.gltf`, JSON.stringify(result, null, 2), 'model/gltf+json');
                }
                App.modal.hide(); // Close the modal on success
            },
            
            // 6. onError Callback
            (error) => {
                console.error('[Engine] GLTFExporter failed:', error);
                App.modal.alert(`Export Failed: ${error}`);
            },
            
            // 7. Pass in the options
            exporterOptions
        );

    } catch (error) {
        console.error('[Engine] Export failed:', error);
        App.modal.alert(`Export Failed: ${error.message}`);
    }
}


// ---
// --- NEW: OBJ EXPORT
// ---

/**
 * Shows the modal for exporting an OBJ file.
 */
function showObjExportModal() {
    // 1. Get folders (same as GLB export)
    const folders = App.fileManager.getFolders().filter(f => f.id !== 'default');
    if (folders.length === 0) {
        App.modal.alert("No imported models found in the workspace to export.");
        return;
    }

    // 2. Build <select> options
    const modelOptions = folders.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('');
    
    // 3. Build modal HTML. Note the different toggles for OBJ.
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

        <div class="modal-toggle-group">
            <label for="export-toggle-materials">
                Export .MTL & Textures (.zip)
                <small>Bundle model, materials, and textures in a zip.</small>
            </label>
            <div class="modal-toggle is-checked" id="export-toggle-materials"></div>
        </div>
        
        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-align: center; margin-top: 10px;">
            OBJ format does not support animations or PBR materials.
        </div>
    `;

    // 4. Show the modal
    App.modal.custom({
        title: "Export OBJ",
        html: modalHtml,
        confirmText: "Export",
        onConfirm: (modalBody) => {
            executeObjExport(modalBody);
        }
    });
}

/**
 * Helper to convert a THREE.Color object to an "R G B" string (e.g., "1.0 0.5 0.0").
 * @param {THREE.Color} c - The color object.
 * @returns {string} The RGB string.
 */
function colorString(c) {
    return `${c.r} ${c.g} ${c.b}`;
}

/**
 * Helper to get Blob data from a texture's image source.
 * This is complex because the image could be a URL (which might have
 * CORS issues) or a <canvas> element.
 * @param {HTMLImageElement | HTMLCanvasElement} image - The texture's image data.
 * @returns {Promise<Blob>} A promise that resolves with the image data as a Blob.
 */
async function getImageBlob(image) {
    if (image.src) {
        // It's an HTMLImageElement with a URL.
        try {
            // Use 'fetch' to get the image data. This is the most reliable
            // way to bypass potential "tainted canvas" CORS issues.
            const response = await fetch(image.src);
            if (!response.ok) throw new Error('Failed to fetch image');
            return await response.blob();
        } catch (e) {
            console.warn(`Failed to fetch image from ${image.src}: ${e}. Trying canvas fallback.`);
        }
    }
    
    // Fallback: If it's a canvas, or if fetch failed,
    // draw the image to a *new* canvas and get the blob from that.
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    // 'toBlob' is asynchronous.
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * The actual logic that performs the OBJ export.
 * @param {HTMLElement} modalBody
 */
async function executeObjExport(modalBody) {
    // Give user feedback since this can be slow.
    App.modal.alert("Exporting... this may take a moment."); 
    
    try {
        const options = getExportOptions(modalBody);

        // 1. Get the object to export (same as GLB)
        const folder = App.fileManager.getFolders().find(f => f.id === options.folderId);
        if (!folder) throw new Error("Could not find selected model folder.");
        const objectToExport = App.scene.getObjectByName(folder.name);
        if (!objectToExport) throw new Error(`Object "${folder.name}" not found in scene.`);

        // 2. Load dependencies dynamically
        const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
        // We use .default here because jszip's module export is structured that way.
        const JSZip = (await import('jszip')).default;

        const exporter = new OBJExporter();
        const zip = new JSZip();

        // Variables for building the .mtl file and collecting texture files
        let mtlString = "";
        // Use a Map to store textures. This handily avoids duplicates
        // if multiple materials use the same texture file.
        const texturesToPack = new Map(); // Key: texture_name.png, Value: image data
        const materialsToProcess = new Set(); // Use a Set to avoid processing same material
        
        // 3. Find all unique materials used by the model
        objectToExport.traverse((child) => {
            if (child.isMesh && child.material) {
                // A mesh can have one material or an array of materials
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => materialsToProcess.add(material));
            }
        });
        
        // 4. Manually generate the .MTL string and collect textures
        // The built-in OBJExporter doesn't create .mtl files, so we do it ourselves.
        for (const material of materialsToProcess) {
            // Ensure material has a name for the .obj file to reference
            if (!material.name) {
                // Create a unique-ish name if one doesn't exist
                material.name = `Material_${material.uuid.substring(0, 6)}`;
            }

            // Write the .mtl material definition
            mtlString += `newmtl ${material.name}\n`;
            mtlString += `Ka 1.0 1.0 1.0\n`; // Ambient color
            mtlString += `Kd ${colorString(material.color)}\n`; // Diffuse color
            mtlString += `Ks 0.0 0.0 0.0\n`; // Specular color (OBJ doesn't map PBR well)
            mtlString += `d ${material.opacity}\n`; // Dissolve (opacity)
            mtlString += `illum 1\n`; // Illumination model

            // Check for a diffuse texture (material.map)
            if (material.map && material.map.image) {
                const texture = material.map;
                // Give the texture a file name
                const texName = texture.name || `tex_${texture.uuid.substring(0, 8)}.png`;
                // Tell the .mtl file to use this texture
                mtlString += `map_Kd ${texName}\n`;
                // Add the texture's image data to our list to be zipped
                if (!texturesToPack.has(texName)) {
                    texturesToPack.set(texName, texture.image);
                }
            }
            // TODO: Add support for other maps like normalMap (map_Bump)
            mtlString += '\n'; // Add a newline for the next material
        }
        
        // 5. Run the exporter to get the .obj file content as a string
        const objString = exporter.parse(objectToExport);
        
        // 6. Add the .obj file to our zip
        zip.file(`${options.filename}.obj`, objString);
        
        // 7. If the user wants materials...
        if (options.includeMaterials && mtlString) {
            // Add the .mtl file we generated to the zip
            zip.file(`${options.filename}.mtl`, mtlString);
            
            // Add all the textures we collected
            const texturePromises = [];
            for (const [name, image] of texturesToPack.entries()) {
                // We must get the Blob data for each image asynchronously
                texturePromises.push(
                    getImageBlob(image).then(blob => {
                        zip.file(name, blob); // Add texture to the root of the zip
                    })
                );
            }
            // Wait for all image blobs to be processed and added
            await Promise.all(texturePromises);
        }

        // 8. Generate and download the final zip file
        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(`${options.filename}.zip`, zipBlob, 'application/zip');
        
        App.modal.hide(); // Close the modal on success

    } catch (error) {
        console.error('[Engine] OBJ Export failed:', error);
        App.modal.alert(`OBJ Export Failed: ${error.message}`);
    }
}


// ---
// --- MAIN EXPORT FUNCTION
// ---

/**
 * The public-facing export function that is attached to App.engine.
 * This is called by the UI (e.g., the menu).
 * @param {string} type - 'glb' or 'obj'
 */
function exportModel(type) {
    switch (type) {
        case 'glb':
            showGlbExportModal();
            break;
        case 'obj':
            showObjExportModal(); // <-- Call the OBJ modal function
            break;
        default:
            console.error(`[ExportEngine] Unknown export type: ${type}`);
    }
}

/**
 * Initializes the Export Engine module.
 * @param {object} app - The main App object.
 */
export function initExportEngine(app) {
    if (!app || !app.engine) {
        // This module depends on the core 'engine' module being initialized first.
        throw new Error('initExportEngine requires App.engine to be initialized first.');
    }
    
    App = app; // Store the app reference for internal use.
    
    // Attach the public 'exportModel' function to the App.engine namespace.
    App.engine.exportModel = exportModel;
    
    console.log('Export Engine Initialized.');
}
