// File: debugger.js
// An advanced, self-contained debugger module for your PWA.
// It injects its own UI and hooks into global error handlers.
'use strict';

/**
 * Debugger.js
 *
 * This module provides an in-app debugging UI.
 * It automatically captures:
 * 1. Global JavaScript errors (window.onerror)
 * 2. Unhandled Promise rejections (window.onunhandledrejection)
 * 3. Console errors and warnings (console.error, console.warn)
 * 4. Resource loading errors (e.g., 404 on scripts, images)
 * 5. Custom-reported errors via Debugger.report()
 */
class PWADebugger {
  constructor() {
    this.errors = [];
    this.isInitialized = false;
    this.modalEl = null;
    this.badgeEl = null;
    this.listEl = null;
    this.statusEl = null;
    this.originalConsole = {
      error: console.error,
      warn: console.warn,
    };
    
    // Auto-init on load
    // We wait for DOMContentLoaded to safely inject UI
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  /**
   * Injects all necessary HTML and CSS into the page.
   */
  injectUI() {
    // 1. Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      #debugger-badge {
        position: fixed;
        bottom: 12px;
        right: 12px;
        z-index: 9998;
        background-color: #E53E3E; /* red-600 */
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transform: scale(0);
        transition: transform 0.2s ease-out;
      }
      #debugger-badge.show {
        transform: scale(1);
      }
      #debugger-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      #debugger-modal.show {
        display: flex;
      }
      #debugger-modal-content {
        background: #1E293B; /* slate-800 */
        color: white;
        border-radius: 16px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }
      #debugger-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #334155; /* slate-700 */
      }
      #debugger-modal-header h3 {
        font-size: 1.25rem;
        font-weight: bold;
      }
      #debugger-modal-body {
        padding: 16px;
        overflow-y: auto;
        flex-grow: 1;
        font-family: monospace;
      }
      #debugger-modal-body .error-item {
        border-bottom: 1px solid #334155; /* slate-700 */
        padding-bottom: 12px;
        margin-bottom: 12px;
      }
      #debugger-modal-body .error-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      #debugger-modal-body .error-msg {
        color: #F87171; /* red-400 */
        font-weight: bold;
        font-size: 1rem;
        word-break: break-word;
      }
      #debugger-modal-body .error-detail {
        color: #CBD5E1; /* slate-300 */
        font-size: 0.875rem;
        white-space: pre-wrap;
        word-break: break-all;
      }
      #debugger-modal-body .error-source {
        font-size: 0.75rem;
        color: #94A3B8; /* slate-400 */
        margin-top: 8px;
      }
      #debugger-modal-footer {
        padding: 16px;
        border-top: 1px solid #334155; /* slate-700 */
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        background: #1E293B; /* slate-800 */
      }
      #debugger-modal-footer button {
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }
      #debugger-close-modal {
        background: #475569; /* slate-600 */
      }
      #debugger-copy-errors {
        background: #0EA5E9; /* sky-500 */
      }
      #debugger-status {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(30, 41, 59, 0.95);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        z-index: 10000;
        font-size: 1.1rem;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        display: none;
        transition: opacity 0.3s;
      }
      #debugger-status.show {
        display: block;
      }
    `;
    document.head.appendChild(style);

    // 2. Inject HTML
    const badgeHTML = `<div id="debugger-badge">0</div>`;
    const modalHTML = `
      <div id="debugger-modal">
        <div id="debugger-modal-content">
          <div id="debugger-modal-header">
            <h3>Debugger.js Error Log</h3>
          </div>
          <div id="debugger-modal-body">
            <div id="debugger-error-list"></div>
          </div>
          <div id="debugger-modal-footer">
            <button id="debugger-close-modal">Close</button>
            <button id="debugger-copy-errors">Copy to Clipboard</button>
          </div>
        </div>
      </div>
    `;
    const statusHTML = `<div id="debugger-status">Performing checks...</div>`;

    document.body.insertAdjacentHTML('beforeend', badgeHTML);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.insertAdjacentHTML('beforeend', statusHTML);

    // 3. Store references
    this.badgeEl = document.getElementById('debugger-badge');
    this.modalEl = document.getElementById('debugger-modal');
    this.listEl = document.getElementById('debugger-error-list');
    this.statusEl = document.getElementById('debugger-status');

    // 4. Attach UI Listeners
    this.badgeEl.addEventListener('click', () => this.modalEl.classList.add('show'));
    document.getElementById('debugger-close-modal').addEventListener('click', () => this.modalEl.classList.remove('show'));
    document.getElementById('debugger-copy-errors').addEventListener('click', () => this.copyErrorsToClipboard());
  }

  /**
   * Attaches to global error handlers.
   */
  attachGlobalHandlers() {
    // 1. Runtime Errors (e.g., undefined.property)
    window.onerror = (message, source, lineno, colno, error) => {
      this.report(
        `Runtime Error: ${message}`,
        error ? error.stack : 'No stack available.',
        `Source: ${source}, Line: ${lineno}, Col: ${colno}`
      );
      // Don't suppress the default browser error log
      return false;
    };

    // 2. Unhandled Promise Rejections (e.g., failed fetch)
    window.onunhandledrejection = (event) => {
      const reason = event.reason || 'Unknown rejection';
      this.report(
        `Unhandled Rejection: ${reason.message || reason}`,
        reason.stack || 'No stack available.',
        'Promise Rejection'
      );
    };

    // 3. Resource Loading Errors (e.g., 404 script/img)
    // Use capture phase to catch them before they're stopped
    window.addEventListener('error', (event) => {
      const el = event.target;
      if (el && (el.src || el.href)) {
        this.report(
          `Resource Failed to Load: ${el.tagName}`,
          `URL: ${el.src || el.href}`,
          `Source: ${event.type}`
        );
      }
    }, true);
  }

  /**
   * Overrides console.error and console.warn to capture logs.
   */
  overrideConsole() {
    console.error = (...args) => {
      this.report(
        'Console Error',
        args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
        'console.error'
      );
      this.originalConsole.error.apply(console, args);
    };

    console.warn = (...args) => {
      this.report(
        'Console Warning',
        args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
        'console.warn'
      );
      this.originalConsole.warn.apply(console, args);
    };
  }

  /**
   * Runs post-load checks for common PWA/3D setup issues.
   */
  async runSanityChecks() {
    this.statusEl.classList.add('show');
    
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

    check(
      window.THREE,
      'Three.js Loaded',
      'CRITICAL: Three.js (window.THREE) is not loaded. Check import map in index.html.'
    );

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
    
    check(
      !!document.getElementById('props-panel'),
      '#props-panel Found',
      'HTML Check Failed: Missing #props-panel. UI will be broken.'
    );
    
    check(
      !!document.getElementById('add-panel'),
      '#add-panel Found',
      'HTML Check Failed: Missing #add-panel. UI will be broken.'
    );
    
    check(
      'serviceWorker' in navigator,
      'Service Worker API available.',
      'PWA Check: Service Worker API not available in this browser.'
    );
    
    this.statusEl.style.opacity = '0';
    setTimeout(() => this.statusEl.remove(), 300);
  }

  /**
   * The main public-facing method to report a new error.
   * @param {string} message - The main error title/message.
   * @param {string} detail - The stack trace or technical detail.
   * @param {string} source - Where the error came from (e.g., 'console.error').
   */
  report(message, detail, source) {
    if (!this.isInitialized) {
      // Queue errors if UI isn't ready (e.g., errors on script load)
      if (!this.queuedErrors) this.queuedErrors = [];
      this.queuedErrors.push({ message, detail, source });
      return;
    }
    
    const error = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      detail,
      source,
    };

    this.errors.push(error);
    this.updateUI();
  }
  
  /**
   * Processes any errors that were queued before the DOM was ready.
   */
  processQueuedErrors() {
    if (this.queuedErrors && this.queuedErrors.length > 0) {
      for (const err of this.queuedErrors) {
        this.report(err.message, err.detail, err.source);
      }
      delete this.queuedErrors;
    }
  }

  /**
   * Updates the badge count and re-renders the error list.
   */
  updateUI() {
    if (!this.badgeEl || !this.listEl) return;
    
    this.badgeEl.textContent = this.errors.length;
    this.badgeEl.classList.toggle('show', this.errors.length > 0);
    
    // Re-render the list inside the modal
    this.renderErrorList();
  }

  /**
   * Clears and re-populates the modal's error list.
   */
  renderErrorList() {
    this.listEl.innerHTML = '';
    if (this.errors.length === 0) {
      this.listEl.innerHTML = '<p class="text-sm text-slate-400">No errors detected. Good job!</p>';
      return;
    }
    
    // Show most recent errors first
    const reversedErrors = [...this.errors].reverse();
    
    for (const err of reversedErrors) {
      const item = document.createElement('div');
      item.className = 'error-item';
      item.innerHTML = `
        <div class="error-msg">[${err.timestamp}] ${err.message}</div>
        <div class="error-detail">${err.detail}</div>
        <div class="error-source">Source: ${err.source}</div>
      `;
      this.listEl.appendChild(item);
    }
  }

  /**
   * Formats errors and copies them to the clipboard.
   */
  copyErrorsToClipboard() {
    let text = `[DEBUGGER.JS REPORT - ${this.errors.length} ERRORS]\n`;
    text += `Timestamp: ${new Date().toISOString()}\n`;
    text += `User Agent: ${navigator.userAgent}\n`;
    text += "--------------------------------------------------\n\n";
    
    for (const err of this.errors) {
      text += `[${err.timestamp}] ${err.message}\n`;
      text += `Source: ${err.source}\n`;
      text += `Detail:\n${err.detail}\n`;
      text += "--------------------------------------------------\n";
    }
    
    navigator.clipboard.writeText(text).then(() => {
      this.originalConsole.warn('Errors copied to clipboard!'); // Use original to avoid loop
    }).catch(err => {
      this.originalConsole.error('Failed to copy errors:', err);
    });
  }

  /**
   * Main initialization function.
   */
  init() {
    if (this.isInitialized) return;
    
    this.injectUI();
    this.attachGlobalHandlers();
    this.overrideConsole();
    this.isInitialized = true;
    
    this.processQueuedErrors();
    this.runSanityChecks();
    
    this.originalConsole.warn('Debugger.js is active.');
  }
}

// Create a single, global instance
const instance = new PWADebugger();

// Export a minimal, safe API for other modules to use
export const Debugger = {
  report: (message, detail, source = 'Manual Report') => {
    instance.report(message, detail, source);
  }
};
