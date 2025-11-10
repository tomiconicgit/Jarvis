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
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            /* Padding is no longer needed here */
        }
        
        .transform-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding-top: 20px;
        }

        /* --- REMOVED: .transform-header --- */

        /* --- NEW: Styles based on propertiespanel.js --- */
        .transform-list {
            padding: 0;
        }

        .transform-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            font-size: 14px;
            border-bottom: 1px solid var(--ui-border);
        }
        
        .transform-list:last-child {
            border-bottom: none;
        }
        
        .transform-label {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            flex-shrink: 0;
            padding-right: 10px;
        }

        .stepper-container {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-grow: 1;
        }

        .stepper-btn {
            /* --- UPDATED: No background/border --- */
            background: none;
            border: none;
            color: var(--ui-blue); /* Make them blue like links */
            font-size: 24px;
            line-height: 24px;
            font-weight: 600;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            opacity: 0.8;
        }
        .stepper-btn:active {
            background: var(--ui-light-grey);
            opacity: 1.0;
        }
        
        .stepper-value {
            width: 80px; /* Give it a fixed width */
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

/**
 * Updates the 3D object from a stepper action
 */
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

/**
 * Updates the 3D object from a prompt
 */
function updateObjectFromPrompt(prop, axis) {
    const object = App.selectionContext.getSelected();
    if (!object || !object[prop]) return;

    let currentValue = object[prop][axis];
    if (prop === 'rotation') {
        currentValue = THREE.MathUtils.radToDeg(currentValue);
    }
    
    const newValueStr = window.prompt(`Enter new value for ${prop} ${axis.toUpperCase()}:`, currentValue.toFixed(3));
    if (newValueStr === null) return; // User cancelled

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
    panelContainer = document.getElementById('transform-panel-container');
    if (!panelContainer) {
        console.error('TransformPanel: #transform-panel-container not found!');
        return;
    }
    
    const content = document.createElement('div');
    content.id = 'transform-panel-content';
    panelContainer.appendChild(content);

    clearPanelData("Select a Mesh object to transform.");
    
    // --- UPDATED: Event listener targets ---
    content.addEventListener('click', (event) => {
        const target = event.target;
        const item = target.closest('.transform-item');
        if (!item) return;

        const prop = item.dataset.prop;
        const axis = item.dataset.axis;

        if (target.classList.contains('stepper-btn')) {
            const step = parseFloat(target.dataset.step);
            updateObjectFromStepper(prop, axis, step);
        }
        
        if (target.classList.contains('stepper-value')) {
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
    
    content.querySelectorAll('.transform-item').forEach(row => {
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

    // --- NEW: Helper to create one stepper row ---
    const createStepper = (label, prop, axis, step) => {
        const stepStr = step.toString(); 
        
        return `
            <div class="transform-item" data-prop="${prop}" data-axis="${axis}">
                <span class="transform-label">${label}</span>
                <div class="stepper-container">
                    <button class="stepper-btn" data-step="-${stepStr}">-</button>
                    <div class="stepper-value">0.000</div>
                    <button class="stepper-btn" data-step="${stepStr}">+</button>
                </div>
            </div>
        `;
    };

    // --- UPDATED: Build a single list ---
    let html = '<div class="transform-list">';
    html += createStepper('Position X', 'position', 'x', 0.1);
    html += createStepper('Position Y', 'position', 'y', 0.1);
    html += createStepper('Position Z', 'position', 'z', 0.1);
    html += createStepper('Rotation X', 'rotation', 'x', 1.0);
    html += createStepper('Rotation Y', 'rotation', 'y', 1.0);
    html += createStepper('Rotation Z', 'rotation', 'z', 1.0);
    html += createStepper('Scale X', 'scale', 'x', 0.01);
    html += createStepper('Scale Y', 'scale', 'y', 0.01);
    html += createStepper('Scale Z', 'scale', 'z', 0.01);
    html += '</div>';
    
    content.innerHTML = html;
    
    updateTransformPanel(object);
}

/**
 * Clears the panel and shows an empty state
 */
function clearPanelData(message = "No object selected") {
    const content = panelContainer.querySelector('#transform-panel-content');
    if (!content) {
        setTimeout(() => clearPanelData(message), 50);
        return;
    }
    content.innerHTML = `
        <div class="transform-empty-state">
            ${message}
        </div>
    `;
}

/**
 * Initializes the Transform Panel module.
 */
export function initTransformPanel(app) {
    App = app;

    injectStyles();
    setTimeout(createMarkup, 100); 
    
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', () => clearPanelData("No object selected."));
    App.events.subscribe('objectTransformed', updateTransformPanel);

    console.log('Transform Panel Initialized.');
}
