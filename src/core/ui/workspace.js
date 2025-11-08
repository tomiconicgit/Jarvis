// src/core/ui/workspace.js

/**
 * Creates and injects the CSS styles for the workspace UI.
 */
function injectStyles() {
    const styleId = 'workspace-ui-styles';
    if (document.getElementById(styleId)) return; // Styles already injected

    const css = `
        :root {
            /* Shared UI Theme */
            --ui-blue: #007aff;
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 4px 12px rgba(0,0,0,0.15);
            --ui-corner-radius: 12px;
            
            /* Local variables */
            --workspace-transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            --status-bar-height: calc(40px + env(safe-area-inset-bottom));
        }

        #workspace-container {
            position: fixed;
            bottom: var(--status-bar-height);
            left: 0;
            width: 100%;
            height: 45vh; /* 45% of the viewport height */
            
            /* --- Style Update --- */
            background: transparent; /* Container is now a holder */
            border-top: none; /* Header will have border */
            
            z-index: 5;
            display: flex;
            flex-direction: column;

            /* Animation setup */
            transform: translateX(0);
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #workspace-container.is-hidden {
            transform: translateX(-100%);
        }

        .workspace-header {
            display: flex;
            align-items: center;
            padding: 0 16px;
            height: 48px;
            flex-shrink: 0;
            
            /* --- New Blue Header Style --- */
            background: var(--ui-blue);
            color: #fff;
            
            /* Frosted glass effect */
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-bottom: 1px solid rgba(0,0,0,0.2);
        }

        .workspace-title {
            font-size: 16px;
            font-weight: 600;
            color: #fff; /* <-- Updated */
            margin: 0;
            padding: 0;
        }

        .workspace-close-btn {
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: -12px;
            margin-right: 8px;
        }
        
        .workspace-close-btn svg {
            width: 20px;
            height: 20px;
            stroke: #fff; /* <-- Updated */
            stroke-width: 2;
        }

        .workspace-content {
            flex-grow: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            
            /* --- New Grey Content Style --- */
            background: var(--ui-grey);
            color: var(--workspace-text-color, #f5f5f7);
            padding: 8px;
        }

        .workspace-item {
            padding: 12px 16px;
            color: var(--workspace-text-color, #f5f5f7);
            font-size: 14px;
            border-bottom: 1px solid var(--ui-border);
            display: flex;
            align-items: center;
        }
        
        .workspace-item:active {
            background: var(--ui-light-grey);
        }
        
        .workspace-item:last-child {
            border-bottom: none;
        }

        /* --- Open Button --- */
        #workspace-open-btn {
            position: fixed;
            left: 0;
            top: 50%; /* Center vertically */
            transform: translateY(-50%); /* Precise centering */
            
            /* --- New Blue Tab Style --- */
            background: var(--ui-blue);
            border: none;
            box-shadow: var(--ui-shadow);
            
            width: 44px;
            height: 60px;
            border-radius: 0 var(--ui-corner-radius) var(--ui-corner-radius) 0;
            
            display: grid;
            place-items: center;
            cursor: pointer;
            z-index: 4;

            /* Animation setup */
            transform: translateX(-100%) translateY(-50%); /* Start hidden */
            transition: var(--workspace-transition);
            will-change: transform;
        }

        #workspace-open-btn.is-visible {
            transform: translateX(0) translateY(-50%); /* Slide in */
        }
        
        #workspace-open-btn:active {
            background: var(--ui-blue-pressed);
        }
        
        #workspace-open-btn svg {
             width: 24px;
             height: 24px;
             stroke: #fff; /* <-- Updated */
             stroke-width: 2;
             transform: translateX(2px);
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
    // 'X' icon for close
    const closeIcon = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>`;
    
    // --- New "Three Lines" (Hamburger) Icon ---
    const openIcon = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="3" y1="12" x2="21" y2="12" stroke-linecap="round"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke-linecap="round"/>
            <line x1="3" y1="18" x2="21" y2="18" stroke-linecap="round"/>
        </svg>`;

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
    openBtn.innerHTML = openIcon; // <-- Using new icon

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
