/**
 * Manages the Intersection Observer for infinite scrolling.
 */
import { renderCards } from './render.js'; // Import render function
import { hasMoreCards } from './data.js'; // Import check for more cards

// --- DOM Elements ---
const loadingSentinel = document.getElementById('loadingSentinel');

// --- Observer Instance ---
let observer = null;
let isObserving = false;

// --- Observer Callback ---

/**
 * Callback function executed when the sentinel element's intersection changes.
 * @param {IntersectionObserverEntry[]} entries - Array of intersection entries.
 * @param {IntersectionObserver} obs - The observer instance.
 */
function handleIntersection(entries, obs) {
    entries.forEach(entry => {
        // Check if the sentinel is intersecting and there are more cards to load
        if (entry.isIntersecting && hasMoreCards()) {
            console.log("Loading sentinel visible, rendering next batch...");
            // Temporarily unobserve to prevent multiple triggers while loading
            // obs.unobserve(entry.target); // -> Let's not unobserve, renderCards handles observer state now

            renderCards(); // Load and render the next batch of cards

            // Re-observe after rendering (renderCards now handles observer logic)
            // if (hasMoreCards()) {
            //     obs.observe(entry.target);
            // }
        } else if (!hasMoreCards()) {
             // If no more cards, disconnect the observer permanently
             console.log("No more cards, disconnecting observer.");
             disconnectObserver();
        }
    });
}

// --- Public Observer Control Functions ---

/**
 * Initializes and starts the Intersection Observer.
 */
export function initializeObserver() {
    if (!loadingSentinel) {
        console.warn("Loading sentinel element not found. Infinite scroll disabled.");
        return;
    }

    if (observer) {
        observer.disconnect(); // Disconnect previous observer if any
    }

    // Create a new observer instance
    observer = new IntersectionObserver(handleIntersection, {
        root: null, // Use the viewport as the root
        rootMargin: '0px', // No margin
        threshold: 0.1 // Trigger when 10% of the sentinel is visible
    });

    // Start observing the sentinel
    observeSentinel();
     console.log("Intersection Observer initialized.");
}

/**
 * Starts observing the sentinel element.
 */
export function observeSentinel() {
    if (observer && loadingSentinel && !isObserving) {
        observer.observe(loadingSentinel);
        isObserving = true;
        console.log("Observer started observing sentinel.");
    }
}


/**
 * Stops observing the sentinel element and disconnects the observer.
 */
export function disconnectObserver() {
    if (observer) {
        observer.disconnect();
        isObserving = false;
         console.log("Intersection Observer disconnected.");
    }
     // No need to nullify observer here, initializeObserver handles recreation
}
