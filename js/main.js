/**
 * Main entry point for the MTG Card Viewer application.
 * Initializes the application by loading data, setting up event listeners,
 * and performing the initial render.
 */
import { loadInitialData, getFilteredCards, setInitialState } from './data.js';
import { renderCards, clearCardContainer, showLoading, hideLoading, showNoMoreCardsMessage } from './render.js';
import { setupEventListeners } from './events.js';
import { setupMenu } from './menu.js';
import { initializeObserver } from './observer.js';
import { displayError } from './utils.js'; // Import utility for error display

// --- Constants ---
const INITIAL_BATCH_SIZE = 20; // Number of cards to load initially

// --- Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    showLoading(); // Display the loading indicator

    try {
        // Set up side menu interactions
        setupMenu();

        // Load initial card data and state (favorites, ignored, quantities)
        await loadInitialData();

        // Set up event listeners (filters, sorting, buttons, swipes)
        setupEventListeners();

        // ----- START: Back to Top Button Logic -----
        const backToTopButton = document.getElementById('backToTopBtn');
        if (backToTopButton) { // Check if the button exists in the HTML

            const scrollToTop = () => {
                // DEBUGGING: Log message when function is called
                console.log('ScrollToTop function called!');
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth' // Keep smooth scrolling
                });
            };

            // Listener for click events on the button
            backToTopButton.addEventListener('click', scrollToTop);

            console.log("Back to Top button initialized (always visible).");
        } else {
            console.warn("Back to Top button element (#backToTopBtn) not found.");
        }
        // ----- END: Back to Top Button Logic -----

        // Apply default sort/filter state
        setInitialState();

        // Render the initial batch of cards
        renderCards(INITIAL_BATCH_SIZE);

        // Initialize the Intersection Observer for infinite scrolling if needed
        if (getFilteredCards().length > INITIAL_BATCH_SIZE) {
            initializeObserver();
        } else {
            showNoMoreCardsMessage();
        }

        console.log("Application initialized successfully.");
    } catch (error) {
        console.error("Error during application initialization:", error);
        displayError("Failed to initialize the application. Please try refreshing the page.", error);
        clearCardContainer(); // Clear the card display area if initialization fails
    } finally {
        hideLoading(); // Ensure the loading indicator is hidden in any case
    }
}

// Wait for the DOM to fully load before initializing the app
document.addEventListener('DOMContentLoaded', initializeApp);