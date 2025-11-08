// src/core/ui/menu.js

/**
 * Creates and injects the CSS styles for the main menu UI.
 */
function injectStyles() {
    const styleId = 'menu-ui-styles';
    if (document.getElementById(styleId)) return; // Styles already injected

    const css = `
        :root {
            /* Define new variables, but default to workspace vars */
            --menu-bg: var(--workspace-header-bg, rgba(44, 44, 46, 0.9));
            --menu-border: var(--workspace-border-color, rgba(255, 255, 255, 0.1));
            --menu-text: var(--workspace-text-color, #f5f5f7);
            --menu-btn-width: 60px;
            --menu-btn-height: 44px;
            --menu-safe-top: env(safe-area-inset-top);
            --menu-safe-left: env(safe-area-inset-left);
        }

        #menu-toggle-btn {
            position: fixed;
            top: 0;
            left: 0;
            
            /* --- UPDATED STYLES --- */
            /* Match the workspace button's tab-like design */
            width: var(--menu-btn-width);
            height: var(--menu-btn-height);
            border-radius: 0 0 12px 0; /* Rounded bottom-right corner */
            
            background: var(--menu-bg);
            border: 1px solid var(--menu-border);
            border-top: none; /* Flush with top */
            border-left: none; /* Flush with left */
            
            /* Add padding for safe areas INSTEAD of using calc() */
            padding-top: var(--menu-safe-top);
            padding-left: var(--menu-safe-left);
            box-sizing: border-box;
            /* --- END UPDATED STYLES --- */
            
            z-index: 11; /* Higher than status bar */
            cursor: pointer;

            display: grid;
            place-items: center;

            /* iOS frosted glass effect */
            backdrop-filter: blur(10px) saturate(180%);
            -webkit-backdrop-filter: blur(10px) saturate(180%);

            /* Animate the icon change */
            transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }

        #menu-toggle-btn.is-open {
            /* Slight rotate animation when open */
            transform: rotate(90deg);
        }

        #menu-toggle-btn svg {
            width: 24px;
            height: 24px;
            stroke: var(--menu-text);
            stroke-width: 2;
            stroke-linecap: round;
        }

        #menu-items-container {
            position: fixed;
            
            /* --- UPDATED POSITION --- */
            /* Position below the new button (height + safe-area + 8px margin) */
            top: calc(var(--menu-btn-height) + var(--menu-safe-top) + 8px); 
            left: calc(10px + var(--menu-safe-left));
            /* --- END UPDATED POSITION --- */
            
            z-index: 10;
            display: flex;
            flex-direction: column;

            /* Animation: Start hidden */
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        #menu-items-container.is-open {
            /* Animation: Show */
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        .menu-item {
            background: var(--menu-bg);
            border: 1px solid var(--menu-border);
            backdrop-filter: blur(10px) saturate(180%);
            -webkit-backdrop-filter: blur(10px) saturate(180%);
            
            color: var(--menu-text);
            font-size: 14px;
            font-weight: 500;
            padding: 10px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            text-align: left;
            min-width: 120px;

            /* Staggered animation setup */
            opacity: 0;
            transform: translateY(-5px);
            transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* --- Beautiful Staggered Animation --- */
        #menu-items-container.is-open .menu-item {
            opacity: 1;
            transform: translateY(0);
        }

        #menu-items-container.is-open .menu-item:nth-child(1) {
            transition-delay: 0.05s;
        }
        #menu-items-container.is-open .menu-item:nth-child(2) {
            transition-delay: 0.1s;
        }
        #menu-items-container.is-open .menu-item:nth-child(3) {
            transition-delay: 0.15s;
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
    // --- Icon (Inline SVG) ---
    // A "hamburger" icon
    const menuIcon = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>`;

    // --- 1. Create Menu Toggle Button ---
    const menuToggleBtn = document.createElement('button');
    menuToggleBtn.id = 'menu-toggle-btn';
    menuToggleBtn.setAttribute('aria-label', 'Open Menu');
    menuToggleBtn.innerHTML = menuIcon;
    
    // --- 2. Create Menu Items Container ---
    const menuItemsContainer = document.createElement('div');
    menuItemsContainer.id = 'menu-items-container';
    menuItemsContainer.innerHTML = `
        <button class="menu-item">File...</button>
        <button class="menu-item">Import...</button>
        <button class="menu-item">Export...</button>
    `;

    // --- 3. Append to body ---
    document.body.appendChild(menuToggleBtn);
    document.body.appendChild(menuItemsContainer);

    // --- 4. Add Event Listeners ---
    
    // Toggle function
    const toggleMenu = (event) => {
        // Stop the click from bubbling up to the 'document' listener
        if (event) event.stopPropagation(); 
        
        const isOpen = menuItemsContainer.classList.toggle('is-open');
        menuToggleBtn.classList.toggle('is-open', isOpen);
        menuToggleBtn.setAttribute('aria-expanded', isOpen);
    };

    // Close function
    const closeMenu = () => {
        if (menuItemsContainer.classList.contains('is-open')) {
            menuItemsContainer.classList.remove('is-open');
            menuToggleBtn.classList.remove('is-open');
            menuToggleBtn.setAttribute('aria-expanded', 'false');
        }
    };

    // Listen for toggle button click
    menuToggleBtn.addEventListener('click', toggleMenu);

    // Listen for clicks on the menu items themselves (to perform actions)
    menuItemsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('menu-item')) {
            console.log(`Menu Item Clicked: ${event.target.textContent}`);
            // You can add logic here like:
            // if (event.target.textContent === 'Import...') { importFile(); }
            
            // Close the menu after clicking an item
            closeMenu();
        }
    });

    // Professional "click-outside-to-close" behavior
    // Use 'pointerdown' for faster touch response than 'click'
    document.addEventListener('pointerdown', (event) => {
        // Close if the click is not on the toggle button AND not on the menu container
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
