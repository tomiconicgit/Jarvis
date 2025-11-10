// src/core/events.js
// This module implements a simple "Event Bus" (or Pub/Sub) system.
// It allows different parts of the application to communicate with each other
// without being directly dependent on one another. This is a core
// principle of decoupled (and more maintainable) software.

// This is the private, module-level object that will store all
// registered "listeners" (or "subscribers").
// The structure will be:
// {
//   'eventName': [callback1, callback2, ...],
//   'selectionChanged': [onSelectFunction, updateGizmoFunction],
//   'selectionCleared': [onClearFunction, hideGizmoFunction]
// }
const listeners = {};

/**
 * Subscribes a callback function to a specific event.
 * When that event is published, this callback will be executed.
 *
 * @param {string} eventName - The name of the event to listen for (e.g., 'selectionChanged').
 * @param {function} callback - The function to call when the event is published.
 * This function will receive any data passed by the publisher.
 */
function subscribe(eventName, callback) {
    // 1. Check if an array for this eventName already exists.
    if (!listeners[eventName]) {
        // 2. If not, create a new empty array for it.
        listeners[eventName] = [];
    }
    // 3. Add the new callback function to the array for this event.
    listeners[eventName].push(callback);
}

/**
 * Publishes (or "broadcasts") an event to all registered listeners.
 *
 * @param {string} eventName - The name of the event to publish (e.g., 'selectionChanged').
 * @param {*} data - The data to send to all listeners. This can be any
 * data type (an object, a string, a number, etc.) that the listeners expect.
 */
function publish(eventName, data) {
    // 1. Check if anyone is actually listening to this event.
    if (!listeners[eventName]) {
        return; // No one is subscribed, so do nothing.
    }
    
    // 2. Loop through all the callback functions registered for this event.
    listeners[eventName].forEach(callback => {
        try {
            // 3. Call each callback, passing in the provided data.
            callback(data);
        } catch (e) {
            // 4. If one callback fails, log the error but *do not*
            // stop the loop. This ensures that one broken listener
            // doesn't prevent all other listeners from receiving the event.
            console.error(`Error in event bus callback for ${eventName}:`, e);
        }
    });
}

/**
 * Initializes the event bus and attaches its public methods
 * (subscribe, publish) to the main App object.
 * @param {object} App - The main application object.
 */
export function initEventBus(App) {
    // Safety check: if it's already initialized, don't do it again.
    if (App.events) return; 

    // Create the 'events' namespace on the App object.
    App.events = {
        subscribe: subscribe,
        publish: publish
    };
    
    console.log('Event Bus Initialized.');
}
