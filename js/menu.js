/**
 * Manages the slide-out side menu, displaying favorites and handling menu actions.
 */
import { getFavorites, getQuantity, toggleFavorite } from './data.js';
import { displayError } from './utils.js'; // Import utility for error display

// --- DOM Elements ---
const sideMenu = document.getElementById('menuPanel'); // Updated ID
const menuOverlay = document.getElementById('menuOverlay');
const menuFavList = document.getElementById('menuFavList');
const menuFavCount = document.getElementById('menuFavCount');
const menuFavTotal = document.getElementById('menuFavTotal');
const mainContent = document.getElementById('mainContent'); // To push content (optional)
// Menu toggle button icons (if needed for state reset)
const hamburgerIcon = document.getElementById('menuIconHamburger');
const closeIcon = document.getElementById('menuIconClose');


// --- Menu State ---
// State is implicitly managed by checking classList in events.js now

// --- Private Helper Functions ---

/**
 * Creates the HTML element for a single favorite item in the menu.
 * @param {object} card - The favorite card data object.
 * @returns {HTMLElement|null} The list item element or null if card data invalid.
 */
function createFavoriteItemElement(card) {
    // Add basic validation for card data needed
    if (!card || !card.id || !card.name) {
        console.warn("Skipping creation of favorite item due to missing data:", card);
        return null;
    }

    const listItem = document.createElement('div');
    listItem.classList.add('favorite-item');
    listItem.dataset.cardId = card.id;

    let quantity = getQuantity(card.id);
     // Ensure quantity is a number for calculation
    if (isNaN(quantity) || quantity === null || quantity === undefined) {
        quantity = 0;
    }
    const price = card.myPrice ?? card.prices?.usd ?? 0;

    listItem.innerHTML = `
        <span class="favorite-item-name" title="${card.name}">
            ${card.name}
            ${quantity > 1 ? `<span class="favorite-item-quantity">(x${quantity})</span>` : ''}
        </span>
        <span class="favorite-item-price">$${price.toFixed(2)}</span>
        <button class="favorite-item-remove" title="Remove from favorites">&times;</button>
    `;

    // Add event listener for the remove button
    const removeButton = listItem.querySelector('.favorite-item-remove');
    if (removeButton) {
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`Remove favorite clicked: ${card.id}`);
            toggleFavorite(card.id); // Toggle favorite status in data module
            updateMenuFavorites(); // Update the menu display immediately
            // Also update the card's appearance in the main view if visible
            const cardElement = document.querySelector(`.card[data-card-id="${card.id}"]`);
            cardElement?.classList.remove('is-favorite');
        });
    } else {
         console.warn("Could not find remove button for favorite item:", card.id);
    }


    return listItem;
}

// --- Public Menu Functions ---

/**
 * Updates the content of the favorites list in the side menu.
 */
export function updateMenuFavorites() {
    // --- FIX: Add checks for element existence ---
    if (!menuFavList || !menuFavCount || !menuFavTotal) {
        console.warn("Menu favorite list elements not found, cannot update favorites.");
        return;
    }
    // --- End FIX ---

    const favorites = getFavorites();
    menuFavList.innerHTML = ''; // Clear previous list

    if (favorites.length === 0) {
        menuFavList.innerHTML = '<p class="text-gray-500 italic px-4">No favorites yet.</p>';
        menuFavCount.textContent = '0';
        menuFavTotal.textContent = '0.00';
    } else {
        let totalValue = 0;
        const fragment = document.createDocumentFragment();
        favorites.forEach(card => {
             let quantity = getQuantity(card.id);
             // Ensure quantity is a number for calculation
             if (isNaN(quantity) || quantity === null || quantity === undefined) {
                 quantity = 0;
             }
            const price = card.myPrice ?? card.prices?.usd ?? 0;
            totalValue += price * quantity;
            const itemElement = createFavoriteItemElement(card);
            if (itemElement) { // Only append if element creation was successful
                 fragment.appendChild(itemElement);
            }
        });
        menuFavList.appendChild(fragment);
        menuFavCount.textContent = favorites.length.toLocaleString();
        menuFavTotal.textContent = totalValue.toFixed(2).toLocaleString();
    }
     console.log("Menu favorites updated.");
}

/**
 * Opens the side menu.
 */
export function openMenu() {
    // --- FIX: Add checks for element existence ---
    if (!sideMenu || !menuOverlay) {
        console.error("Cannot open menu: Menu panel or overlay element not found.");
        return;
    }
    // --- End FIX ---
    console.log("Opening menu...");
    updateMenuFavorites(); // Ensure content is up-to-date when opening
    sideMenu.classList.remove('-translate-x-full');
    menuOverlay.classList.remove('hidden');
    menuOverlay.classList.add('opacity-100'); // Use opacity for fade
    document.body.style.overflow = 'hidden'; // Prevent body scroll
    // Optional: Push main content
    // mainContent?.classList.add('translate-x-72'); // Example push matching menu width
}

/**
 * Closes the side menu.
 */
export function closeMenu() {
     // --- FIX: Add checks for element existence ---
    if (!sideMenu || !menuOverlay) {
        console.error("Cannot close menu: Menu panel or overlay element not found.");
        return;
    }
     // --- End FIX ---
    console.log("Closing menu...");
    sideMenu.classList.add('-translate-x-full');
    menuOverlay.classList.remove('opacity-100');
    menuOverlay.classList.add('hidden');
    document.body.style.overflow = ''; // Restore body scroll
     // Optional: Reset main content position
    // mainContent?.classList.remove('translate-x-72');

    // Reset menu button icon state (might be better handled solely in events.js)
    // hamburgerIcon?.classList.replace('opacity-0', 'opacity-100');
    // closeIcon?.classList.replace('opacity-100', 'opacity-0');
}

/**
 * Sets up initial menu state and listeners (called from main.js).
 */
export function setupMenu() {
    // Initial setup: Ensure menu is closed and update content once
    if (sideMenu) {
        sideMenu.classList.add('-translate-x-full'); // Ensure closed
    } else {
        console.error("Initial menu setup failed: Menu panel not found.");
    }
    if (menuOverlay) {
        menuOverlay.classList.add('hidden'); // Ensure overlay hidden
    } else {
         console.error("Initial menu setup failed: Menu overlay not found.");
    }

    try {
        updateMenuFavorites(); // Populate initially
    } catch (error) {
        console.error("Error during initial menu favorite update:", error);
        displayError("Could not load favorites into menu.", error, true);
    }
    console.log("Menu setup complete.");
}