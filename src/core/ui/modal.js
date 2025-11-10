// src/core/ui/modal.js
// This module creates a reusable "modal" system. It provides functions
// to show simple alerts, confirmation dialogs (OK/Cancel), and complex
// modals with custom HTML content (like forms).

let App; // Module-level reference to the main App object
let modalBackdrop; // The dark, blurry background overlay
let modalDialog; // The foreground dialog box that holds the content
let onConfirmCallback = null; // Stores the function to call when "OK" is clicked
let onCancelCallback = null; // Stores the function to call when "Cancel" is clicked

/**
 * Creates and injects the CSS styles for the modal UI.
 */
function injectStyles() {
    const styleId = 'modal-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    const css = `
        #modal-backdrop {
            position: fixed; /* Cover the entire screen */
            inset: 0; /* (top: 0, left: 0, right: 0, bottom: 0) */
            background: rgba(0,0,0,0.6); /* Semi-transparent black */
            
            /* Apply a background blur to content behind the modal */
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            
            /* Highest z-index to ensure it's on top of *everything* */
            z-index: 200; 
            
            display: flex; /* Use flex to center the dialog box */
            align-items: center;
            justify-content: center;
            
            /* --- Animation: Start hidden --- */
            opacity: 0;
            pointer-events: none; /* Not clickable when hidden */
            transition: opacity 0.2s ease;
        }
        
        #modal-backdrop.is-visible {
            /* --- Animation: Show --- */
            opacity: 1;
            pointer-events: auto; /* Clickable when visible */
        }

        #modal-dialog {
            background: var(--ui-dark-grey, #1c1c1c); /* Dark dialog background */
            border-radius: 8px; /* Rounded corners */
            box-shadow: var(--ui-shadow, 0 4px 12px rgba(0,0,0,0.15));
            width: 90%; /* Use 90% of screen width... */
            max-width: 400px; /* ...but no more than 400px wide */
            
            /* --- Animation: "Pop-in" effect --- */
            transform: scale(0.95);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            
            display: flex; /* Use flex to organize content vertically */
            flex-direction: column;
            max-height: 80vh; /* Don't let it be taller than 80% of the screen */
        }
        
        #modal-backdrop.is-visible #modal-dialog {
            transform: scale(1); /* "Pop-in" to 100% size */
        }

        .modal-title {
            font-size: 17px;
            font-weight: 600;
            text-align: center;
            padding: 16px;
            border-bottom: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
            flex-shrink: 0; /* Prevents title from shrinking */
        }

        .modal-content {
            padding: 16px;
            font-size: 14px;
            text-align: center;
            line-height: 1.4;
            overflow-y: auto; /* Make *only* the content scrollable */
            -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
        }
        
        /* --- Styles for custom forms in modals (like the export dialog) --- */
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
            box-sizing: border-box; /* Include padding/border in width */
            padding: 10px 12px;
            font-size: 14px;
            background: var(--ui-light-grey, #4a4a4c);
            border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
            border-radius: 8px;
            color: #fff;
        }
        /* --- Custom Toggle Switch --- */
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
            -webkit-tap-highlight-color: transparent; /* Remove blue flash on tap */
        }
        .modal-toggle::after { /* This is the 'knob' */
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
            background: var(--ui-blue, #007aff); /* Blue when 'on' */
        }
        .modal-toggle.is-checked::after {
            transform: translateX(20px); /* Slide the knob to the right */
        }

        /* --- Modal Action Buttons (OK/Cancel) --- */
        .modal-actions {
            display: flex;
            border-top: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
            flex-shrink: 0; /* Prevent buttons from shrinking */
        }

        .modal-btn {
            flex: 1; /* Both buttons share space equally */
            background: none;
            border: none;
            padding: 14px;
            font-size: 17px;
            cursor: pointer;
            color: var(--ui-blue, #007aff); /* Blue text */
        }
        
        .modal-btn.confirm {
            font-weight: 600; /* Make the "OK" button bold */
            /* Add a vertical separator line */
            border-left: 1px solid var(--ui-border, rgba(255, 255, 255, 0.15));
        }
        
        .modal-btn:active {
            background: var(--ui-light-grey, #4a4a4c); /* Click feedback */
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the modal shell.
 * The content is injected later by the 'show' functions.
 */
function createMarkup() {
    // 1. Create the backdrop
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'modal-backdrop';
    
    // 2. Create the dialog box
    modalDialog = document.createElement('div');
    modalDialog.id = 'modal-dialog';
    
    // 3. Put the dialog inside the backdrop, and the backdrop in the body
    modalBackdrop.appendChild(modalDialog);
    document.body.appendChild(modalBackdrop);
}

/**
 * Hides and clears the modal. This is the public 'App.modal.hide()' function.
 */
function hide() {
    // 1. Trigger the 'fade-out' CSS animation
    modalBackdrop.classList.remove('is-visible');
    
    // 2. Clean up any stored callback functions to prevent memory leaks
    onConfirmCallback = null;
    onCancelCallback = null;

    // 3. *After* the fade-out animation completes (200ms),
    // clear the dialog's HTML content.
    setTimeout(() => {
        modalDialog.innerHTML = '';
    }, 200);
}

/**
 * (Private) Shows the modal and attaches listeners.
 * This is called by the public functions (showAlert, showConfirm, etc.).
 */
function show() {
    // 1. Trigger the 'fade-in' CSS animation
    modalBackdrop.classList.add('is-visible');

    // 2. Attach click listeners for any custom toggles (.modal-toggle)
    // that were just injected as part of the modal's HTML.
    modalDialog.querySelectorAll('.modal-toggle').forEach(toggle => {
        // Don't add listeners to disabled toggles
        if (toggle.classList.contains('is-disabled')) return;
        
        toggle.addEventListener('click', () => {
            // Simply toggle the 'is-checked' class.
            // The 'getExportOptions' (in exportengine.js) function
            // will read this class to get the value.
            toggle.classList.toggle('is-checked');
        });
    });
}

/**
 * PUBLIC: Shows a simple alert message with one "OK" button.
 * @param {string} message - The message to display.
 */
function showAlert(message) {
    // 1. Inject the simple "Alert" HTML
    modalDialog.innerHTML = `
        <div class="modal-content">${message}</div>
        <div class="modal-actions">
            <button class="modal-btn confirm" id="modal-ok-btn">OK</button>
        </div>
    `;
    
    // 2. Add a listener to the "OK" button to hide the modal
    modalDialog.querySelector('#modal-ok-btn').addEventListener('click', hide);
    
    // 3. Show the modal
    show();
}

/**
 * PUBLIC: Shows a confirm dialog with "Cancel" and "Confirm" buttons.
 * @param {object} options - Configuration object.
 * @param {string} options.title - The title of the modal.
 * @param {string} options.message - The body text.
 * @param {function} options.onConfirm - Callback function if "Confirm" is clicked.
 * @param {function} [options.onCancel] - Optional callback if "Cancel" is clicked.
 * @param {string} [options.confirmText='Confirm'] - Custom text for the confirm button.
 * @param {string} [options.cancelText='Cancel'] - Custom text for the cancel button.
 */
function showConfirm({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) {
    // 1. Store the callback functions
    onConfirmCallback = onConfirm;
    onCancelCallback = onCancel;

    // 2. Inject the "Confirm" HTML
    modalDialog.innerHTML = `
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-content">${message}</div>
        <div class="modal-actions">
            <button class="modal-btn" id="modal-cancel-btn">${cancelText}</button>
            <button class="modal-btn confirm" id="modal-confirm-btn">${confirmText}</button>
        </div>
    `;

    // 3. Add listener for the "Confirm" button
    modalDialog.querySelector('#modal-confirm-btn').addEventListener('click', () => {
        if (onConfirmCallback) onConfirmCallback();
        hide(); // Always hide after click
    });

    // 4. Add listener for the "Cancel" button
    modalDialog.querySelector('#modal-cancel-btn').addEventListener('click', () => {
        if (onCancelCallback) onCancelCallback();
        hide(); // Always hide after click
    });
    
    // 5. Show the modal
    show();
}

/**
 * PUBLIC: Shows a modal with custom HTML content (e.g., a form).
 * @param {object} options - Configuration object.
 * @param {string} options.title - The title of the modal.
 * @param {string} options.html - The custom HTML string to inject.
 * @param {function} options.onConfirm - Callback function if "OK" is clicked.
 * It receives the modal's content body as an argument (for form processing).
 * @param {function} [options.onCancel] - Optional callback if "Cancel" is clicked.
 * @param {string} [options.confirmText='OK'] - Custom text for the confirm button.
 * @param {string} [options.cancelText='Cancel'] - Custom text for the cancel button.
 */
function showCustom({ title, html, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel' }) {
    // 1. Store the callback functions
    onConfirmCallback = onConfirm;
    onCancelCallback = onCancel;

    // 2. Inject the custom HTML
    modalDialog.innerHTML = `
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-content" id="modal-custom-content">
            ${html}
        </div>
        <div class="modal-actions">
            ${cancelText ? `<button class="modal-btn" id="modal-cancel-btn">${cancelText}</button>` : ''}
            <button class="modal-btn confirm" id="modal-confirm-btn">${confirmText}</button>
        </div>
    `;

    // 3. Get a reference to the injected content body
    const modalBody = modalDialog.querySelector('#modal-custom-content');

    // 4. Add listener for the "Confirm" button
    modalDialog.querySelector('#modal-confirm-btn').addEventListener('click', () => {
        // When 'onConfirm' is called, pass 'modalBody' to it.
        // This allows the caller (e.g., exportengine.js) to do:
        // onConfirm: (body) => { const val = body.querySelector('#my-input').value; }
        if (onConfirmCallback) onConfirmCallback(modalBody);
        
        // Note: We *don't* automatically hide() here. The onConfirm
        // callback is responsible for hiding the modal (e.g., App.modal.hide())
        // This allows it to do validation first.
    });

    // 5. Add listener for the "Cancel" button (if it exists)
    const cancelBtn = modalDialog.querySelector('#modal-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (onCancelCallback) onCancelCallback();
            hide(); // Always hide on cancel
        });
    }
    
    // 6. Show the modal (which also attaches toggle listeners)
    show();
}

/**
 * Initializes the modal UI.
 * @param {object} app - The main App object.
 */
export function initModal(app) {
    App = app;
    
    // 1. Create the CSS and HTML
    injectStyles();
    createMarkup();
    
    // 2. Attach the public API to the App object
    App.modal = {
        alert: showAlert,
        confirm: showConfirm,
        custom: showCustom,
        hide: hide
    };
    
    console.log('Modal UI Initialized.');
}
