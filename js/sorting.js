/**
 * Handles sorting the filtered card list based on the selected criteria.
 */
import { getFilteredCards } from './data.js'; // Import getter for the array to sort

// --- DOM Elements ---
const sortSelect = document.getElementById('sortSelect');

// --- Sorting Logic ---

// Rarity order mapping
const rarityOrder = {
    common: 1,
    uncommon: 2,
    rare: 3,
    mythic: 4,
    special: 5, // Adjust order as needed
    bonus: 6
};

/**
 * Sorts the `filteredCards` array in place based on the selected sort option.
 */
export function applySort() {
    const filteredCards = getFilteredCards(); // Get the array reference
    if (!filteredCards || filteredCards.length === 0) {
        console.log("No cards to sort.");
        return; // Nothing to sort
    }

    const sortBy = sortSelect?.value || 'price_desc'; // Default sort if element missing
    console.log(`Applying sort: ${sortBy}`);

    try {
        filteredCards.sort((a, b) => {
            switch (sortBy) {
                case 'price_desc':
                    // Sort by 'myPrice' (calculated) descending, fallback to USD price
                    return (b.myPrice ?? b.prices?.usd ?? 0) - (a.myPrice ?? a.prices?.usd ?? 0);
                case 'price_asc':
                    // Sort by 'myPrice' ascending
                    return (a.myPrice ?? a.prices?.usd ?? 0) - (b.myPrice ?? b.prices?.usd ?? 0);
                case 'name_asc':
                    // Sort by name ascending
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    // Sort by name descending
                    return b.name.localeCompare(a.name);
                case 'cmc_asc':
                    // Sort by Converted Mana Cost ascending
                    return (a.cmc || 0) - (b.cmc || 0);
                case 'cmc_desc':
                    // Sort by Converted Mana Cost descending
                    return (b.cmc || 0) - (a.cmc || 0);
                case 'rarity_asc':
                     // Sort by rarity order ascending
                    return (rarityOrder[a.rarity] ?? 99) - (rarityOrder[b.rarity] ?? 99);
                case 'set_asc':
                     // Sort primarily by set code, then by collector number (parsed as int)
                     const setCompare = a.set.localeCompare(b.set);
                     if (setCompare !== 0) return setCompare;
                     // Extract numbers from collector numbers for proper numerical sort
                     const numA = parseInt(a.collectorNumber?.match(/\d+/)?.[0] || '0', 10);
                     const numB = parseInt(b.collectorNumber?.match(/\d+/)?.[0] || '0', 10);
                     // If numbers are the same (e.g., variants like '1a', '1b'), fallback to full string compare
                     if (numA === numB) return a.collectorNumber.localeCompare(b.collectorNumber);
                     return numA - numB;

                 case 'quantity_desc':
                    // Sort in descending order by the number of cards available
                    return (b.currentQuantity || 0) - (a.currentQuantity || 0);
                    
                
                default:
                    // Default case or unknown sort value
                    return 0;
            }
        });
         console.log("Sorting applied successfully.");
    } catch (error) {
         console.error("Error during sorting:", error);
         // The array might be partially sorted, but log the error.
    }

    // Note: This function modifies the array obtained via getFilteredCards() directly.
    // The calling function (e.g., filterAndRenderCards, handleSortChange)
    // is responsible for triggering the re-render after sorting.
}
