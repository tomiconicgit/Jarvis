// File: debugger.js

/**
 * A simple in-page debugger and sanity checker.
 */
export class Debugger {

  /**
   * Static method for other modules (like main.js) to log messages.
   */
  static report(message, details, context) {
    console.log(`[${context || 'App'}]: ${message}`, details || '');
  }

  constructor() {
    // Create the status element that runSanityChecks will use
    this.statusEl = document.createElement('div');
    this.statusEl.id = 'debugger-status';
    this.statusEl.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 2000;
      max-height: 200px;
      max-width: 90vw;
      overflow-y: auto;
      opacity: 0;
      transition: opacity 0.5s;
    `;
    // Wait for the body to exist before appending
    if (document.body) {
      document.body.appendChild(this.statusEl);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.statusEl);
      });
    }
  }

  /**
   * Instance method to report status to the UI panel.
   */
  report(message, details, context) {
    // Also log to console
    Debugger.report(message, details, context);
    
    if (!this.statusEl) return;
    const msg = document.createElement('div');
    msg.innerHTML = `<strong>[${context || 'Debug'}]</strong>: ${message} ${details ? `<span style="opacity: 0.7">(${details})</span>` : ''}`;
    this.statusEl.appendChild(msg);
    this.statusEl.scrollTop = this.statusEl.scrollHeight;
  }

  /**
   * Runs post-load checks for common PWA/3D setup issues.
   * (This is the function you provided)
   */
  async runSanityChecks() {
    this.statusEl.classList.add('show'); // This will make it visible
    this.statusEl.style.opacity = '1';
    
    // Helper for checks
    const check = (condition, successMsg, errorMsg, details = '') => {
      if (condition) {
        this.report(successMsg, details, 'Sanity Check');
      } else {
        this.report(errorMsg, details, 'Sanity Check');
      }
    };
    
    // Give the app 1 second to finish loading
    await new Promise(resolve => setTimeout(resolve, 1000));

    // --- NEW THREE.JS CHECK ---
    // We check if the 'three' module from the importmap can be loaded.
    try {
      await import('three');
      this.report('Three.js Module Loaded', 'import(\'three\') resolved successfully.', 'Sanity Check');
    } catch (err) {
      this.report(
        'CRITICAL: Three.js (import(\'three\')) failed to load.',
        err.message,
        'Sanity Check'
      );
    }
    // --- END NEW CHECK ---

    check(
      !!document.createElement('canvas').getContext('webgl'),
      'WebGL 1 Supported',
      'CRITICAL: WebGL 1 is not supported by this browser.'
    );

    check(
      !!document.getElementById('canvas-container'),
      '#canvas-container Found',
      'HTML Check Failed: Missing #canvas-container. App will crash.'
    );
    
    // This checks for the *final* element, not the placeholder
    check(
      !!document.getElementById('props-panel'),
      '#props-panel Found',
      'HTML Check Failed: Missing #props-panel. UI may be broken.'
    );
    
    // This checks for the *final* element, not the placeholder
    check(
      !!document.getElementById('add-panel'),
      '#add-panel Found',
      'HTML Check Failed: Missing #add-panel. UI may be broken.'
    );
    
    check(
      'serviceWorker' in navigator,
      'Service Worker API available.',
      'PWA Check: Service Worker API not available in this browser.'
    );
    
    this.statusEl.style.opacity = '0';
    setTimeout(() => this.statusEl.remove(), 300);
  }
}

// --- Self-executing part ---
// This runs because debugger.js is loaded as a module in index.html

async function runDebugger() {
  try {
    const debuggerInstance = new Debugger();
    await debuggerInstance.runSanityChecks();
  } catch (err) {
    console.error('Failed to initialize debugger:', err);
  }
}

// We must wait for the DOM to be ready to append the statusEl
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', runDebugger);
} else {
  runDebugger();
}
