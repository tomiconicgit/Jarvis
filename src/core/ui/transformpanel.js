// src/core/ui/transformpanel.js
import * as THREE from 'three';

let App;
let panelContainer;

const ARROW_ICON = `<svg class-="prop-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>`;

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

        /* Empty state style */
        .transform-empty-state {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            text-align: center;
            padding-top: 20px;
        }

        /* Using the same accordion style as properties */
        .prop-group {
            border-bottom: 1px solid var(--ui-border);
        }
        .prop-group:last-child {
            border-bottom: none;
        }
        .prop-header {
            display: flex;
            align-items: center;
            padding: 12px 8px;
            cursor: pointer;
        }
        .prop-header:active {
             background: var(--ui-light-grey);
        }
        .prop-header .prop-arrow {
            width: 16px;
            height: 16px;
            stroke: #fff;
            opacity: 0.7;
            margin-right: 6px;
            transition: transform 0.2s ease;
            padding: 4px;
            margin-left: -4px;
        }
        .prop-name {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            pointer-events: none;
        }
        .prop-content {
            overflow: hidden;
            max-height: 500px;
            transition: max-height 0.3s ease-out;
            padding: 10px 10px 16px 28px;
        }
        .prop-group.is-closed .prop-content {
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
        }
        .prop-group.is-closed .prop-arrow {
            transform: rotate(-90deg);
        }

        /* --- NEW: Styles for slider rows --- */
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
    // 'is-active' is NOT set by default

    clearPanelData("Select a Mesh object to transform."); // Set initial empty state
    toolsContent.appendChild(panelContainer);
    
    // --- ADDED: Event listener for all sliders and inputs ---
    panelContainer.addEventListener('input', (event) => {
        const target = event.target;
        if (target.classList.contains('slider-input') || target.classList.contains('slider-number')) {
            const row = target.closest('.slider-row');
            const prop = row.dataset.prop; // e.g., 'position'
            const axis = row.dataset.axis; // 'x', 'y', 'z'
            let value = parseFloat(target.value);

            if (isNaN(value)) return;

            // Sync slider and number input
            row.querySelector('.slider-input').value = value;
            row.querySelector('.slider-number').value = value;

            // Update the 3D object
            const object = App.selectionContext.getSelected();
            if (object && object[prop]) {
                if (prop === 'rotation') {
                    // Convert degrees to radians for Three.js
                    object[prop][axis] = THREE.MathUtils.degToRad(value);
                } else {
                    object[prop][axis] = value;
                }
            }
        }
    });
}

/**
 * Helper to create one slider row
 */
function createSlider(label, prop, axis, value, min, max, step) {
    return `
        <div class="slider-row" data-prop="${prop}" data-axis="${axis}">
            <span class="slider-label">${label}</span>
            <input type="range" class="slider-input" min="${min}" max="${max}" step="${step}" value="${value}">
            <input type="number" class="slider-number" min="${min}" max="${max}" step="${step}" value="${value}">
        </div>
    `;
}

/**
 * Helper to create one accordion group
 */
function createAccordion(title, content, startOpen = false) {
    return `
        <div class="prop-group ${startOpen ? '' : 'is-closed'}">
            <div class="prop-header">
                ${ARROW_ICON}
                <span class="prop-name">${title}</span>
            </div>
            <div class="prop-content">
                ${content}
            </div>
        </div>
    `;
}

/**
 * Fills the panel with data from the selected object
 */
function updatePanelData(object) {
    // --- This panel ONLY works for Mesh objects ---
    if (!object || !object.isMesh) {
        clearPanelData("Select a Mesh object to transform.");
        return;
    }

    // Get data
    const pos = object.position;
    const rot = object.rotation; // Euler (radians)
    const scl = object.scale;

    let html = '';

    // --- Position ---
    let posContent = '';
    posContent += createSlider('X', 'position', 'x', pos.x.toFixed(3), -50, 50, 0.01);
    posContent += createSlider('Y', 'position', 'y', pos.y.toFixed(3), -50, 50, 0.01);
    posContent += createSlider('Z', 'position', 'z', pos.z.toFixed(3), -50, 50, 0.01);
    html += createAccordion('Position', posContent, true); // Start open

    // --- Rotation ---
    let rotContent = '';
    rotContent += createSlider('X', 'rotation', 'x', THREE.MathUtils.radToDeg(rot.x).toFixed(1), -180, 180, 1);
    rotContent += createSlider('Y', 'rotation', 'y', THREE.MathUtils.radToDeg(rot.y).toFixed(1), -180, 180, 1);
    rotContent += createSlider('Z', 'rotation', 'z', THREE.MathUtils.radToDeg(rot.z).toFixed(1), -180, 180, 1);
    html += createAccordion('Rotation', rotContent);

    // --- Scale ---
    let sclContent = '';
    // Note: Your request for 0.000 min is problematic for sliders. Using 0.01
    sclContent += createSlider('X', 'scale', 'x', scl.x.toFixed(3), 0.010, 10.000, 0.010);
    sclContent += createSlider('Y', 'scale', 'y', scl.y.toFixed(3), 0.010, 10.000, 0.010);
    sclContent += createSlider('Z', 'scale', 'z', scl.z.toFixed(3), 0.010, 10.000, 0.010);
    html += createAccordion('Scale', sclContent);
    
    panelContainer.innerHTML = html;

    // Re-attach accordion listeners
    panelContainer.querySelectorAll('.prop-header').forEach(header => {
        header.addEventListener('click', () => {
            const group = header.closest('.prop-group');
            if (group) {
                group.classList.toggle('is-closed');
            }
        });
    });
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
    
    App.events.subscribe('selectionChanged', updatePanelData);
    App.events.subscribe('selectionCleared', () => clearPanelData("No object selected."));

    console.log('Transform Panel Initialized.');
}
