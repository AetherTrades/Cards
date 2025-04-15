/**
 * Utility functions for the MTG Card Viewer application,
 * including error display, info messages, and debouncing.
 */

// --- DOM Elements ---
const errorMessageElement = document.getElementById('errorMessage');
let errorTimeout = null; // Timeout ID for hiding error messages

// --- Functions ---

/**
 * Displays an error message to the user.
 * @param {string} message - The user-friendly error message.
 * @param {Error|null} [errorObject=null] - The original error object (for console logging).
 * @param {boolean} [isWarning=false] - If true, displays as a warning (less severe style).
 */
export function displayError(message, errorObject = null, isWarning = false) {
    console.error("Error Displayed:", message, errorObject || ''); // Log detailed error to console

    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        // Apply different styles for errors vs warnings
        errorMessageElement.classList.remove('bg-red-600', 'bg-yellow-500', 'opacity-0', 'hidden');
        errorMessageElement.classList.add(isWarning ? 'bg-yellow-500' : 'bg-red-600', 'opacity-100');

        // Clear previous timeout if exists
        if (errorTimeout) {
            clearTimeout(errorTimeout);
        }

        // Automatically hide the message after a delay (e.g., 5 seconds)
        errorTimeout = setTimeout(() => {
            errorMessageElement.classList.remove('opacity-100');
            errorMessageElement.classList.add('opacity-0');
            // Use transitionend event listener or another timeout to add 'hidden' after fade out
             setTimeout(() => { errorMessageElement.classList.add('hidden'); }, 500); // Match transition duration
        }, 5000); // 5 seconds
    } else {
        // Fallback if error element doesn't exist
        alert(`Error: ${message}`);
    }
}

/**
 * Displays an informational message (e.g., success confirmation).
 * Uses the same mechanism as displayError but with a different style.
 * @param {string} message - The informational message.
 * @param {number} [duration=3000] - Duration to display the message (ms).
 */
export function displayInfo(message, duration = 3000) {
     console.log("Info Displayed:", message); // Log info to console

    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        // Apply info style (e.g., blue background)
        errorMessageElement.classList.remove('bg-red-600', 'bg-yellow-500', 'opacity-0', 'hidden');
        errorMessageElement.classList.add('bg-blue-500', 'opacity-100'); // Use blue for info

        // Clear previous timeout if exists
        if (errorTimeout) {
            clearTimeout(errorTimeout);
        }

        // Automatically hide the message after the specified duration
        errorTimeout = setTimeout(() => {
            errorMessageElement.classList.remove('opacity-100');
            errorMessageElement.classList.add('opacity-0');
             setTimeout(() => { errorMessageElement.classList.add('hidden'); }, 500);
        }, duration);
    } else {
        // Fallback
        console.log(`Info: ${message}`); // Log to console if element missing
    }
}


/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func, delay) {
    let debounceTimer;
    return function(...args) {
        const context = this;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}
