// File: debugger.js (REPLACE THIS FUNCTION)

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
