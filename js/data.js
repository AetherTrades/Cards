/**
 * Manages application state including card data, filters, sorting,
 * user preferences (favorites, ignored, quantities), and localStorage interaction.
 */
import { displayError, displayInfo } from './utils.js'; // Import utility for error/info display
import { applySort } from './filters.js';

// --- State Variables ---
let allCards = []; // Holds the raw data for all cards from cards.json
let filteredCards = []; // Holds the cards currently matching filters
let favorites = new Set(); // Set of unique card IDs marked as favorite
let ignored = new Set(); // Set of unique card IDs marked as ignored
let cardQuantities = {}; // Object storing { cardId: quantity } overrides

let currentIndex = 0; // Index for infinite scrolling batches
const CARDS_PER_BATCH = 20; // Number of cards to load per scroll batch

// --- LocalStorage Keys ---
const LS_KEYS = {
    FAVORITES: 'mtgViewer_favorites',
    IGNORED: 'mtgViewer_ignored',
    QUANTITIES: 'mtgViewer_quantities',
};

// --- Private Helper Functions ---

/**
 * Loads data from localStorage safely.
 * @param {string} key - The localStorage key.
 * @returns {any} The parsed data or null if not found or error occurs.
 */
function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Error loading data from localStorage (key: ${key}):`, error);
        displayError(`Could not load saved ${key.split('_')[1]}. Data might be corrupted.`, error, true); // Non-critical error
        // Attempt to remove corrupted data
        try {
            localStorage.removeItem(key);
        } catch (removeError) {
            console.error(`Error removing corrupted localStorage item (key: ${key}):`, removeError);
        }
        return null;
    }
}

/**
 * Saves data to localStorage safely.
 * @param {string} key - The localStorage key.
 * @param {any} data - The data to save (will be JSON.stringified).
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving data to localStorage (key: ${key}):`, error);
        // Handle potential quota exceeded error
        if (error.name === 'QuotaExceededError') {
             displayError('Could not save changes. Browser storage limit reached. Try clearing favorites/ignored lists or browser cache.', error);
        } else {
            displayError(`Could not save ${key.split('_')[1]}. Changes might not persist.`, error, true); // Non-critical
        }
    }
}

// --- Public Data Access and Manipulation ---

/**
 * Fetches card data from the JSON file and loads user preferences.
 * @returns {Promise<void>}
 */
export async function loadInitialData() {
    console.log("Loading initial data...");
    try {
        // Fetch card data
        const response = await fetch('data/cards.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        allCards = await response.json();
        console.log(`Loaded ${allCards.length} cards from JSON.`);

        // Load user preferences from localStorage
        const savedFavorites = loadFromLocalStorage(LS_KEYS.FAVORITES);
        const savedIgnored = loadFromLocalStorage(LS_KEYS.IGNORED);
        const savedQuantities = loadFromLocalStorage(LS_KEYS.QUANTITIES);

        if (savedFavorites && Array.isArray(savedFavorites)) {
            favorites = new Set(savedFavorites);
            console.log(`Loaded ${favorites.size} favorites.`);
        } else {
            favorites = new Set(); // Initialize as empty set if loading fails or no data
        }

        if (savedIgnored && Array.isArray(savedIgnored)) {
            ignored = new Set(savedIgnored);
             console.log(`Loaded ${ignored.size} ignored cards.`);
        } else {
            ignored = new Set();
        }

        if (savedQuantities && typeof savedQuantities === 'object') {
            cardQuantities = savedQuantities;
             console.log(`Loaded ${Object.keys(cardQuantities).length} quantity overrides.`);
        } else {
            cardQuantities = {};
        }

        // Add runtime flags to allCards based on loaded state
        allCards.forEach(card => {
            card.isFavorite = favorites.has(card.id);
            card.isIgnored = ignored.has(card.id);
            // Ensure quantity is correct (override or default from JSON)
            card.currentQuantity = cardQuantities[card.id] ?? card.quantity;
        });


    } catch (error) {
        console.error("Failed to load initial card data:", error);
        allCards = []; // Ensure allCards is empty on failure
        // Display a user-facing error message
        displayError("Failed to load card data. The application might not work correctly. Please check the console (F12) for details and try refreshing.", error);
        throw error; // Re-throw to be caught by main initialization
    }
}

/**
 * Applies the default sort and filter state on initialization.
 * Typically called after data loading and event listener setup.
 */
export function setInitialState() {
    // Start with all cards visible (unless 'Hide Ignored' is checked by default)
    const hideIgnoredToggle = document.getElementById('hideIgnoredToggle');
    if (hideIgnoredToggle?.checked) {
        filteredCards = allCards.filter(card => !card.isIgnored);
    } else {
        filteredCards = [...allCards];
    }

    // Apply the default sort selected in the dropdown
    applySort(); // This sorts the initial filteredCards
    resetCurrentIndex(); // Reset index after initial sort/filter
    console.log("Initial state set.");
}


/** Returns the full list of cards. */
export function getAllCards() {
    return allCards;
}

/** Returns the currently filtered list of cards. */
export function getFilteredCards() {
    return filteredCards;
}

/** Sets the filtered card list (used by search.js). */
export function setFilteredCards(newFilteredCards) {
    filteredCards = newFilteredCards;
    resetCurrentIndex(); // Reset index whenever filters change
}

/** Resets the infinite scroll index. */
export function resetCurrentIndex() {
    currentIndex = 0;
}

/** Gets the next batch of cards for infinite scrolling. */
export function getNextBatch() {
    const batch = filteredCards.slice(currentIndex, currentIndex + CARDS_PER_BATCH);
    currentIndex += batch.length; // Increment index by the actual batch size fetched
    return batch;
}

/** Checks if there are more cards to load. */
export function hasMoreCards() {
    return currentIndex < filteredCards.length;
}

/** Gets the total count of filtered cards, summing each card’s quantity. */
export function getFilteredCount() {
    return filteredCards.reduce((total, card) => {
    // Use currentQuantity (from localStorage override) or fallback to card.quantity
    const qty = card.currentQuantity ?? card.quantity ?? 0;
    return total + qty;
    }, 0);
}

// --- Favorites Management ---

/** Checks if a card is favorited. */
export function isFavorite(cardId) {
    return favorites.has(cardId);
}

/** Toggles the favorite status of a card. */
export function toggleFavorite(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return false; // Card not found

    if (favorites.has(cardId)) {
        favorites.delete(cardId);
        card.isFavorite = false;
        console.log(`Card removed from favorites: ${cardId}`);
    } else {
        favorites.add(cardId);
        card.isFavorite = true;
        // If favoriting an ignored card, un-ignore it
        if (ignored.has(cardId)) {
            removeIgnored(cardId); // This also updates card.isIgnored
        }
        console.log(`Card added to favorites: ${cardId}`);
    }
    saveToLocalStorage(LS_KEYS.FAVORITES, Array.from(favorites));
    return card.isFavorite; // Return the new status
}

/** Gets all favorite cards. */
export function getFavorites() {
    return allCards.filter(card => favorites.has(card.id));
}

/** Clears all favorites. */
export function clearFavorites() {
    if (favorites.size === 0) {
        displayInfo("Favorite list is already empty.");
        return;
    }
    if (confirm(`Are you sure you want to clear all ${favorites.size} favorites? This cannot be undone.`)) {
        favorites.forEach(cardId => {
            const card = allCards.find(c => c.id === cardId);
            if (card) card.isFavorite = false;
        });
        favorites.clear();
        saveToLocalStorage(LS_KEYS.FAVORITES, []);
        console.log("Favorites cleared.");
        displayInfo("Favorites list cleared.");
        // Requires UI update (menu, potentially card display if filter active)
    }
}

/** Imports favorites from a CSV file content. */
export function importFavoritesCSV(csvContent) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
            header: true, // Expect headers like 'id' or 'Scryfall ID'
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn("CSV Parsing Errors during import:", results.errors);
                    // Continue processing, but warn the user
                }
                if (!results.data || results.data.length === 0) {
                    return reject(new Error("CSV file is empty or contains no data."));
                }

                let importedCount = 0;
                let notFoundCount = 0;
                const currentFavorites = Array.from(favorites); // Get current list

                results.data.forEach(row => {
                    // Try to find ID using common header names
                    const cardId = row['id'] || row['ID'] || row['Scryfall ID'] || row['ScryfallID'];
                    if (cardId) {
                        // Check if this card exists in our main data
                        const cardExists = allCards.some(c => c.id === cardId || c.scryfallId === cardId);
                        if (cardExists) {
                            if (!favorites.has(cardId)) {
                                favorites.add(cardId);
                                const card = allCards.find(c => c.id === cardId || c.scryfallId === cardId);
                                if(card) card.isFavorite = true; // Update runtime flag
                                importedCount++;
                            }
                        } else {
                            console.warn(`Card ID "${cardId}" from CSV not found in collection.`);
                            notFoundCount++;
                        }
                    } else {
                        console.warn("Skipping row in CSV import: No 'id' or 'Scryfall ID' column found.", row);
                    }
                });

                if (importedCount > 0) {
                    saveToLocalStorage(LS_KEYS.FAVORITES, Array.from(favorites));
                }
                resolve({ importedCount, totalRows: results.data.length, notFoundCount });
            },
            error: (error) => reject(new Error(`CSV Parsing Failed: ${error.message}`))
        });
    });
}

/** Exports favorites to a CSV string. */
export function exportFavoritesCSV() {
    const favs = getFavorites();
    if (favs.length === 0) {
        displayInfo("No favorites to export.");
        return null;
    }

    // Define headers - include useful info
    const headers = ['id', 'Name', 'Set', 'Collector Number', 'Rarity', 'Quantity', 'Foil', 'Etched', 'My Price', 'Market Price USD'];
    const rows = favs.map(card => ({
        'id': card.id,
        'Name': card.name,
        'Set': card.set.toUpperCase(),
        'Collector Number': card.collectorNumber,
        'Rarity': card.rarity,
        'Quantity': getQuantity(card.id), // Use current quantity
        'Foil': card.isFoil,
        'Etched': card.isEtched,
        'My Price': card.myPrice?.toFixed(2) ?? '',
        'Market Price USD': card.prices?.usd?.toFixed(2) ?? '',
    }));

    try {
        return Papa.unparse({ fields: headers, data: rows });
    } catch (error) {
        console.error("Error creating favorites CSV:", error);
        displayError("Failed to generate favorites CSV.", error);
        return null;
    }
}


// --- Ignored Management ---

/** Checks if a card is ignored. */
export function isIgnored(cardId) {
    return ignored.has(cardId);
}

/** Adds a card to the ignored list. */
export function addIgnored(cardId) {
     const card = allCards.find(c => c.id === cardId);
    if (!card) return false;

    if (!ignored.has(cardId)) {
        ignored.add(cardId);
        card.isIgnored = true;
        // If ignoring a favorited card, un-favorite it
        if (favorites.has(cardId)) {
            toggleFavorite(cardId); // This also updates card.isFavorite
        }
        saveToLocalStorage(LS_KEYS.IGNORED, Array.from(ignored));
        console.log(`Card added to ignored: ${cardId}`);
        return true;
    }
    return false; // Already ignored
}

/** Removes a card from the ignored list. */
export function removeIgnored(cardId) {
     const card = allCards.find(c => c.id === cardId);
    if (!card) return false;

    if (ignored.has(cardId)) {
        ignored.delete(cardId);
        card.isIgnored = false;
        saveToLocalStorage(LS_KEYS.IGNORED, Array.from(ignored));
         console.log(`Card removed from ignored: ${cardId}`);
        return true;
    }
    return false; // Wasn't ignored
}

/** Clears the ignored list. */
export function clearIgnored() {
    if (ignored.size === 0) {
        displayInfo("Ignored list is already empty.");
        return;
    }
     if (confirm(`Are you sure you want to clear all ${ignored.size} ignored cards? This cannot be undone.`)) {
 // only un-ignore cards that are NOT favorited; keep favorites hidden
    const stillIgnored = [];
    ignored.forEach(cardId => {
    const card = allCards.find(c => c.id === cardId);
    if (card) {
        if (!favorites.has(cardId)) {
        card.isIgnored = false;
        } else {
            stillIgnored.push(cardId);
        }
    }
 });
        ignored = new Set(stillIgnored);
        saveToLocalStorage(LS_KEYS.IGNORED, Array.from(ignored));
        console.log("Ignored list cleared.");
        displayInfo("Ignored list cleared.");
        // Requires UI update if filter needs re-applying
    }
}

// --- Quantity Management ---

/**
 * Gets the current quantity for a card.
 * Returns the override from cardQuantities if set, otherwise the default from allCards.
 * @param {string} cardId - The unique card ID.
 * @returns {number} The current quantity.
 */
export function getQuantity(cardId) {
    // Find the card in the main list first to get its default quantity
    const card = allCards.find(c => c.id === cardId);
    const defaultQuantity = card ? card.quantity : 0; // Default from JSON/CSV
    // Return override if exists, otherwise default
    return cardQuantities[cardId] ?? defaultQuantity;
}

/**
 * Updates the quantity for a specific card.
 * Stores the quantity in cardQuantities only if it differs from the card's default quantity.
 * @param {string} cardId - The unique card ID.
 * @param {number} newQuantity - The new quantity to set.
 * @returns {boolean} True if the quantity was successfully updated, false otherwise.
 */
export function updateQuantity(cardId, newQuantity) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) {
        console.error(`Cannot update quantity: Card with ID ${cardId} not found.`);
        return false;
    }

    // Ensure quantity is a non-negative integer
    const quantity = Math.max(0, Math.floor(newQuantity));

    // Update the runtime quantity
    card.currentQuantity = quantity;

    // Update the persistent override map
    if (quantity === card.quantity) {
        // If quantity matches default, remove override (clean up)
        delete cardQuantities[cardId];
    } else {
        // Otherwise, store the override
        cardQuantities[cardId] = quantity;
    }

    saveToLocalStorage(LS_KEYS.QUANTITIES, cardQuantities);
    console.log(`Quantity updated for ${cardId}: ${quantity}`);
    return true;
}
