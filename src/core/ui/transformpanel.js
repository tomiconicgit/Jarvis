// src/core/ui/transformpanel.js
import * as THREE from 'three';

let App;
let panelContainer;

/**
 * Creates and injects the CSS styles for the transform panel.
 */
function injectStyles() {
    const styleId = 'transform-panel-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        #transform-panel-content {
            display: none; /* Hidden by default */
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: 8px;
        }
        
        #transform-panel-content.is-active {
            display: block;
        }

        .transform-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding-top: 20px;
        }

        /* --- NEW: Category Header Style --- */
        .transform-header {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            padding: 10px 4px 8px;
            border-bottom: 1px solid var(--ui-border);
            margin-bottom: 12px;
        }
        .transform-header:not(:first-child) {
            margin-top: 12px;
        }

        /* Styles for slider rows */
        .slider-row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .slider-label {
            font-size: 14px;
            font-weight: 600;
            color: rgba(255,255,255,0.7);
            flex: 0 0 20px; /* 'X', 'Y', 'Z' */
        }
        .slider-input {
            flex: 1;
            margin: 0 10px;
            -webkit-appearance: none;
            height: 8px;
            background: var(--ui-dark-grey);
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            outline: none;
        }
        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: var(--ui-light-grey);
            border: 1px solid var(--ui-border);
            border-radius: 50%;
            cursor: pointer;
        }
        .slider-number {
            width: 65px;
            background: var(--ui-dark-grey);
            color: #fff;
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 13px;
            text-align: right;
            -webkit-appearance: none;
            -moz-appearance: textfield;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the transform panel.
 */
function createMarkup() {
    const toolsContent = document.querySelector('.tools-content');
    if (!toolsContent) {
        console.error('TransformPanel: .tools-content not found!');
        return;
    }

    panelContainer = document.createElement('div');
    panelContainer.id = 'transform-panel-content';

    clearPanelData("Select a Mesh object to transform.");
    toolsContent.appendChild(panelContainer);
    
    // Event listener for all sliders and inputs
    panelContainer.addEventListener('input', (event) => {
        const target = event.target;
        if (target.classList.contains('slider-input') || target.classList.contains('slider-number')) {
            const row = target.closest('.slider-row');
            const prop = row.dataset.prop;
            const axis = row.dataset.axis;
            let value = parseFloat(target.value);

            if (isNaN(value)) return;

            // Update the object
            const object = App.selectionContext.getSelected();
            if (object && object[prop]) {
                if (prop === 'rotation') {
                    value = THREE.MathUtils.degToRad(value);
                }
                
                object[prop][axis] = value;
                
                // If this was a number input, we need to update the slider's range
                if (target.classList.contains('slider-number')) {
                    updateSliders(object);
                } else {
                    // If it was a slider, just sync the number input
                    row.querySelector('.slider-number').value = value.toFixed(prop === 'rotation' ? 1 : 3);
                }
                
                // Tell the gizmo its object moved
                App.gizmo.update();
            }
        }
    });
}

/**
 * --- NEW: DYNAMIC SLIDER LOGIC ---
 * Calculates the min/max/value for a slider based on the "repeating" logic
 */
function getSliderRange(value, minStep, maxStep, isRotation = false) {
    if (isRotation) {
        // Rotation is simple, always -180 to 180
        return { min: -180, max: 180, val: THREE.MathUtils.radToDeg(value).toFixed(1) };
    }
    
    // Logic for Position and Scale
    const baseStep = (minStep + maxStep); // e.g., 100
    const base = Math.floor(value / baseStep) * baseStep;
    
    return {
        min: base + minStep,
        max: base + maxStep,
        val: value.toFixed(3)
    };
}

/**
 * --- NEW: Updates all sliders from the object's current state ---
 * This is called by the gizmo event
 */
function updateSliders(object) {
    if (!object || !panelContainer) return;
    
    // Loop through all slider rows in the panel
    panelContainer.querySelectorAll('.slider-row').forEach(row => {
        const prop = row.dataset.prop; // 'position'
        const axis = row.dataset.axis; // 'x'
        const isRotation = (prop === 'rotation');
        
        const currentValue = object[prop][axis];
        
        let range;
        if (isRotation) {
            range = getSliderRange(currentValue, 0, 0, true);
        } else if (prop === 'scale') {
            range = getSliderRange(currentValue, 0.01, 100.0, false);
        } else {
            range = getSliderRange(currentValue, -100.0, 100.0, false);
        }
        
        // Update the slider and number input
        const slider = row.querySelector('.slider-input');
        slider.min = range.min;
        slider.max = range.max;
        slider.value = range.val;
        
        row.querySelector('.slider-number').value = range.val;
    });
}

/**
 * Fills the panel with data from the selected object
 */
function updatePanelData(object) {
    if (!object || !object.isMesh) {
        clearPanelData("Select a Mesh object to transform.");
        return;
    }

    // Helper to create one slider row
    const createSlider = (label, prop, axis, min, max, step) => {
        // Note: Value is set by updateSliders
        return `
            <div class="slider-row" data-prop="${prop}" data-axis="${axis}">
                <span class="slider-label">${label}</span>
                <input type="range" class="slider-input" min="${min}" max="${max}" step="${step}" value="0">
                <input type="number" class="slider-number" min="${min}" max="${max}" step="${step}" value="0">
            </div>
        `;
    };

    let html = `
        <div class="transform-header">Position</div>
        ${createSlider('X', 'position', 'x', -100, 100, 0.01)}
        ${createSlider('Y', 'position', 'y', -100, 100, 0.01)}
        ${createSlider('Z', 'position', 'z', -100, 100, 0.01)}

        <div class="transform-header">Rotation</div>
        ${createSlider('X', 'rotation', 'x', -180, 180, 1)}
        ${createSlider('Y', 'rotation', 'y', -180, 180, 1)}
        ${createSlider('Z', 'rotation', 'z', -180, 180, 1)}

        <div class="transform-header">Scale</div>
        ${createSlider('X', 'scale', 'x', 0.01, 100, 0.01)}
        ${createSlider('Y', 'scale', 'y', 0.01, 100, 0.01)}
        ${createSlider('Z', 'scale', 'z', 0.01, 100, 0.01)}
    `;
    
    panelContainer.innerHTML = html;
    
    // Now that HTML is built, update sliders to object's current values
    updateSliders(object);
}

/**
 * Clears the panel and shows an empty state
 */
function clearPanelData(message = "No object selected") {
    panelContainer.innerHTML = `
        <div class="transform-empty-state">
            ${message}
        </div>
    `;
}

function showPanel() {
    if (panelContainer) panelContainer.classList.add('is-active');
}

function hidePanel() {
    if (panelContainer) panelContainer.classList.remove('is-active');
}

/**
 * Initializes the Transform Panel module.
 */
export function initTransformPanel(app) {
    App = app;

    injectStyles();
    setTimeout(createMarkup, 100); 

    if (!App.transformPanel) App.transformPanel = {};
    App.transformPanel.show = showPanel;
    App.transformPanel.hide = hidePanel;
    
    // Subscribe to events
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', () => clearPanelData("No object selected."));
    
    // --- NEW: Listen for gizmo changes ---
    App.events.subscribe('objectTransformed', updateSliders);

    console.log('Transform Panel Initialized.');
}
