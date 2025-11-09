// debugger.js
const statusBar = document.getElementById('status-bar');
let errorLog = [];
let showErrorOnLoader = null; // The callback function

// --- NEW: UI Elements ---
let statusBarText;
let debuggerPanel;
let debuggerContent;
let debuggerToggleBtn;
let debuggerCloseBtn;

/**
 * Allows loading.js to register its error-display function.
 */
export function setLoaderErrorCallback(callback) {
    showErrorOnLoader = callback;
}

export function initDebugger() {
    // --- NEW: Get all new elements ---
    statusBarText = document.getElementById('status-text');
    debuggerPanel = document.getElementById('debugger-panel');
    debuggerContent = document.getElementById('debugger-content');
    debuggerToggleBtn = document.getElementById('debugger-toggle-btn');
    debuggerCloseBtn = document.getElementById('debugger-close-btn');

    if (!statusBarText || !debuggerPanel || !debuggerContent || !debuggerToggleBtn || !debuggerCloseBtn) {
        console.warn('Debugger: Failed to initialize full debug panel. UI elements missing.');
    } else {
        // --- NEW: Attach listeners ---
        debuggerToggleBtn.addEventListener('click', toggleDebugPanel);
        debuggerCloseBtn.addEventListener('click', toggleDebugPanel);
    }
    
    // --- (Original init logic below) ---
    window.onerror = (msg, url, line, col, error) => {
        const entry = `Error: ${msg} at ${url}:${line}:${col || 0}`;
        errorLog.push(entry);
        console.error('[Global Error]', entry, error || '');
        
        if (showErrorOnLoader) {
            showErrorOnLoader(entry);
            showErrorOnLoader = null; // Show the FIRST error, then stop.
        }
        updateStatus();
        renderErrorLog(); // <-- NEW: Update panel
    };

    window.addEventListener('unhandledrejection', (event) => {
        const entry = `Unhandled Rejection: ${event.reason}`;
        errorLog.push(entry);
        console.error('[Unhandled Rejection]', event.reason);

        if (showErrorOnLoader) {
            showErrorOnLoader(entry);
            showErrorOnLoader = null; // Show the FIRST error, then stop.
        }
        updateStatus();
        renderErrorLog(); // <-- NEW: Update panel
    });

    setInterval(checkPerformance, 5000);
}

export function checkForErrors(moduleName) {
    try {
        if (!moduleName) throw new Error('Invalid module name');
    } catch (error) {
        const entry = `Module ${moduleName || '(unknown)'} error: ${error.message}`;
        errorLog.push(entry);
        console.error(entry);
        
        if (showErrorOnLoader) {
            showErrorOnLoader(entry);
            showErrorOnLoader = null;
        }
        updateStatus();
        renderErrorLog(); // <-- NEW: Update panel
    }
}

function checkPerformance() {
    const now = performance.now();
    if (!Number.isFinite(now)) {
        const entry = 'Performance API anomaly detected';
        errorLog.push(entry);
        console.warn(entry);
        renderErrorLog(); // <-- NEW: Update panel
    }
    updateStatus();
}

function updateStatus() {
    // --- UPDATED: Target the new text span ---
    if (!statusBarText) return;

    if (errorLog.length > 0) {
        const last = errorLog[errorLog.length - 1];
        statusBarText.textContent = `Status: Errors detected | Debugger: ${last}`;
    } else {
        statusBarText.textContent = 'Status: Ready | Debugger: No errors';
    }
}

// ---
// --- NEW FUNCTIONS
// ---

/**
 * Toggles the visibility of the main debugger panel.
 */
function toggleDebugPanel() {
    if (!debuggerPanel || !debuggerToggleBtn) return;
    
    debuggerPanel.classList.toggle('is-open');
    const isOpen = debuggerPanel.classList.contains('is-open');
    debuggerToggleBtn.textContent = isOpen ? 'Hide Log' : 'Show Log';
    
    if(isOpen) {
        renderErrorLog(); // Re-render on open just in case
    }
}

/**
 * Renders the full error log into the debugger panel.
 */
function renderErrorLog() {
    if (!debuggerContent) return;
    
    debuggerContent.innerHTML = ''; // Clear old log
    
    if (errorLog.length === 0) {
        debuggerContent.innerHTML = '<div class="debug-entry"><span>No errors recorded.</span></div>';
        return;
    }

    // Render in reverse so newest errors are at the top
    errorLog.slice().reverse().forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'debug-entry';
        
        const text = document.createElement('span');
        text.textContent = `[${errorLog.length - index}] ${entry}`;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-error-btn';
        copyBtn.textContent = 'Copy';
        
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(entry).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            }).catch(err => {
                console.warn('Failed to copy error to clipboard:', err);
            });
        });
        
        entryDiv.appendChild(text);
        entryDiv.appendChild(copyBtn);
        debuggerContent.appendChild(entryDiv);
    });
}
