// src/core/joystick.js

let App;
let joystickBase;
let joystickThumb;

let isActive = false;
let touchId = null;
let radius;
let baseCenter;

/**
 * Injects the CSS for the joystick UI.
 */
function injectStyles() {
    const styleId = 'joystick-ui-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        #joystick-base {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 120px;
            height: 120px;
            background: rgba(80, 80, 80, 0.4);
            border: 2px solid rgba(120, 120, 120, 0.5);
            border-radius: 50%;
            display: none; /* Hidden by default */
            z-index: 101;
            user-select: none;
            -webkit-user-select: none;
        }
        
        #joystick-thumb {
            position: absolute;
            top: 30px;
            left: 30px;
            width: 60px;
            height: 60px;
            background: rgba(150, 150, 150, 0.7);
            border: 2px solid rgba(200, 200, 200, 0.8);
            border-radius: 50%;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            pointer-events: none;
            transition: transform 0.1s;
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup for the joystick.
 */
function createMarkup() {
    joystickBase = document.createElement('div');
    joystickBase.id = 'joystick-base';

    joystickThumb = document.createElement('div');
    joystickThumb.id = 'joystick-thumb';
    
    joystickBase.appendChild(joystickThumb);
    document.body.appendChild(joystickBase);
}

function onTouchStart(event) {
    // We no longer call preventDefault() here.
    if (touchId !== null) return; // Already tracking a touch
    
    const touch = event.changedTouches[0];
    
    // Check if the touch is on the joystick
    if (touch.target === joystickBase) {
        event.preventDefault(); // <-- NOW we prevent default
        touchId = touch.identifier;
        updateStickPosition(touch.clientX, touch.clientY);
    }
}

function onTouchMove(event) {
    if (touchId === null) return; // Not tracking

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touch.identifier === touchId) {
            event.preventDefault(); // <-- Only prevent default for *our* touch
            updateStickPosition(touch.clientX, touch.clientY);
            break;
        }
    }
}

function onTouchEnd(event) {
    if (touchId === null) return; // Not tracking

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touch.identifier === touchId) {
            event.preventDefault(); // <-- Only prevent default for *our* touch
            resetStick();
            break;
        }
    }
}

/**
 * Updates the stick position and player input vector.
 */
function updateStickPosition(x, y) {
    const rect = joystickBase.getBoundingClientRect();
    baseCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    radius = rect.width / 2;

    let deltaX = x - baseCenter.x;
    let deltaY = y - baseCenter.y;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let thumbX, thumbY;
    let inputX, inputY;

    if (distance < radius) {
        // Inside the circle
        thumbX = deltaX;
        thumbY = deltaY;
        inputX = deltaX / radius;
        inputY = deltaY / radius;
    } else {
        // Clamped to edge
        thumbX = (deltaX / distance) * radius;
        thumbY = (deltaY / distance) * radius;
        inputX = deltaX / distance;
        inputY = deltaY / distance;
    }
    
    // Update thumb UI (center of thumb is at center of base)
    joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
    
    // Update player input vector. Y is inverted (up is negative in screen coords)
    App.player.input.x = inputX;
    App.player.input.y = -inputY;
}

/**
 * Resets the stick to center.
 */
function resetStick() {
    touchId = null;
    joystickThumb.style.transform = `translate(0px, 0px)`;
    App.player.input.x = 0;
    App.player.input.y = 0;
}

/**
 * Initializes the Joystick module.
 */
export function initJoystick(app) {
    App = app;

    injectStyles();
    createMarkup();

    // Attach listeners to the document
    // The handlers themselves will now check if the target is correct
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', onTouchEnd, { passive: false });
    
    App.joystick = {
        show: () => {
            joystickBase.style.display = 'block';
            isActive = true;
        },
        hide: () => {
            joystickBase.style.display = 'none';
            isActive = false;
            resetStick();
        }
    };

    console.log('Joystick Initialized.');
}
