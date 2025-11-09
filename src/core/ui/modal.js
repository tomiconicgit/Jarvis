// src/core/ui/modal.js

let App;
let modalBackdrop;
let modalDialog;
let onConfirmCallback = null;
let onCancelCallback = null;

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
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
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
            background: var(--ui-grey, #3a3a3c);
            border-radius: var(--ui-corner-radius, 12px);
            box-shadow: var(--ui-shadow, 0 4px 12px rgba(0,0,0,0.15));
            width: 90%;
            max-width: 400px;
            transform: scale(0.95);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            flex-direction: column;
            max-height: 80vh; /* Allow scrolling */
        }
        
        #modal-backdrop.is-visible #modal-dialog {
            transform: scale(1);
        }

        .modal-title {
            font-size: 17px;
            font-weight: 600;
            text-align: center;
            padding: 16px;
            border-bottom: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
            flex-shrink: 0;
        }

        .modal-content {
            padding: 16px;
            font-size: 14px;
            text-align: center;
            line-height: 1.4;
            overflow-y: auto; /* Enable scrolling for content */
            -webkit-overflow-scrolling: touch;
        }
        
        /* Styles for custom forms in modals */
        .modal-form-group {
            text-align: left;
            margin-bottom: 14px;
        }
        .modal-form-group label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 6px;
            color: rgba(255,255,255,0.8);
        }
        .modal-input, .modal-select {
            width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            font-size: 14px;
            background: var(--ui-light-grey, #4a4a4c);
            border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
            border-radius: 8px;
            color: #fff;
        }
        .modal-toggle-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
        }
        .modal-toggle-group:last-child {
            border-bottom: none;
        }
        .modal-toggle-group label {
            font-size: 14px;
            font-weight: 500;
        }
        .modal-toggle-group label small {
            display: block;
            font-weight: 400;
            color: rgba(255,255,255,0.6);
        }
        .modal-toggle {
            position: relative;
            width: 44px;
            height: 24px;
            background: var(--ui-light-grey, #4a4a4c);
            border-radius: 12px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }
        .modal-toggle::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: #fff;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        .modal-toggle.is-disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .modal-toggle.is-checked {
            background: var(--ui-blue, #007aff);
        }
        .modal-toggle.is-checked::after {
            transform: translateX(20px);
        }

        .modal-actions {
            display: flex;
            border-top: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
            flex-shrink: 0;
        }

        .modal-btn {
            flex: 1;
            background: none;
            border: none;
            padding: 14px;
            font-size: 17px;
            cursor: pointer;
            color: var(--ui-blue, #007aff);
        }
        
        .modal-btn.confirm {
            font-weight: 600;
            border-left: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
        }
        
        .modal-btn:active {
            background: var(--ui-light-grey, #4a4a4c);
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
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'modal-backdrop';
    
    modalDialog = document.createElement('div');
    modalDialog.id = 'modal-dialog';
    
    modalBackdrop.appendChild(modalDialog);
    document.body.appendChild(modalBackdrop);
}

/**
 * Hides and clears the modal.
 */
function hide() {
    modalBackdrop.classList.remove('is-visible');
    
    // Clean up callbacks
    onConfirmCallback = null;
    onCancelCallback = null;

    // Clear content after animation
    setTimeout(() => {
        modalDialog.innerHTML = '';
    }, 200);
}

/**
 * Shows the modal with specific content.
 */
function show() {
    modalBackdrop.classList.add('is-visible');

    // Attach toggle listeners
    modalDialog.querySelectorAll('.modal-toggle').forEach(toggle => {
        if (toggle.classList.contains('is-disabled')) return;
        
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('is-checked');
        });
    });
}

/**
 * Shows a simple alert message.
 * @param {string} message
 */
function showAlert(message) {
    modalDialog.innerHTML = `
        <div class="modal-content">${message}</div>
        <div class="modal-actions">
            <button class="modal-btn confirm" id="modal-ok-btn">OK</button>
        </div>
    `;
    
    modalDialog.querySelector('#modal-ok-btn').addEventListener('click', hide);
    show();
}

/**
 * Shows a confirm dialog.
 * @param {object} options - { title, message, onConfirm, onCancel, confirmText, cancelText }
 */
function showConfirm({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) {
    onConfirmCallback = onConfirm;
    onCancelCallback = onCancel;

    modalDialog.innerHTML = `
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-content">${message}</div>
        <div class="modal-actions">
            <button class="modal-btn" id="modal-cancel-btn">${cancelText}</button>
            <button class="modal-btn confirm" id="modal-confirm-btn">${confirmText}</button>
        </div>
    `;

    modalDialog.querySelector('#modal-confirm-btn').addEventListener('click', () => {
        if (onConfirmCallback) onConfirmCallback();
        hide();
    });

    modalDialog.querySelector('#modal-cancel-btn').addEventListener('click', () => {
        if (onCancelCallback) onCancelCallback();
        hide();
    });
    
    show();
}

/**
 * Shows a modal with custom HTML content.
 * @param {object} options - { title, html, onConfirm, onCancel, confirmText, cancelText }
 */
function showCustom({ title, html, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel' }) {
    onConfirmCallback = onConfirm;
    onCancelCallback = onCancel;

    modalDialog.innerHTML = `
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-content" id="modal-custom-content">
            ${html}
        </div>
        <div class="modal-actions">
            <button class="modal-btn" id="modal-cancel-btn">${cancelText}</button>
            <button class="modal-btn confirm" id="modal-confirm-btn">${confirmText}</button>
        </div>
    `;

    const modalBody = modalDialog.querySelector('#modal-custom-content');

    modalDialog.querySelector('#modal-confirm-btn').addEventListener('click', () => {
        // Pass the modal body to the callback so it can read form values
        if (onConfirmCallback) onConfirmCallback(modalBody);
        // We don't auto-hide here; the callback is responsible
        // for hiding if validation passes.
    });

    modalDialog.querySelector('#modal-cancel-btn').addEventListener('click', () => {
        if (onCancelCallback) onCancelCallback();
        hide();
    });
    
    show();
}

/**
 * Initializes the modal UI.
 */
export function initModal(app) {
    App = app;
    
    injectStyles();
    createMarkup();
    
    // Replace the old placeholder API with the new one
    App.modal = {
        alert: showAlert,
        confirm: showConfirm,
        custom: showCustom,
        hide: hide // Expose hide for callbacks
    };
    
    console.log('Modal UI Initialized.');
}
