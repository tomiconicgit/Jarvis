// src/core/ui/workspace.js

/**
 * Creates and injects the CSS styles for the workspace UI.
 * This keeps the module self-contained.
 */
function injectStyles() {
    const styleId = 'workspace-ui-styles';
    if (document.getElementById(styleId)) return; // Styles already injected

    // CSS Variables for easy theming
    const css = `
        :root {
            --workspace-bg: rgba(28, 28, 30, 0.85);
            --workspace-header-bg: rgba(44, 44, 46, 0.9);
            --workspace-content-bg: rgba(20, 20, 20, 0.7);
            --workspace-border-color: rgba(255, 255, 255, 0.1);
            --workspace-text-color: #f5f5f7;
            --workspace-icon-color: #888;
            --workspace-transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            
            /* Get the height of the status bar (which now includes safe-area) */
            --status-bar-height: calc(40px + env(safe-area-inset-bottom));
        }

        #workspace-container {
            position: fixed;
            bottom: var(--status-bar-height);
            left: 0;
            width: 100%;
            height: 45vh; /* 45% of the viewport height */
            background: var(--workspace-bg);
            
            /* iOS frosted glass effect */
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            
            border-top: 1px solid var(--workspace-border-color);
            z-index: 5;
            
            display: flex;
            flex-direction: column;

            /* Animation setup */
            transform: translateX(0);
            transition: var(--workspace-transition);
            will-change: transform; /* Performance hint */
        }

        #workspace-container.is-hidden {
            transform: translateX(-100%);
        }

        .workspace-header {
            display: flex;
            align-items: center;
            padding: 0 16px;
            height: 48px;
            background: var(--workspace-header-bg);
            border-bottom: 1px solid var(--workspace-border-color);
            flex-shrink: 0;
        }

        .workspace-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--workspace-text-color);
            margin: 0;
            padding: 0;
        }

        .workspace-close-btn {
            /* Generous tap target */
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: -12px; /* Align icon better */
            margin-right: 8px;
        }
        
        .workspace-close-btn svg {
            width: 20px;
            height: 20px;
            stroke: var(--workspace-text-color);
            stroke-width: 2;
        }

        .workspace-content {
            flex-grow: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
            background: var(--workspace-content-bg);
            padding: 8px;
        }

        /* Styling for list items (example) */
        .workspace-item {
            padding: 12px 16px;
            color: var(--workspace-text-color);
            font-size: 14px;
            border-bottom: 1px solid var(--workspace-border-color);
            display: flex;
            align-items: center;
        }
        .workspace-item:last-child {
            border-bottom: none;
        }

        /* --- Open Button --- */
        #workspace-open-btn {
            position: fixed;
            left: 0;
            top: 50%; /* Center vertically */
            
            /* Button styling */
            background: var(--workspace-header-bg);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            
            border: 1px solid var(--workspace-border-color);
            border-left: none;
            width: 44px;
            height: 60px;
            border-radius: 0 12px 12px 0;
            
            display: grid;
            place-items: center;
            cursor: pointer;
            z-index: 4;

            /* Animation setup */
            transform: translateX(-100%); /* Start hidden */
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #workspace-open-btn.is-visible {
            transform: translateX(0); /* Slide in */
        }
        
        #workspace-open-btn svg {
             width: 24px;
             height: 24px;
             stroke: var(--workspace-text-color);
             stroke-width: 1.5;
             transform: translateX(2px); /* Center icon visually */
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the workspace and attaches event listeners.
 */
function createMarkup() {
    // --- Icons (Inline SVG for performance and easy styling) ---
    // 'X' icon for close
    const closeIcon = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>`;
    
    // 'Layers' icon for open (fits 'workspace' theme)
    const openIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
        </svg>`;

    // --- Create Elements ---

    // 1. Main Container
    const container = document.createElement('div');
    container.id = 'workspace-container';
    container.innerHTML = `
        <div class="workspace-header">
            <button class="workspace-close-btn" aria-label="Close Workspace">
                ${closeIcon}
            </button>
            <h2 class="workspace-title">Workspace</h2>
        </div>
        <div class="workspace-content">
            <div class="workspace-item">SceneCamera</div>
            <div class="workspace-item">DirectionalLight</div>
            <div class="workspace-item">terrain_mesh</div>
            <div class="workspace-item">player_model</div>
            <div class="workspace-item">skybox</div>
        </div>
    `;

    // 2. Open Button
    const openBtn = document.createElement('button');
    openBtn.id = 'workspace-open-btn';
    openBtn.setAttribute('aria-label', 'Open Workspace');
    openBtn.innerHTML = openIcon;

    // 3. Append to body
    document.body.appendChild(container);
    document.body.appendChild(openBtn);

    // --- Add Event Listeners ---
    const closeBtn = container.querySelector('.workspace-close-btn');

    const closeWorkspace = () => {
        container.classList.add('is-hidden');
        openBtn.classList.add('is-visible');
    };

    const openWorkspace = () => {
        container.classList.remove('is-hidden');
        openBtn.classList.remove('is-visible');
    };

    closeBtn.addEventListener('click', closeWorkspace);
    openBtn.addEventListener('click', openWorkspace);
}

/**
 * Initializes the workspace UI by injecting styles and creating markup.
 */
export function initWorkspace() {
    injectStyles();
    createMarkup();
    console.log('Workspace UI Initialized.');
}
