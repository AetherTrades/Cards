import { filteredCards, allCards, resetIndex, isFavorite } from './data.js'; // Import data arrays and functions
import { drawCards } from './render.js'; // Import render function

// --- Debounce Utility ---
// Limits the rate at which a function can fire. Useful for input events.
function debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// --- Sorting Logic ---

/**
 * Sorts the `filteredCards` array in place based on the selected sort option.
 */
export function applySort() {
  const sortSelect = document.getElementById("sortSelect");
  // Default to 'desc' (Price High to Low) if element or value is missing
  const sortValue = sortSelect?.value || "desc";

  console.log(`Applying sort: ${sortValue}`);
  filteredCards.sort((a, b) => {
    // Determine values to compare based on sortValue
    switch (sortValue) {
      case "asc": // Price: Low to High
        // Use || 0 to handle potential undefined/null prices
        return (a.marketPrice || 0) - (b.marketPrice || 0);
      case "name_asc": // Name: A to Z
        // Use localeCompare for proper alphabetical sorting
        return (a.Name || "").localeCompare(b.Name || "");
      case "name_desc": // Name: Z to A
        return (b.Name || "").localeCompare(a.Name || "");
      case "desc": // Price: High to Low (Default)
      default:
        return (b.marketPrice || 0) - (a.marketPrice || 0);
    }
  });
}

// --- Filtering Logic ---

/**
 * Filters the `allCards` array based on current input/toggle values.
 * Updates the `filteredCards` array.
 * Then applies the current sort order and triggers a re-render.
 */
export function filterCards() {
  console.time("Filtering"); // Start timing the filter operation

  // --- Get Filter Values from DOM ---
  const searchInput = document.getElementById("search");
  const typeInput = document.getElementById("typeInput");
  const rarityInput = document.getElementById("rarityInput");
  const oracleInput = document.getElementById("oracleInput");
  const manaInput = document.getElementById("manaInput");
  const foilToggle = document.getElementById("foilToggle");
  const etchedToggle = document.getElementById("etchedToggle");
  const promoToggle = document.getElementById("promoToggle");
  const tokenToggle = document.getElementById("tokenToggle");
  const favoriteToggle = document.getElementById("favoriteToggle");

  // --- Normalize Filter Values ---
  // Convert to lowercase and handle potential null elements
  const query = searchInput?.value.toLowerCase().trim() || "";
  const type = typeInput?.value.toLowerCase().trim() || "";
  const rarity = rarityInput?.value.toLowerCase() || ""; // Select value is already lowercase or ""
  const oracle = oracleInput?.value.toLowerCase().trim() || "";
  // Normalize mana cost input (remove curly braces, uppercase)
  const mana = manaInput?.value.trim().replace(/[{}]/g, "").toUpperCase() || "";

  // Get toggle states (true/false)
  const filterFoil = foilToggle?.checked || false;
  const filterEtched = etchedToggle?.checked || false;
  const filterPromo = promoToggle?.checked || false;
  const filterTokenOnly = tokenToggle?.checked || false;
  const filterFavoritesOnly = favoriteToggle?.checked || false;

    // --- Perform Filtering ---
  const newlyFilteredCards = allCards.filter(card => {
    // --- Prepare Card Data for Matching ---
    const s = card.scryfall || {}; // Safe access to Scryfall data
    // Normalize card data for comparison
    const cardType = (s.type_line || "").toLowerCase();
    const cardOracle = (s.oracle_text || "").toLowerCase();
    const cardMana = (s.mana_cost || "").replace(/[{}]/g, "").toUpperCase();
    const cardRarity = (s.rarity || "unknown").toLowerCase();
    const foilType = (card.Foil || "normal").toLowerCase();
    const isPromo = s.promo === true;
    const isToken = s.layout === "token";
    const cardId = card['Scryfall ID'];

    // Use pre-calculated searchableText if available, otherwise build it (less efficient)
    const searchableText = card.searchableText || [card.Name, s.set_name, card["Set code"], cardType, cardOracle, cardRarity].filter(Boolean).join(" ").toLowerCase();

    // --- Apply Filters (all must be true to include card) ---

    // 1. General Search Query (checks combined searchable text)
    const queryMatch = !query || searchableText.includes(query);

    // 2. Specific Field Filters
    const rarityMatch = !rarity || cardRarity === rarity;
    const typeMatch = !type || cardType.includes(type);
    const oracleMatch = !oracle || cardOracle.includes(oracle);
    const manaMatch = !mana || cardMana.includes(mana); // Simple includes check for mana cost

     // 3. Tag Filters (Checkboxes) - COMBINED LOGIC
    let tagMatch = true; // Start by assuming it matches

    if (filterFoil || filterEtched || filterPromo) {
        tagMatch = false; // If ANY of these are checked, we need to find a match
        if (filterFoil && foilType === 'foil') tagMatch = true; // Foil match
        if (filterEtched && foilType === 'etched') tagMatch = true; // Etched match
        if (filterPromo && isPromo) tagMatch = true; // Promo match
    }

    // 4. Token Filter
    const tokenMatch = !filterTokenOnly || isToken;

     // 5. Favorite Filter
    const favoriteMatch = !filterFavoritesOnly || isFavorite(cardId);

    // Return true only if *all* filter conditions are met
    return queryMatch && rarityMatch && typeMatch && oracleMatch && manaMatch &&
           tagMatch && tokenMatch && favoriteMatch;
  });

  // Update the global filteredCards array
  filteredCards.length = 0; // Clear the existing array
  filteredCards.push(...newlyFilteredCards); // Push the new results

  console.timeEnd("Filtering"); // Stop timing
  console.log(`Filtered down to ${filteredCards.length} cards.`);

  // --- Post-Filtering Actions ---
  applySort(); // Apply the current sort order to the newly filtered list
  resetIndex(); // Reset the infinite scroll index to the beginning
  drawCards(true); // Draw the first batch of cards, clearing previous ones
}