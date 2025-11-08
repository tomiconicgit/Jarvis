// src/core/ui/modal.js

// This file is a placeholder for a rich modal UI.
// For now, it provides a simple API that can be
// built out later without breaking the engine.

let App;

/**
 * Creates and injects the CSS styles for the modal UI.
 */
function injectStyles() {
    const styleId = 'modal-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        #modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 200;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }
        
        #modal-backdrop.is-visible {
            opacity: 1;
            pointer-events: auto;
        }

        #modal-dialog {
            background: var(--ui-grey);
            border-radius: var(--ui-corner-radius);
            box-shadow: var(--ui-shadow);
            width: 90%;
            max-width: 300px;
            transform: scale(0.95);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        #modal-backdrop.is-visible #modal-dialog {
            transform: scale(1);
        }

        .modal-title {
            font-size: 17px;
            font-weight: 600;
            text-align: center;
            padding: 16px;
            border-bottom: 1px solid var(--ui-border);
        }

        .modal-content {
            padding: 16px;
            font-size: 14px;
            text-align: center;
            line-height: 1.4;
        }
        
        .modal-input {
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            font-size: 14px;
            background: var(--ui-light-grey);
            border: 1px solid var(--ui-border);
            border-radius: 8px;
            color: #fff;
            margin-top: 8px;
        }

        .modal-actions {
            display: flex;
            border-top: 1px solid var(--ui-border);
        }

        .modal-btn {
            flex: 1;
            background: none;
            border: none;
            padding: 14px;
            font-size: 17px;
            cursor: pointer;
            color: var(--ui-blue);
        }
        
        .modal-btn.confirm {
            font-weight: 600;
            border-left: 1px solid var(--ui-border);
        }
        
        .modal-btn:active {
            background: var(--ui-light-grey);
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the modal shell.
 */
function createMarkup() {
    const modal = document.createElement('div');
    modal.id = 'modal-backdrop';
    // We will build the inner HTML dynamically
    document.body.appendChild(modal);
}

// We will implement these functions later.
// For now, the engine uses window.confirm().
function showConfirm({ title, onConfirm, onCancel }) {
    console.warn('Modal.confirm() is not yet implemented.');
    // Fallback to browser default
    if (window.confirm(title)) {
        if (onConfirm) onConfirm();
    } else {
        if (onCancel) onCancel();
    }
}

function showAlert(title) {
     console.warn('Modal.alert() is not yet implemented.');
     window.alert(title);
}

/**
 * Initializes the modal UI.
 */
export function initModal(app) {
    App = app;
    
    injectStyles();
    createMarkup();
    
    App.modal = {
        confirm: showConfirm,
        alert: showAlert
    };
    
    console.log('Modal UI Initialized.');
}
