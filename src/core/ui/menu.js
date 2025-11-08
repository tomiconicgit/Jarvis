// src/core/ui/menu.js

/**
 * Creates and injects the CSS styles for the main menu UI.
 */
function injectStyles() {
    const styleId = 'menu-ui-styles';
    if (document.getElementById(styleId)) return; // Styles already injected

    const css = `
        :root {
            /* Shared UI Theme */
            --ui-blue: #007aff;
            --ui-blue-pressed: #005ecf;
            --ui-grey: #3a3a3c;
            --ui-light-grey: #4a4a4c;
            --ui-border: rgba(255, 255, 255, 0.15);
            --ui-shadow: 0 4px 12px rgba(0,0,0,0.15);
            --ui-corner-radius: 12px;
            --ui-safe-top: env(safe-area-inset-top);
            --ui-safe-left: env(safe-area-inset-left);
        }

        /* --- Keyframe for the bounce animation --- */
        @keyframes button-bounce {
            0%   { transform: scale(1); }
            50%  { transform: scale(1.08); }
            100% { transform: scale(1); }
        }

        #menu-toggle-btn {
            position: fixed;
            top: calc(10px + var(--ui-safe-top));
            left: calc(10px + var(--ui-safe-left));
            z-index: 11;
            
            /* --- New Button Style --- */
            background: var(--ui-blue);
            color: #fff;
            font-size: 15px;
            font-weight: 600;
            padding: 10px 16px;
            
            border: none;
            border-radius: var(--ui-corner-radius);
            box-shadow: var(--ui-shadow);
            
            cursor: pointer;
            
            /* Transitions for press */
            transition: background-color 0.2s ease, transform 0.1s ease;
        }

        /* Animate the bounce */
        #menu-toggle-btn.is-bouncing {
            animation: button-bounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        /* Press-down effect */
        #menu-toggle-btn:active {
            background: var(--ui-blue-pressed);
            transform: scale(0.96);
        }

        /* Remove the old .is-open rotation */
        #menu-toggle-btn.is-open {
            transform: none; 
        }

        #menu-items-container {
            position: fixed;
            top: calc(64px + var(--ui-safe-top)); /* Position below button */
            left: calc(10px + var(--ui-safe-left));
            z-index: 10;
            
            /* --- New Dropdown Style --- */
            background: var(--ui-grey);
            border-radius: var(--ui-corner-radius);
            box-shadow: var(--ui-shadow);
            
            /* Use clip-path for a nice expand animation */
            clip-path: inset(0 0 100% 0);
            opacity: 0;
            transform: scale(0.95);
            transform-origin: top left;
            
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: none;
            overflow: hidden; /* Important for border-radius */
        }

        #menu-items-container.is-open {
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: scale(1);
            pointer-events: auto;
        }

        .menu-item {
            /* --- New Item Style --- */
            background: none;
            border: none;
            display: block;
            width: 100%;
            
            color: var(--workspace-text-color, #f5f5f7);
            font-size: 15px;
            padding: 14px 18px;
            cursor: pointer;
            text-align: left;
            min-width: 150px;
        }

        .menu-item:active {
            background: var(--ui-light-grey);
        }

        .menu-item-separator {
            height: 1px;
            background: var(--ui-border);
            margin: 0 8px;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the menu and attaches event listeners.
 */
function createMarkup() {
    
    // --- 1. Create Menu Toggle Button ---
    const menuToggleBtn = document.createElement('button');
    menuToggleBtn.id = 'menu-toggle-btn';
    menuToggleBtn.setAttribute('aria-label', 'Open Menu');
    menuToggleBtn.textContent = 'Menu'; // <-- Text instead of SVG
    
    // --- 2. Create Menu Items Container ---
    const menuItemsContainer = document.createElement('div');
    menuItemsContainer.id = 'menu-items-container';
    // --- New markup with separators ---
    menuItemsContainer.innerHTML = `
        <button class="menu-item">File...</button>
        <div class="menu-item-separator"></div>
        <button class="menu-item">Import...</button>
        <div class="menu-item-separator"></div>
        <button class="menu-item">Export...</button>
    `;

    // --- 3. Append to body ---
    document.body.appendChild(menuToggleBtn);
    document.body.appendChild(menuItemsContainer);

    // --- 4. Add Event Listeners ---
    
    const toggleMenu = (event) => {
        if (event) event.stopPropagation(); 
        
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuToggleBtn.classList.toggle('is-open', isOpen);
        menuToggleBtn.setAttribute('aria-expanded', isOpen);

        // --- Trigger bounce animation ---
        if (isOpen) {
            menuToggleBtn.classList.add('is-bouncing');
            setTimeout(() => {
                menuToggleBtn.classList.remove('is-bouncing');
            }, 300); // Animation duration
        }
    };

    const closeMenu = () => {
        if (menuItemsContainer.classList.contains('is-open')) {
            menuItemsContainer.classList.remove('is-open');
            menuToggleBtn.classList.remove('is-open');
            menuToggleBtn.setAttribute('aria-expanded', 'false');
        }
    };

    menuToggleBtn.addEventListener('click', toggleMenu);

    menuItemsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('menu-item')) {
            console.log(`Menu Item Clicked: ${event.target.textContent}`);
            closeMenu();
        }
    });

    document.addEventListener('pointerdown', (event) => {
        if (!menuToggleBtn.contains(event.target) && !menuItemsContainer.contains(event.target)) {
            closeMenu();
        }
    });
}

/**
 * Initializes the main menu UI.
 */
export function initMenu() {
    injectStyles();
    createMarkup();
    console.log('Menu UI Initialized.');
}
