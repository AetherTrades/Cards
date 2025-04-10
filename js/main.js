// Cards/js/main.js
// Main entry point for the application

// Import necessary functions from other modules
import { fetchAndProcessData } from "./data.js"; // Handles getting and preparing card data
import { setupEventListeners } from "./events.js"; // Handles setting up all UI interactions and event bindings

// Removed the import for bindSearchEvents from search.js as it's no longer needed
// import { bindSearchEvents } from "./search.js"; // <<< REMOVED THIS LINE

/**
 * Initializes the application after the DOM is fully loaded.
 */
function initializeApp() {
  console.log("🚀 Initializing MTG Card Viewer App...");
  // Setup all event listeners (including those previously in bindSearchEvents)
  setupEventListeners();
  // Removed the call to bindSearchEvents() as its functionality is now in setupEventListeners
  // bindSearchEvents();      // <<< REMOVED THIS LINE
  // Fetch data, process it, and perform the initial render
  fetchAndProcessData();
}

// Ensure the DOM is ready before running initialization logic
if (document.readyState === 'loading') {
  // If DOM is still loading, wait for the DOMContentLoaded event
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // If DOMContentLoaded has already fired, initialize immediately
  initializeApp();
}
