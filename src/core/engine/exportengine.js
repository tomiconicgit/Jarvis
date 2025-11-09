// src/core/engine/exportengine.js
import * as THREE from 'three';

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
        
        // GLB Toggles
        binary: getToggle('export-toggle-binary'),
        textures: getToggle('export-toggle-textures'),
        animations: getToggle('export-toggle-animations'),
        trs: getToggle('export-toggle-transforms'),
        
        // OBJ Toggles
        includeMaterials: getToggle('export-toggle-materials')
    };
}

// ---
// --- GLB/GLTF EXPORT
// ---

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
 * The actual GLB export logic.
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
        };

        // 4. Run the exporter
        exporter.parse(
            objectToExport,
            (result) => {
                // 5. Handle the result and trigger download
                if (exporterOptions.binary) {
                    triggerDownload(`${options.filename}.glb`, result, 'model/gltf-binary');
                } else {
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


// ---
// --- NEW: OBJ EXPORT
// ---

/**
 * Shows the modal for exporting an OBJ file.
 */
function showObjExportModal() {
    const folders = App.fileManager.getFolders().filter(f => f.id !== 'default');
    if (folders.length === 0) {
        App.modal.alert("No imported models found in the workspace to export.");
        return;
    }

    const modelOptions = folders.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('');
    
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
 * Helper to convert a THREE.Color to an "R G B" string.
 */
function colorString(c) {
    return `${c.r} ${c.g} ${c.b}`;
}

/**
 * Helper to get blob data from a texture's image.
 * @param {HTMLImageElement | HTMLCanvasElement} image 
 * @returns {Promise<Blob>}
 */
async function getImageBlob(image) {
    if (image.src) {
        // It's an HTMLImageElement with a URL
        try {
            // Use fetch to get the image data, bypassing CORS issues
            const response = await fetch(image.src);
            if (!response.ok) throw new Error('Failed to fetch image');
            return await response.blob();
        } catch (e) {
            console.warn(`Failed to fetch image from ${image.src}: ${e}. Trying canvas fallback.`);
        }
    }
    
    // Fallback: draw to canvas and get blob
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * The actual OBJ export logic.
 * @param {HTMLElement} modalBody
 */
async function executeObjExport(modalBody) {
    App.modal.alert("Exporting... this may take a moment."); // Give user feedback
    
    try {
        const options = getExportOptions(modalBody);

        // 1. Get the object to export
        const folder = App.fileManager.getFolders().find(f => f.id === options.folderId);
        if (!folder) throw new Error("Could not find selected model folder.");
        const objectToExport = App.scene.getObjectByName(folder.name);
        if (!objectToExport) throw new Error(`Object "${folder.name}" not found in scene.`);

        // 2. Load dependencies
        const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
        const JSZip = (await import('jszip')).default;

        const exporter = new OBJExporter();
        const zip = new JSZip();

        let mtlString = "";
        const texturesToPack = new Map(); // Use a Map to avoid duplicate texture names
        const materialsToProcess = new Set();
        
        // 3. Find all materials and give them unique names for the exporter
        objectToExport.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => materialsToProcess.add(material));
            }
        });
        
        // 4. Manually generate the .MTL string and collect textures
        for (const material of materialsToProcess) {
            // Ensure material has a name for the OBJ file
            if (!material.name) {
                material.name = `Material_${material.uuid.substring(0, 6)}`;
            }

            mtlString += `newmtl ${material.name}\n`;
            mtlString += `Ka 1.0 1.0 1.0\n`; // Ambient
            mtlString += `Kd ${colorString(material.color)}\n`; // Diffuse
            mtlString += `Ks 0.0 0.0 0.0\n`; // Specular
            mtlString += `d ${material.opacity}\n`; // Dissolve (opacity)
            mtlString += `illum 1\n`; // Illumination model

            // Check for diffuse texture
            if (material.map && material.map.image) {
                const texture = material.map;
                const texName = texture.name || `tex_${texture.uuid.substring(0, 8)}.png`;
                mtlString += `map_Kd ${texName}\n`;
                if (!texturesToPack.has(texName)) {
                    texturesToPack.set(texName, texture.image);
                }
            }
            // TODO: Add support for other maps like normalMap (map_Bump)
            mtlString += '\n';
        }
        
        // 5. Run the exporter
        const objString = exporter.parse(objectToExport);
        
        // 6. Add files to the zip
        zip.file(`${options.filename}.obj`, objString);
        
        if (options.includeMaterials && mtlString) {
            // --- THIS IS THE FIX ---
            zip.file(`${options.filename}.mtl`, mTLString); // <-- CORRECTED
            // --- END FIX ---
            
            // Add all textures
            const texturePromises = [];
            for (const [name, image] of texturesToPack.entries()) {
                texturePromises.push(
                    getImageBlob(image).then(blob => {
                        zip.file(name, blob); // Add to root of zip
                    })
                );
            }
            await Promise.all(texturePromises);
        }

        // 7. Generate and download the zip
        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(`${options.filename}.zip`, zipBlob, 'application/zip');
        
        App.modal.hide();

    } catch (error) {
        console.error('[Engine] OBJ Export failed:', error);
        App.modal.alert(`OBJ Export Failed: ${error.message}`);
    }
}


// ---
// --- MAIN EXPORT FUNCTION
// ---

/**
 * The public-facing export function.
 * @param {string} type - 'glb' or 'obj'
 */
function exportModel(type) {
    switch (type) {
        case 'glb':
            showGlbExportModal();
            break;
        case 'obj':
            showObjExportModal(); // <-- UPDATED
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
