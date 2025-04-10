// Cards/js/data.js
import { filterCards, applySort } from "./search.js"; // Import search/sort functions
import { setupObserver } from "./observer.js"; // Import observer for infinite scroll

// --- State Variables ---
export let allCards = []; // Holds all cards after initial processing
export let filteredCards = []; // Holds currently visible cards after filtering/sorting
export const cardsPerBatch = 50; // Number of cards to load per batch (infinite scroll)
let currentIndex = 0; // Index for tracking the next batch to load
let favorites = new Set(); // Holds Scryfall IDs of favorited cards

const FAVORITES_LOCAL_STORAGE_KEY = 'mtgCardFavorites'; // Key for localStorage

// --- Favorite Management ---

/**
 * Loads favorite card IDs from localStorage into the `favorites` Set.
 */
function loadFavorites() {
  const storedFavorites = localStorage.getItem(FAVORITES_LOCAL_STORAGE_KEY);
  if (storedFavorites) {
    try {
      const parsedFavorites = JSON.parse(storedFavorites);
      // Ensure it's an array of strings before creating the Set
      if (Array.isArray(parsedFavorites) && parsedFavorites.every(id => typeof id === 'string')) {
        favorites = new Set(parsedFavorites);
        console.log(`⭐ Loaded ${favorites.size} favorites from localStorage.`);
      } else {
         console.warn("⚠️ Corrupted or invalid favorites data in localStorage, starting fresh.");
         favorites = new Set();
         localStorage.removeItem(FAVORITES_LOCAL_STORAGE_KEY); // Clear corrupted data
      }
    } catch (e) {
      console.error("❌ Error parsing favorites from localStorage:", e);
      favorites = new Set(); // Reset on error
      localStorage.removeItem(FAVORITES_LOCAL_STORAGE_KEY); // Clear potentially bad data
    }
  } else {
      console.log("⭐ No favorites found in localStorage.");
      favorites = new Set(); // Initialize empty set if nothing is stored
  }
}

/**
 * Saves the current `favorites` Set to localStorage.
 */
function saveFavorites() {
  try {
    // Convert Set to Array before storing as JSON
    localStorage.setItem(FAVORITES_LOCAL_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
  } catch (e) {
      console.error("❌ Error saving favorites to localStorage:", e);
      // Could be due to storage limits or browser settings
      alert("Could not save favorites. Local storage might be full or disabled.");
  }
}

/**
 * Checks if a card ID is currently favorited.
 * @param {string} cardId - The Scryfall ID of the card.
 * @returns {boolean} - True if the card is a favorite.
 */
export function isFavorite(cardId) {
  // Ensure cardId is treated as a string for Set comparison
  return favorites.has(String(cardId));
}

/**
 * Returns an array of all currently favorited card IDs.
 * @returns {string[]} An array of Scryfall IDs.
 */
export function getFavoriteIds() {
    return Array.from(favorites);
}

/**
 * Adds a card ID to the favorites Set and saves to localStorage.
 * Performs basic validation and trimming. Ensures ID is stored as string.
 * @param {string | number} cardId - The Scryfall ID to add.
 * @returns {boolean} - True if the ID was newly added, false otherwise.
 */
export function addFavorite(cardId) {
  if (cardId === null || cardId === undefined) return false;
  const idAsString = String(cardId).trim(); // Convert to string and trim
  if (idAsString.length === 0) return false; // Ignore empty strings

  // Add only if it's not already present
  if (!favorites.has(idAsString)) {
    favorites.add(idAsString);
    saveFavorites(); // Persist changes
    console.log(`⭐ Added ${idAsString} to favorites.`);
    return true; // Indicate a change occurred
  }
  return false; // Indicate no change needed
}

/**
 * Removes a card ID from the favorites Set and saves to localStorage.
 * Performs basic validation and trimming. Ensures ID is treated as string.
 * @param {string | number} cardId - The Scryfall ID to remove.
 * @returns {boolean} - True if the ID was removed, false otherwise.
 */
export function removeFavorite(cardId) {
  if (cardId === null || cardId === undefined) return false;
  const idAsString = String(cardId).trim(); // Convert to string and trim

  // Remove only if it exists
  if (favorites.has(idAsString)) {
      favorites.delete(idAsString);
      saveFavorites(); // Persist changes
      console.log(`⭐ Removed ${idAsString} from favorites.`);
      return true; // Indicate a change occurred
  }
  return false; // Indicate no change needed
}
/**
 * Clears all favorited card IDs from the favorites Set and persists the change.
 */
export function clearFavorites() {
  favorites.clear();
  saveFavorites();
  console.log("⭐ Cleared all favorites from localStorage.");
}

/**
 * Toggles the favorite status of a card ID. Ensures ID is treated as string.
 * @param {string | number} cardId - The Scryfall ID to toggle.
 * @returns {boolean} - The new favorite status (true if now favorited, false if not).
 */
export function toggleFavorite(cardId) {
    if (cardId === null || cardId === undefined) return false;
    const idAsString = String(cardId).trim(); // Convert to string and trim
    if (idAsString.length === 0) return false;

    if (favorites.has(idAsString)) {
        removeFavorite(idAsString);
        return false; // Was favorite, now removed
    } else {
        addFavorite(idAsString);
        return true; // Was not favorite, now added
    }
}

/**
 * Generates a CSV file containing favorite card IDs and triggers download.
 */
export function exportFavoritesCSV() {
  const ids = getFavoriteIds(); // Get current favorite IDs
  if (ids.length === 0) {
    alert("You have no favorited cards to export.");
    console.warn("⚠️ Attempted to export empty favorites list.");
    return; // Exit if nothing to export
  }

  // Start CSV content with header row
  let csvContent = "Scryfall ID\r\n"; // Use CRLF for broad compatibility
  // Add each ID on a new line
  ids.forEach(id => {
    // Basic CSV escaping (wrap in quotes if ID contains comma, quote, or newline - unlikely for Scryfall IDs but good practice)
    let escapedId = id;
    if (/[",\r\n]/.test(id)) {
        escapedId = `"${id.replace(/"/g, '""')}"`; // Double up existing quotes
    }
    csvContent += `${escapedId}\r\n`;
  });

  // Create a Blob object for the CSV data
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create a temporary link element to trigger the download
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob); // Create a temporary URL for the blob
  link.setAttribute("href", url);

  // Generate filename with current date
  const date = new Date();
  const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  link.setAttribute("download", `mtg_favorites_${dateString}.csv`);
  link.style.visibility = 'hidden'; // Hide the link
  document.body.appendChild(link); // Append link to the body

  console.log(`⬇️ Exporting ${ids.length} favorites to CSV...`);
  link.click(); // Simulate a click to trigger download

  // Clean up by removing the link and revoking the object URL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log("✅ Export complete.");
}

/**
 * Imports favorite card IDs from a user-selected CSV file.
 * Reads the file, parses IDs, adds them to the `favorites` Set, and saves.
 * @param {File} file - The CSV file object from the file input.
 */
export function importFavoritesCSV(file) {
  // Basic file validation
  if (!file) {
    alert("No file selected for import.");
    return;
  }
  if (!file.name.toLowerCase().endsWith(".csv") || file.type !== 'text/csv') {
      alert("Invalid file type. Please select a .csv file.");
      return;
  }

  const reader = new FileReader(); // Use FileReader API to read file content

  // Define what happens when the file is successfully read
  reader.onload = (event) => {
    try {
      const csvData = event.target.result; // Get file content as text
      const lines = csvData.split(/\r?\n/); // Split into lines (handles Windows/Unix endings)

      if (lines.length === 0) {
          alert("CSV file appears to be empty.");
          return;
      }

      let importedCount = 0; // Total IDs processed
      let addedCount = 0; // IDs newly added to favorites

      // Check if the first line is a header and skip it
      const header = lines[0].trim().toLowerCase().replace(/^"|"$/g, ''); // Trim, lowercase, remove surrounding quotes
      const startIndex = (header === "scryfall id") ? 1 : 0; // Start from line 1 if header found

      console.log(`📄 Importing favorites from ${file.name}... Found ${lines.length - startIndex} potential entries.`);

      // Process each line (starting after header if applicable)
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim(); // Trim whitespace from the line
        if (line) { // Only process non-empty lines
          // Remove potential surrounding quotes from the ID itself
          const cardId = line.replace(/^"|"$/g, '');
          // Use addFavorite which handles validation, duplicates, and saving
          if (addFavorite(cardId)) { // addFavorite ensures it's treated as string
            addedCount++; // Increment if it was a new addition
          }
          importedCount++; // Increment total processed count
        }
      }

      // Provide feedback to the user
      alert(`Import finished.\nProcessed: ${importedCount} IDs\nNewly Added: ${addedCount}`);
      console.log(`✅ Import complete. Added ${addedCount} new favorites out of ${importedCount} processed.`);

      // Note: UI refresh (updating stars, re-filtering) is handled in events.js after this function completes.

    } catch (error) {
      console.error("❌ Error reading or parsing CSV file:", error);
      alert("An error occurred while importing the file. Check console for details.");
    }
  };

  // Define what happens on file reading error
  reader.onerror = (event) => {
      console.error("❌ File reading error:", reader.error);
      alert("Failed to read the selected file.");
  };

  // Start reading the file as text
  reader.readAsText(file);
}

// --- Index Management for Infinite Scroll ---
export function getCurrentIndex() { return currentIndex; }
export function incrementIndex() { currentIndex += cardsPerBatch; }
export function resetIndex() { currentIndex = 0; }

// --- Initial Data Fetching and Processing ---

/**
 * Fetches card data from `cards.json`, processes it (calculates prices,
 * creates searchable text), loads favorites, applies initial sort,
 * triggers the first render, and sets up the infinite scroll observer.
 */
export async function fetchAndProcessData() {
  console.log("✅ Initializing data fetch and processing...");
  loadFavorites(); // Load favorites *before* processing cards

  // Get UI elements for feedback
  const cardCountEl = document.getElementById("cardCount");
  const loadingStatusEl = document.getElementById("loadingStatus");

  try {
    // --- Fetch JSON Data ---
    console.log("Fetching cards.json...");
    const response = await fetch("./data/cards.json"); // Fetch the local JSON file
    if (!response.ok) {
        throw new Error(`HTTP error fetching cards.json! status: ${response.status}`);
    }
    console.log("Parsing cards.json...");
    const jsonData = await response.json();
    if (!Array.isArray(jsonData)) {
      throw new Error("Fetched data is not an array.");
    }
    console.log(`📦 Loaded ${jsonData.length} raw entries from cards.json`);

    // Handle empty data file
    if (jsonData.length === 0) {
      console.warn("⚠️ cards.json is empty.");
      allCards = [];
      filteredCards = [];
      if (cardCountEl) cardCountEl.textContent = "Showing 0 cards";
      if (loadingStatusEl) loadingStatusEl.textContent = "No cards found.";
      return; // Stop processing if no data
    }

    // --- Process JSON Data ---
    console.log("Processing card data...");
    const processedCards = jsonData
      // Filter out any null/undefined entries or entries missing a Scryfall ID
      .filter(card => card && typeof card === 'object' && card['Scryfall ID'])
      .map((card, i) => {
        // --- Data Cleaning & Calculation ---
        const scry = card.scryfall || {}; // Ensure scryfall object exists
        // Parse prices, defaulting to 0 if invalid/missing
        const marketPriceNum = parseFloat(card.marketPrice || card["Purchase price"] || "0") || 0;
        // Calculate 'My Price' if missing, based on market price
        const myPriceNum = parseFloat(card.myPrice || (marketPriceNum * MY_PRICE_MULTIPLIER)) || 0;
        const cardId = String(card['Scryfall ID']); // Ensure ID is a string here

        // --- Create Searchable Text ---
        // Combine relevant fields into a single lowercase string for easy searching
        const searchableText = [
          card.Name,
          scry.set_name,
          card["Set code"],
          scry.type_line,
          scry.oracle_text,
          scry.rarity,
          card.Foil // Include foil status in search
        ].filter(Boolean).join(" ").toLowerCase(); // Filter out null/undefined, join, lowercase

        // --- Add Favorite Status ---
        // Check if this card's ID is in the loaded favorites Set
        const favoriteStatus = isFavorite(cardId); // Use the string ID

        // Return the processed card object with added/calculated fields
        return {
          ...card, // Spread original card properties
          'Scryfall ID': cardId, // Ensure the ID in the object is also a string
          __originalIndex: i, // Keep original index if needed later
          marketPrice: marketPriceNum, // Store calculated market price
          myPrice: myPriceNum, // Store calculated 'my price'
          searchableText: searchableText, // Store combined search text
          isFavorite: favoriteStatus // Store favorite status boolean
        };
      });
    console.log(`✅ Finished processing ${processedCards.length} valid cards.`);

    // --- Final State Update & Initial Render ---
    allCards = processedCards; // Store all processed cards
    filteredCards = [...allCards]; // Initially, filtered list is a copy of all cards

    // Handle case where processing resulted in no cards
    if (allCards.length === 0) {
      console.warn("⚠️ No cards remained after processing.");
      if (cardCountEl) cardCountEl.textContent = "Showing 0 cards";
      if (loadingStatusEl) loadingStatusEl.textContent = "No cards to display.";
      return;
    }

    console.log("Applying initial sort...");
    // Set default sort dropdown value (optional)
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) sortSelect.value = "desc"; // Default to Price High-Low
    applySort(); // Apply the initial sort

    console.log("Performing initial render...");
    filterCards(); // Run initial filter (which also calls resetIndex and drawCards(true))

    console.log("Setting up infinite scroll observer...");
    setupObserver(); // Initialize the IntersectionObserver

    console.log("✅ Initialization complete.");

  } catch (err) {
    // --- Error Handling ---
    console.error("❌❌❌ Critical Error during data fetching or processing:", err);
    // Provide feedback in UI
    if (cardCountEl) cardCountEl.textContent = "Error loading cards";
    if (loadingStatusEl) {
      loadingStatusEl.textContent = "Failed to load card data. Check console for details.";
    }
    // Log detailed error info
    if (err instanceof Error) {
      console.error("Error Message:", err.message);
      console.error("Error Stack:", err.stack);
    } else {
      console.error("Caught non-Error object:", err);
    }
  }
}
