// src/core/ui/transformpanel.js
import * as THREE from 'three';

let App;
let panelContainer; // This is now the main slide-up panel

/**
 * Creates and injects the CSS styles for the transform panel.
 */
function injectStyles() {
    const styleId = 'transform-panel-ui-styles';
    if (document.getElementById(styleId)) return;

    // --- UPDATED: Styles are now for the inner content ---
    const css = `
        /* The #transform-panel-container is created by editorbar.js */
        
        #transform-panel-content {
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: 8px;
        }
        
        .transform-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding-top: 20px;
        }

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

        .stepper-row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .stepper-label {
            font-size: 14px;
            font-weight: 600;
            color: rgba(255,255,255,0.7);
            flex: 0 0 20px; /* 'X', 'Y', 'Z' */
        }
        .stepper-btn {
            background: var(--ui-light-grey);
            border: 1px solid var(--ui-border);
            color: #fff;
            font-size: 20px;
            line-height: 20px;
            font-weight: 600;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
        }
        .stepper-btn:active {
            background: var(--ui-grey);
        }
        .stepper-value {
            flex: 1;
            background: var(--ui-dark-grey);
            color: #fff;
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 14px;
            text-align: center;
            margin: 0 8px;
            cursor: pointer;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

// --- (updateObjectFromStepper and updateObjectFromPrompt are UNCHANGED) ---
function updateObjectFromStepper(prop, axis, step) {
    const object = App.selectionContext.getSelected();
    if (!object || !object[prop]) return;
    let value = object[prop][axis];
    if (prop === 'rotation') {
        value = THREE.MathUtils.radToDeg(value);
        value += step;
        object[prop][axis] = THREE.MathUtils.degToRad(value);
    } else {
        value += step;
        object[prop][axis] = value;
    }
    updateTransformPanel(object);
    App.gizmo.update();
}
function updateObjectFromPrompt(prop, axis) {
    const object = App.selectionContext.getSelected();
    if (!object || !object[prop]) return;
    let currentValue = object[prop][axis];
    if (prop === 'rotation') {
        currentValue = THREE.MathUtils.radToDeg(currentValue);
    }
    const newValueStr = window.prompt(`Enter new value for ${prop} ${axis.toUpperCase()}:`, currentValue.toFixed(3));
    if (newValueStr === null) return;
    let newValue = parseFloat(newValueStr);
    if (isNaN(newValue)) {
        App.modal.alert("Invalid input. Please enter a number.");
        return;
    }
    if (prop === 'rotation') {
        newValue = THREE.MathUtils.degToRad(newValue);
    }
    object[prop][axis] = newValue;
    updateTransformPanel(object);
    App.gizmo.update();
}


/**
 * Creates the HTML markup for the transform panel.
 */
function createMarkup() {
    // --- UPDATED: Find the container created by editorbar.js ---
    panelContainer = document.getElementById('transform-panel-container');
    if (!panelContainer) {
        console.error('TransformPanel: #transform-panel-container not found!');
        return;
    }
    
    // Create the inner content wrapper
    const content = document.createElement('div');
    content.id = 'transform-panel-content';
    panelContainer.appendChild(content);

    clearPanelData("Select a Mesh object to transform.");
    
    content.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('stepper-btn')) {
            const row = target.closest('.stepper-row');
            const prop = row.dataset.prop;
            const axis = row.dataset.axis;
            const step = parseFloat(target.dataset.step);
            updateObjectFromStepper(prop, axis, step);
        }
        if (target.classList.contains('stepper-value')) {
            const row = target.closest('.stepper-row');
            const prop = row.dataset.prop;
            const axis = row.dataset.axis;
            updateObjectFromPrompt(prop, axis);
        }
    });
}

/**
 * Updates all steppers from the object's current state
 */
function updateTransformPanel(object) {
    const content = panelContainer.querySelector('#transform-panel-content');
    if (!object || !content) return;
    
    content.querySelectorAll('.stepper-row').forEach(row => {
        // ... (function logic is unchanged) ...
        const prop = row.dataset.prop;
        const axis = row.dataset.axis;
        const valueEl = row.querySelector('.stepper-value');
        if (object[prop] && valueEl) {
            let value = object[prop][axis];
            let fixed = 3;
            if (prop === 'rotation') {
                value = THREE.MathUtils.radToDeg(value);
                fixed = 1;
            }
            valueEl.textContent = value.toFixed(fixed);
        }
    });
}

/**
 * Fills the panel with data from the selected object
 */
function updatePanelData(object) {
    const content = panelContainer.querySelector('#transform-panel-content');
    if (!content) return;
    
    if (!object || !object.isMesh) {
        clearPanelData("Select a Mesh object to transform.");
        return;
    }

    const createStepper = (label, prop, axis, step) => {
        return `
            <div class="stepper-row" data-prop="${prop}" data-axis="${axis}">
                <span class="stepper-label">${label}</span>
                <button class="stepper-btn" data-step="-${step}">-</button>
                <div class="stepper-value">0.000</div>
                <button class="stepper-btn" data-step="${step}">+</button>
            </div>
        `;
    };

    let html = `
        <div class="transform-header">Position</div>
        ${createStepper('X', 'position', 'x', 0.1)}
        ${createStepper('Y', 'position', 'y', 0.1)}
        ${createStepper('Z', 'position', 'z', 0.1)}

        <div class="transform-header">Rotation</div>
        ${createStepper('X', 'rotation', 'x', 1.0)}
        ${createStepper('Y', 'rotation', 'y', 1.0)}
        ${createStepper('Z', 'rotation', 'z', 1.0)}

        <div class="transform-header">Scale</div>
        ${createStepper('X', 'scale', 'x', 0.01)}
        ${createStepper('Y', 'scale', 'y', 0.01)}
        ${createStepper('Z', 'scale', 'z', 0.01)}
    `;
    
    content.innerHTML = html;
    updateTransformPanel(object);
}

/**
 * Clears the panel and shows an empty state
 */
function clearPanelData(message = "No object selected") {
    const content = panelContainer.querySelector('#transform-panel-content');
    if (!content) return;
    content.innerHTML = `
        <div class="transform-empty-state">
            ${message}
        </div>
    `;
}

// --- GONE: showPanel and hidePanel are now controlled by editorbar.js ---

/**
 * Initializes the Transform Panel module.
 */
export function initTransformPanel(app) {
    App = app;
    injectStyles();
    setTimeout(createMarkup, 100); 
    // --- GONE: No public API needed ---
    
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', () => clearPanelData("No object selected."));
    App.events.subscribe('objectTransformed', updateTransformPanel);

    console.log('Transform Panel Initialized.');
}
