// src/core/ui/transformpanel.js
// This module creates the UI *content* for the "Transform" panel.
// It injects its HTML into the '#transform-panel-container'
// which was created by 'editorbar.js'. This panel provides
// precise numerical controls (steppers) for the selected
// object's position, rotation, and scale.

import * as THREE from 'three';

let App; // Module-level reference to the main App object
let panelContainer; // The '#transform-panel-container' HTML element

/**
 * Creates and injects the CSS styles for the transform panel.
 */
function injectStyles() {
    const styleId = 'transform-panel-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    const css = `
        #transform-panel-content {
            height: 100%; /* Fill the container's 25vh height */
            overflow-y: auto; /* Allow scrolling if content overflows */
            -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
        }
        
        /* Placeholder text when no object is selected */
        .transform-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding-top: 20px;
        }

        /* --- New styles based on propertiespanel.js --- */
        
        /* A list of transform controls */
        .transform-list {
            padding: 0;
        }

        /* A single row (e.g., "Position X") */
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
        
        /* The "Position X" label */
        .transform-label {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            flex-shrink: 0;
            padding-right: 10px;
        }

        /* The container for the [ - ] [ 0.00 ] [ + ] controls */
        .stepper-container {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-grow: 1;
        }

        /* The [ - ] and [ + ] buttons */
        .stepper-btn {
            background: none;
            border: none;
            color: var(--ui-blue); /* Blue, to show they are interactive */
            font-size: 24px;
            line-height: 24px;
            font-weight: 600;
            width: 32px;
            height: 32px;
            border-radius: 50%; /* Circular click target */
            cursor: pointer;
            opacity: 0.8;
        }
        .stepper-btn:active {
            background: var(--ui-light-grey); /* Click feedback */
            opacity: 1.0;
        }
        
        /* The [ 0.00 ] value box */
        .stepper-value {
            width: 80px; /* Fixed width for consistent layout */
            background: var(--ui-dark-grey); /* Darker background */
            color: #fff;
            border: 1px solid var(--ui-border);
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 14px;
            text-align: center;
            margin: 0 8px;
            cursor: pointer; /* Indicates it can be clicked to type */
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Updates the 3D object when a '+' or '-' stepper button is clicked.
 * @param {string} prop - The property to change ('position', 'rotation', 'scale').
 * @param {string} axis - The axis ('x', 'y', 'z').
 * @param {number} step - The amount to add/subtract (e.g., 0.1 or -1.0).
 */
function updateObjectFromStepper(prop, axis, step) {
    const object = App.selectionContext.getSelected();
    if (!object || !object[prop]) return;

    let value = object[prop][axis];
    
    // --- Special case for rotation ---
    // The UI shows degrees (e.g., 90°), but Three.js
    // stores rotation in radians (e.g., 1.57).
    if (prop === 'rotation') {
        value = THREE.MathUtils.radToDeg(value); // Convert from rads to degrees
        value += step; // Add the step (which is in degrees)
        object[prop][axis] = THREE.MathUtils.degToRad(value); // Convert back to rads
    } else {
        // --- Standard case (position, scale) ---
        value += step;
        object[prop][axis] = value;
    }
    
    // Update the stepper value text in the UI
    updateTransformPanel(object);
    
    // Notify the gizmo that the object has moved
    App.gizmo.update();
}

/**
 * Updates the 3D object when the user clicks the value box
 * and types in a new number.
 * @param {string} prop - The property to change ('position', 'rotation', 'scale').
 * @param {string} axis - The axis ('x', 'y', 'z').
 */
function updateObjectFromPrompt(prop, axis) {
    const object = App.selectionContext.getSelected();
    if (!object || !object[prop]) return;

    // Get the current value, converting rotation to degrees for the prompt
    let currentValue = object[prop][axis];
    if (prop === 'rotation') {
        currentValue = THREE.MathUtils.radToDeg(currentValue);
    }
    
    // Show a native browser prompt
    const newValueStr = window.prompt(`Enter new value for ${prop} ${axis.toUpperCase()}:`, currentValue.toFixed(3));
    if (newValueStr === null) return; // User cancelled

    // Parse the user's input
    let newValue = parseFloat(newValueStr);
    if (isNaN(newValue)) {
        App.modal.alert("Invalid input. Please enter a number.");
        return;
    }

    // Convert back to radians if it was a rotation
    if (prop === 'rotation') {
        newValue = THREE.MathUtils.degToRad(newValue);
    }
    
    // Set the new value on the 3D object
    object[prop][axis] = newValue;
    
    // Update the stepper value text in the UI
    updateTransformPanel(object);
    
    // Notify the gizmo
    App.gizmo.update();
}


/**
 * Creates the HTML markup for the transform panel.
 */
function createMarkup() {
    // 1. Find the panel container that 'editorbar.js' created.
    panelContainer = document.getElementById('transform-panel-container');
    if (!panelContainer) {
        console.error('TransformPanel: #transform-panel-container not found!');
        return;
    }
    
    // 2. Create the content wrapper div
    const content = document.createElement('div');
    content.id = 'transform-panel-content';
    
    // 3. Add this content div *inside* the panel container
    panelContainer.appendChild(content);

    // 4. Show the initial empty state
    clearPanelData("Select a Mesh object to transform.");
    
    // 5. Add an event listener to the content div (event delegation)
    content.addEventListener('click', (event) => {
        const target = event.target; // The specific element clicked
        
        // Find the parent row
        const item = target.closest('.transform-item');
        if (!item) return; // Clicked in a gap

        // Get the row's data
        const prop = item.dataset.prop; // 'position', 'rotation', 'scale'
        const axis = item.dataset.axis; // 'x', 'y', 'z'

        // Case 1: Clicked a [ - ] or [ + ] button
        if (target.classList.contains('stepper-btn')) {
            const step = parseFloat(target.dataset.step);
            updateObjectFromStepper(prop, axis, step);
        }
        
        // Case 2: Clicked the [ 0.00 ] value box
        if (target.classList.contains('stepper-value')) {
            updateObjectFromPrompt(prop, axis);
        }
    });
}

/**
 * Updates all stepper value boxes from the object's current state.
 * This is called by the 'objectTransformed' event (e.g., when
 * the gizmo is dragged).
 * @param {THREE.Object3D} object - The object being transformed.
 */
function updateTransformPanel(object) {
    const content = panelContainer.querySelector('#transform-panel-content');
    if (!object || !content) return;
    
    // Find all rows
    content.querySelectorAll('.transform-item').forEach(row => {
        const prop = row.dataset.prop;
        const axis = row.dataset.axis;
        const valueEl = row.querySelector('.stepper-value'); // The [ 0.00 ] box
        
        if (object[prop] && valueEl) {
            let value = object[prop][axis];
            let fixed = 3; // Number of decimal places to show
            
            // Convert rotation to degrees for display
            if (prop === 'rotation') {
                value = THREE.MathUtils.radToDeg(value);
                fixed = 1; // Only show 1 decimal for degrees
            }
            
            // Update the text content of the value box
            valueEl.textContent = value.toFixed(fixed);
        }
    });
}

/**
 * (Re)builds the panel's HTML when a new object is selected.
 * This is called by the 'selectionChanged' event.
 * @param {THREE.Object3D} object - The object that was just selected.
 */
function updatePanelData(object) {
    const content = panelContainer.querySelector('#transform-panel-content');
    if (!content) return;
    
    // Don't show this panel for objects that can't be transformed (e.g., lights)
    // NOTE: This logic should be improved to support more object types.
    if (!object || !object.isMesh) {
        clearPanelData("Select a Mesh object to transform.");
        return;
    }

    // --- Helper function to create one stepper row ---
    const createStepper = (label, prop, axis, step) => {
        const stepStr = step.toString(); // e.g., '0.1'
        
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

    // --- Build the full HTML for the panel ---
    let html = '<div class="transform-list">';
    html += createStepper('Position X', 'position', 'x', 0.1);
    html += createStepper('Position Y', 'position', 'y', 0.1);
    html += createStepper('Position Z', 'position', 'z', 0.1);
    html += createStepper('Rotation X', 'rotation', 'x', 1.0); // Step by 1 degree
    html += createStepper('Rotation Y', 'rotation', 'y', 1.0);
    html += createStepper('Rotation Z', 'rotation', 'z', 1.0);
    html += createStepper('Scale X', 'scale', 'x', 0.01);
    html += createStepper('Scale Y', 'scale', 'y', 0.01);
    html += createStepper('Scale Z', 'scale', 'z', 0.01);
    html += '</div>';
    
    // Inject the new HTML
    content.innerHTML = html;
    
    // Populate the new HTML with the object's current values
    updateTransformPanel(object);
}

/**
 * Clears the panel and shows an empty state.
 * @param {string} [message="No object selected"] - The message to display.
 */
function clearPanelData(message = "No object selected") {
    const content = panelContainer.querySelector('#transform-panel-content');
    if (!content) {
        // If the content div doesn't exist yet (on init),
        // try again in a moment.
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
 * @param {object} app - The main App object.
 */
export function initTransformPanel(app) {
    App = app;

    injectStyles();
    // Use setTimeout to ensure editorbar.js has created the container
    setTimeout(createMarkup, 100); 
    
    // --- Subscribe to Events ---
    // When a new object is selected, build the panel for it
    App.events.subscribe('selectionChanged', updatePanelData);
    
    // When selection is cleared, empty the panel
    App.events.subscribe('selectionCleared', () => clearPanelData("No object selected."));
    
    // When the gizmo is dragged, update the text values in real-time
    App.events.subscribe('objectTransformed', updateTransformPanel);

    console.log('Transform Panel Initialized.');
}
