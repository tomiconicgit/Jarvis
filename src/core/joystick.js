// src/core/joystick.js
// This module creates and manages the virtual on-screen joystick
// for player movement on touch devices.

let App; // Module-level reference to the main App object
let joystickBase; // The HTML element for the joystick's outer ring
let joystickThumb; // The HTML element for the joystick's inner "thumbstick"

// --- Module-level state ---
let isActive = false; // Is the joystick currently visible and active?
let touchId = null; // Stores the unique ID of the finger *currently* dragging the joystick
let radius; // The radius of the joystick base, in pixels
let baseCenter; // An object {x, y} storing the pixel coordinates of the base's center

/**
 * Injects the CSS styles for the joystick UI into the document's <head>.
 */
function injectStyles() {
    const styleId = 'joystick-ui-styles';
    // Only inject if the styles don't already exist
    if (document.getElementById(styleId)) return;

    const css = `
        #joystick-base {
            position: fixed; /* Stays in place, even if the page (hypothetically) scrolled */
            bottom: 20px; /* Position in the bottom-left corner */
            left: 20px;
            width: 120px;
            height: 120px;
            background: rgba(80, 80, 80, 0.4); /* Semi-transparent grey */
            border: 2px solid rgba(120, 120, 120, 0.5);
            border-radius: 50%; /* Makes it a perfect circle */
            display: none; /* Hidden by default */
            z-index: 101; /* Appears on top of the viewport, but below modals */
            user-select: none; /* Prevents text selection when dragging */
            -webkit-user-select: none; /* Safari compatibility */
        }
        
        #joystick-thumb {
            position: absolute; /* Positioned relative to the joystick-base */
            top: 30px; /* Centered within the 120px base ( (120 - 60) / 2 ) */
            left: 30px;
            width: 60px;
            height: 60px;
            background: rgba(150, 150, 150, 0.7);
            border: 2px solid rgba(200, 200, 200, 0.8);
            border-radius: 50%; /* Also a perfect circle */
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            pointer-events: none; /* Clicks "pass through" the thumb to the base */
            transition: transform 0.1s; /* Smoothly snaps back to center */
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

/**
 * Creates the HTML markup (the <div> elements) for the joystick.
 */
function createMarkup() {
    // Create the outer ring
    joystickBase = document.createElement('div');
    joystickBase.id = 'joystick-base';

    // Create the inner thumbstick
    joystickThumb = document.createElement('div');
    joystickThumb.id = 'joystick-thumb';
    
    // Put the thumb inside the base, and the base inside the document
    joystickBase.appendChild(joystickThumb);
    document.body.appendChild(joystickBase);
}

/**
 * Event listener for when a touch *starts*.
 * This listener is on the *document* but only acts on the joystick.
 */
function onTouchStart(event) {
    // If we are already tracking a finger on the joystick, ignore new touches
    if (touchId !== null) return; 
    
    // Get the first finger that just touched the screen
    const touch = event.changedTouches[0];
    
    // Check if the touch *started* on our joystickBase element
    if (touch.target === joystickBase) {
        // IMPORTANT: We *only* prevent default behavior (like page scrolling)
        // if the touch is on our joystick. This allows the 'look' controls
        // on the other side of the screen to manage their own preventDefault.
        event.preventDefault(); 
        
        // Store the unique ID of this finger
        touchId = touch.identifier;
        
        // Calculate the stick position immediately
        updateStickPosition(touch.clientX, touch.clientY);
    }
}

/**
 * Event listener for when a touch *moves*.
 */
function onTouchMove(event) {
    // If we aren't currently tracking a finger, exit
    if (touchId === null) return; 

    // Loop through all fingers that *moved* in this event
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        // Find the finger that matches the one we're tracking
        if (touch.identifier === touchId) {
            // This is our finger, so prevent the browser from scrolling
            event.preventDefault(); 
            
            // Update the stick position based on this finger's new coordinates
            updateStickPosition(touch.clientX, touch.clientY);
            break; // We found our finger, no need to keep looping
        }
    }
}

/**
 * Event listener for when a touch *ends* (finger is lifted).
 */
function onTouchEnd(event) {
    // If we aren't currently tracking a finger, exit
    if (touchId === null) return; 

    // Loop through all fingers that were *lifted* in this event
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        // Find the finger that matches the one we're tracking
        if (touch.identifier === touchId) {
            // This was our finger.
            event.preventDefault(); 
            
            // Reset the stick to its center position
            resetStick();
            break; // We found our finger, no need to keep looping
        }
    }
}

/**
 * This is the core logic function. It calculates the thumbstick's
 * position and updates the player's input vector.
 * @param {number} x - The clientX coordinate of the touch.
 * @param {number} y - The clientY coordinate of the touch.
 */
function updateStickPosition(x, y) {
    // 1. Get the joystick's current position and size on the screen
    // We do this here (and not just once) in case the window resizes
    const rect = joystickBase.getBoundingClientRect();
    baseCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    radius = rect.width / 2;

    // 2. Calculate the vector from the center of the base to the finger
    let deltaX = x - baseCenter.x;
    let deltaY = y - baseCenter.y;

    // 3. Calculate the straight-line distance from the center
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let thumbX, thumbY; // For visual UI
    let inputX, inputY; // For player logic

    // 4. Clamp the thumbstick's position to the edge of the base
    if (distance < radius) {
        // --- Inside the circle ---
        // The thumb visually moves to the finger's position
        thumbX = deltaX;
        thumbY = deltaY;
        // The input is normalized (a value from 0 to 1)
        inputX = deltaX / radius;
        inputY = deltaY / radius;
    } else {
        // --- Outside the circle ---
        // The thumb visually "sticks" to the edge of the circle
        thumbX = (deltaX / distance) * radius;
        thumbY = (deltaY / distance) * radius;
        // The input is clamped to a maximum of 1
        inputX = deltaX / distance;
        inputY = deltaY / distance;
    }
    
    // 5. Update the thumb's visual position using CSS transform
    // (This is much more performant than changing 'left'/'top')
    joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
    
    // 6. Update the player's input vector
    // This is what the 'player.js' module reads
    App.player.input.x = inputX;
    // Y-axis is inverted: pulling the stick *down* (positive Y)
    // should mean moving *backward* (negative input).
    App.player.input.y = -inputY; 
}

/**
 * Resets the stick to the center when the touch is released.
 */
function resetStick() {
    // Stop tracking any finger
    touchId = null;
    
    // Snap the thumbstick back to the center visually
    joystickThumb.style.transform = `translate(0px, 0px)`;
    
    // Reset the player's input to (0, 0) so they stop moving
    App.player.input.x = 0;
    App.player.input.y = 0;
}

/**
 * Initializes the Joystick module.
 * @param {object} app - The main App object.
 */
export function initJoystick(app) {
    App = app;

    // Create the HTML and CSS
    injectStyles();
    createMarkup();

    // Attach listeners to the *entire document*.
    // This allows the user to start a drag on the joystick and
    // continue dragging even if their finger slides *off* the element.
    // The handlers themselves will check if the *target* is correct.
    // { passive: false } is required to allow us to call preventDefault().
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', onTouchEnd, { passive: false }); // Fallback
    
    // Create the public 'App.joystick' namespace
    App.joystick = {
        // Called by 'testplay.js' to show the joystick
        show: () => {
            joystickBase.style.display = 'block';
            isActive = true;
        },
        // Called by 'testplay.js' to hide the joystick
        hide: () => {
            joystickBase.style.display = 'none';
            isActive = false;
            resetStick(); // Ensure stick is reset when hidden
        }
    };

    console.log('Joystick Initialized.');
}
