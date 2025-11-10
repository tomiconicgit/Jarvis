// src/core/events.js

// This holds all the listeners
const listeners = {};

/**
 * Subscribes to an event.
 * @param {string} eventName - The name of the event (e.g., 'selectionChanged').
 * @param {function} callback - The function to call when the event is published.
 */
function subscribe(eventName, callback) {
    if (!listeners[eventName]) {
        listeners[eventName] = [];
    }
    listeners[eventName].push(callback);
}

/**
 * Publishes an event to all listeners.
 * @param {string} eventName - The name of the event to publish.
 * @param {*} data - The data to send to all listeners.
 */
function publish(eventName, data) {
    if (!listeners[eventName]) {
        return; // No one is listening
    }
    
    // Call all registered callbacks for this event
    listeners[eventName].forEach(callback => {
        try {
            callback(data);
        } catch (e) {
            console.error(`Error in event bus callback for ${eventName}:`, e);
        }
    });
}

/**
 * Initializes the event bus and attaches it to the App.
 */
export function initEventBus(App) {
    if (App.events) return; // Already initialized

    App.events = {
        subscribe: subscribe,
        publish: publish
    };
    
    console.log('Event Bus Initialized.');
}
