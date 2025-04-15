/**
 * Handles filtering the card list based on user input
 * and triggers re-rendering.
 */
import { getAllCards, setFilteredCards, isFavorite, isIgnored, getQuantity } from './data.js';
import { clearCardContainer, renderCards, showNoMoreCardsMessage } from './render.js';
import { applySort } from './sorting.js'; // Import sorting function

// --- DOM Elements (for reading filter values) ---
const searchInput = document.getElementById('searchInput');
const typeInput = document.getElementById('typeInput');
const oracleInput = document.getElementById('oracleInput');
const manaCostInput = document.getElementById('manaCostInput');
const raritySelect = document.getElementById('raritySelect');
const foilToggle = document.getElementById('foilToggle');
const etchedToggle = document.getElementById('etchedToggle');
const promoToggle = document.getElementById('promoToggle');
const tokenToggle = document.getElementById('tokenToggle');
const favoriteToggle = document.getElementById('favoriteToggle');
const hideIgnoredToggle = document.getElementById('hideIgnoredToggle');

// --- Filtering Logic ---

/**
 * Filters the full card list based on current filter criteria.
 * @returns {object[]} The filtered array of card objects.
 */
function filterCards() {
    const allCards = getAllCards();
    if (!allCards || allCards.length === 0) {
        return []; // Return empty if no base data
    }

    // Get filter values safely, providing defaults
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const typeTerm = typeInput?.value.toLowerCase().trim() || '';
    const oracleTerm = oracleInput?.value.toLowerCase().trim() || '';
    const manaCostTerm = manaCostInput?.value.toLowerCase().trim() || '';
    const rarityTerm = raritySelect?.value || '';
    const showFoil = foilToggle?.checked || false;
    const showEtched = etchedToggle?.checked || false;
    const showPromo = promoToggle?.checked || false;
    const showToken = tokenToggle?.checked || false;
    const showOnlyFavorites = favoriteToggle?.checked || false;
    const hideIgnored = hideIgnoredToggle?.checked || false; // Default to true if element missing

    console.log("Filtering with:", { searchTerm, typeTerm, oracleTerm, manaCostTerm, rarityTerm, showFoil, showEtched, showPromo, showToken, showOnlyFavorites, hideIgnored });

    const filtered = allCards.filter(card => {
        // --- Text Filters ---
        // Use pre-calculated searchableText if available and efficient
        if (searchTerm && !card.searchableText?.includes(searchTerm)) {
             // Fallback to checking individual fields if searchableText is missing or doesn't match
             const nameMatch = card.name?.toLowerCase().includes(searchTerm);
             const typeMatch = card.typeLine?.toLowerCase().includes(searchTerm);
             const oracleMatch = card.oracleText?.toLowerCase().includes(searchTerm);
             const setMatch = card.setName?.toLowerCase().includes(searchTerm);
             if (!nameMatch && !typeMatch && !oracleMatch && !setMatch) {
                 return false;
             }
        }
        if (typeTerm && !card.typeLine?.toLowerCase().includes(typeTerm)) {
            return false;
        }
        if (oracleTerm && !card.oracleText?.toLowerCase().includes(oracleTerm)) {
            return false;
        }
        // Mana cost needs careful handling for symbols like {W}
        // Simple includes check might suffice for basic filtering
        if (manaCostTerm && !card.manaCost?.toLowerCase().includes(manaCostTerm)) {
             // Could implement more robust mana cost parsing/matching if needed
             return false;
        }

        // --- Select Filters ---
        if (rarityTerm && card.rarity !== rarityTerm) {
            return false;
        }

        // --- Toggle Filters ---
        if (showFoil && !card.isFoil) return false;
        if (showEtched && !card.isEtched) return false;
        if (showPromo && !card.isPromo) return false;
        // Use pre-calculated isToken flag if available
        if (showToken && !(card.isToken ?? card.layout === 'token')) return false;

        // --- Favorite/Ignored Filters ---
        // Use runtime flags set in data.js
        if (showOnlyFavorites && !card.isFavorite) return false;
        if (hideIgnored && card.isIgnored) return false;

        // --- Quantity Filter (Implicit: Hide cards with 0 quantity?) ---
        // Decide if cards with quantity 0 should be hidden by default or via a toggle
        // const currentQuantity = getQuantity(card.id);
        // if (currentQuantity <= 0) return false; // Uncomment to hide 0 quantity cards

        // If all checks pass, include the card
        return true;
    });

    console.log(`Filtering complete. ${filtered.length} cards matched.`);
    return filtered;
}

// --- Public Function ---

/**
 * Applies current filters, updates the filtered card list in data.js,
 * applies sorting, clears the display, and renders the first batch.
 */
export function filterAndRenderCards() {
    console.log("Applying filters and re-rendering...");
    const newlyFilteredCards = filterCards();

    // Update the shared filtered card state
    setFilteredCards(newlyFilteredCards);

    // Apply the current sort order to the newly filtered list
    applySort(); // Sorts the array stored via setFilteredCards

    // Prepare UI for new results
    clearCardContainer(); // Clear existing cards

    // Render the first batch of the *newly sorted and filtered* list
    if (newlyFilteredCards.length > 0) {
        renderCards(); // Renders the initial batch based on the updated state
    } else {
        // If filtering results in zero cards, show appropriate message
        showNoMoreCardsMessage('No cards match the current filters.');
    }
}
