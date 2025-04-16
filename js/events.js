// js/events.js
// Sets up all event listeners for the application.

import { filterAndRenderCards } from './search.js';
import { applySort } from './sorting.js';
import { toggleFavorite, addIgnored, clearFavorites, clearIgnored, importFavoritesCSV, exportFavoritesCSV } from './data.js';
import { updateMenuFavorites, openMenu, closeMenu } from './menu.js';
import { displayError, displayInfo, debounce } from './utils.js';

// --- DOM Elements ---
const searchInput = document.getElementById('searchInput');
const typeInput = document.getElementById('typeInput');
const oracleInput = document.getElementById('oracleInput');
const manaCostInput = document.getElementById('manaCostInput');
const raritySelect = document.getElementById('raritySelect');
const sortSelect = document.getElementById('sortSelect');
const resetFiltersButton = document.getElementById('resetFilters'); // Bottom button
const cardContainer = document.getElementById('cardContainer');

// Menu Elements
const menuToggleButton = document.getElementById('menuToggleBtn');
const menuOverlay = document.getElementById('menuOverlay');
const exportFavoritesButton = document.getElementById('exportFavorites');
const importFavoritesInput = document.getElementById('importFavoritesInput');
const clearFavoritesButton = document.getElementById('clearFavorites');
const clearIgnoredTopButton = document.getElementById('clearIgnoredTopBtn'); // Top button
const toggleFiltersButton = document.getElementById('toggleFiltersBtn');
const filtersSortingContent = document.getElementById('filtersSortingContent');
const swipeAnimationContainer = document.getElementById('swipe-animation-container'); // NEW animation container

// --- Constants ---
const DEBOUNCE_DELAY = 300;
const SWIPE_THRESHOLD = 60;
const REMOVAL_ANIMATION_DURATION = 300; // ms, should match CSS transition

// --- Swipe State Variables ---
let touchstartX = 0, touchstartY = 0, touchendX = 0, touchendY = 0;
let isSwiping = false;
let currentCardElement = null;
let currentX = 0;
let swipeStartX = 0, swipeStartY = 0; // Store precise start coords for animation origin

// --- Event Handlers ---
const debouncedFilter = debounce(filterAndRenderCards, DEBOUNCE_DELAY);
function handleFilterChange() {
    console.log("Filter changed, applying...");
    debouncedFilter();
}

function handleSortChange() {
    console.log("Sort changed, applying...");
    applySort();
    filterAndRenderCards();
}

function resetFilters() {
    console.log("Resetting filters...");
    if (searchInput) searchInput.value = '';
    if (typeInput) typeInput.value = '';
    if (oracleInput) oracleInput.value = '';
    if (manaCostInput) manaCostInput.value = '';
    if (raritySelect) raritySelect.value = '';
    document.querySelectorAll('.filter-toggle').forEach(toggle => {
        if (toggle.id === 'hideIgnoredToggle')
            toggle.checked = true;
        else
            toggle.checked = false;
    });
    if (sortSelect) sortSelect.value = 'price_desc';
    handleFilterChange();
    displayInfo("Filters and sort reset.");
    closeMenu();
    document.getElementById('menuIconHamburger')?.classList.replace('opacity-0', 'opacity-100');
    document.getElementById('menuIconClose')?.classList.replace('opacity-100', 'opacity-0');
}

function handleExportFavorites() {
    const csvData = exportFavoritesCSV();
    if (csvData) {
        try {
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute("href", url);
            link.setAttribute("download", `mtg_favorites_${dateStr}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            displayInfo("Favorites exported successfully.");
        } catch (error) {
            console.error("Error creating download link for favorites CSV:", error);
            displayError("Failed to initiate favorites download.", error);
        }
    }
}

function handleImportFavorites(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvContent = e.target.result;
        try {
            const result = await importFavoritesCSV(csvContent);
            displayInfo(`Import complete: ${result.importedCount} new favorites added. ${result.notFoundCount} IDs not found.`);
            updateMenuFavorites();
            filterAndRenderCards();
        } catch (error) {
            console.error("Error importing favorites:", error);
            displayError(`Import failed: ${error.message}`, error);
        } finally {
            event.target.value = null;
        }
    };
    reader.onerror = (e) => {
        console.error("Error reading import file:", e);
        displayError("Failed to read the selected file.", e);
        event.target.value = null;
    };
    reader.readAsText(file);
}

function handleClearFavorites() {
    clearFavorites();
    updateMenuFavorites();
    filterAndRenderCards();
}

function handleClearIgnored() {
    clearIgnored();
    filterAndRenderCards();
} // Handles both buttons

// --- NEW: Swipe Animations ---

// Star Burst Animation
function createStarBurst(x, y, count = 7) {
    if (!swipeAnimationContainer) return;
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.classList.add('swipe-particle', 'star-particle');
        star.textContent = '★'; // Star character
        // Initial position at the swipe point
        star.style.left = `${x}px`;
        star.style.top = `${y}px`;
        star.style.transform = 'translate(-50%, -50%) scale(0.5)'; // Center and start small
        star.style.opacity = '1';
        swipeAnimationContainer.appendChild(star);
        // Calculate random destination
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 40; // Burst distance
        const finalX = Math.cos(angle) * distance;
        const finalY = Math.sin(angle) * distance;
        const finalScale = 0.8 + Math.random() * 0.4; // Random end scale
        // Trigger animation using requestAnimationFrame for timing
        requestAnimationFrame(() => {
            star.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px)) scale(${finalScale})`;
            star.style.opacity = '0';
        });
        // Remove star after animation
        setTimeout(() => {
            star.remove();
        }, 600); // Match CSS transition duration
    }
}

// Trash Fall Animation
function createTrashFall(x, y, count = 5) {
    if (!swipeAnimationContainer) return;
    for (let i = 0; i < count; i++) {
        const trash = document.createElement('div');
        trash.classList.add('swipe-particle', 'trash-particle');
        trash.textContent = '🗑️'; // Trash can emoji
        // Initial position slightly offset horizontally for spread
        const initialOffsetX = (Math.random() - 0.5) * 30;
        trash.style.left = `${x + initialOffsetX}px`;
        trash.style.top = `${y}px`;
        trash.style.transform = 'translate(-50%, -50%) rotate(0deg)'; // Center
        trash.style.opacity = '1';
        swipeAnimationContainer.appendChild(trash);
        // Calculate animation parameters
        const fallDistance = 60 + Math.random() * 50;
        const endRotation = (Math.random() - 0.5) * 90; // Random rotation
        const horizontalDrift = (Math.random() - 0.5) * 20;
        const duration = 600 + Math.random() * 200; // Slightly variable duration
        // Apply animation styles
        trash.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.8, 0.4), opacity ${duration}ms linear`;
        // Trigger animation
        requestAnimationFrame(() => {
            trash.style.transform = `translate(calc(-50% + ${horizontalDrift}px), calc(-50% + ${fallDistance}px)) rotate(${endRotation}deg)`;
            trash.style.opacity = '0';
        });
        // Remove trash after animation
        setTimeout(() => {
            trash.remove();
        }, duration);
    }
}

// --- Manual Swipe Handling ---
function handleGestureStart(clientX, clientY, target) {
    currentCardElement = target.closest('.card');
    if (!currentCardElement || currentCardElement.classList.contains('is-removing') || currentCardElement.style.display === 'none') {
        currentCardElement = null;
        return;
    }
    // Store exact start coords for animations
    swipeStartX = clientX;
    swipeStartY = clientY;
    touchstartX = clientX;
    touchstartY = clientY;
    isSwiping = true;
    currentX = 0;
    currentCardElement.style.transition = 'none';
    currentCardElement.style.zIndex = '50';
    console.log("Swipe Start on:", currentCardElement.dataset.cardId);
}

function handleGestureMove(clientX, clientY) {
    if (!isSwiping || !currentCardElement) return;
    touchendX = clientX;
    touchendY = clientY;
    const deltaX = touchendX - touchstartX;
    const deltaY = touchendY - touchstartY;
    
    // Only update transform if the horizontal movement exceeds 10px
    // and horizontal movement is dominant over vertical movement.
    if (Math.abs(deltaX) < 10 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) {
      return;
    }
    
    currentX = deltaX;
    currentCardElement.style.transform = `translateX(${currentX}px) rotate(${deltaX / 25}deg)`;
  }

function handleGestureEnd(event) {
    if (touchendX === 0) {
        touchendX = touchstartX;
        touchendY = touchstartY;
    }
    
    if (Math.abs(currentX) < 20) { // 10px is an example threshold
        // Reset position and clear swipe state without acting
        currentCardElement.style.transition = 'transform 0.3s ease-out';
        currentCardElement.style.transform = '';
        // Reset state variables
        isSwiping = false;
        currentCardElement = null;
        touchstartX = touchstartY = touchendX = touchendY = currentX = 0;
        return;
    }
    if (!isSwiping || !currentCardElement) return;
    const deltaX = touchendX - touchstartX;
    const deltaY = touchendY - touchstartY;
    const cardId = currentCardElement.dataset.cardId;
    // Use the stored start coords for animation origin
    const animOriginX = swipeStartX;
    const animOriginY = swipeStartY;
    const cardToReset = currentCardElement;
    isSwiping = false;
    currentCardElement = null;
    touchstartX = 0;
    touchstartY = 0;
    touchendX = 0;
    touchendY = 0;
    currentX = 0;
    swipeStartX = 0;
    swipeStartY = 0;
    cardToReset.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    cardToReset.style.zIndex = '';
    let actionTaken = false;
    let hideCard = false;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < Math.abs(deltaX) * 1.5) {
        actionTaken = true;
        if (deltaX > 0) { // Swipe Right -> Favorite
            console.log(`Swipe Right Action on ${cardId}`);
            const isNowFavorite = toggleFavorite(cardId);
            cardToReset.classList.toggle('is-favorite', isNowFavorite);
            if (isNowFavorite) {
                cardToReset.classList.remove('is-ignored');
                displayInfo(`${cardToReset.querySelector('.card-name')?.textContent || 'Card'} added to favorites.`);
                // Trigger Star Burst Animation
                createStarBurst(animOriginX, animOriginY);
                hideCard = true;
            } else {
                displayInfo(`${cardToReset.querySelector('.card-name')?.textContent || 'Card'} removed from favorites.`);
            }
            updateMenuFavorites();
        } else { // Swipe Left -> Ignore
            console.log(`Swipe Left Action on ${cardId}`);
            const isNowIgnored = addIgnored(cardId);
            if (isNowIgnored) {
                cardToReset.classList.add('is-ignored');
                cardToReset.classList.remove('is-favorite');
                updateMenuFavorites();
                displayInfo(`${cardToReset.querySelector('.card-name')?.textContent || 'Card'} added to ignored list.`);
                // Trigger Trash Fall Animation
                createTrashFall(animOriginX, animOriginY);
                hideCard = true;
            } else {
                actionTaken = false;
            }
        }
    }
    // Handle animation / removal / reset
    if (hideCard) {
        cardToReset.classList.add('is-removing');
        cardToReset.addEventListener('transitionend', () => {
            if (cardToReset) cardToReset.style.display = 'none';
        }, { once: true });
        setTimeout(() => {
            if (cardToReset && cardToReset.classList.contains('is-removing')) cardToReset.style.display = 'none';
        }, REMOVAL_ANIMATION_DURATION + 50);
    } else {
        cardToReset.style.transform = '';
        cardToReset.addEventListener('transitionend', () => {
            if (cardToReset) cardToReset.style.transition = '';
        }, { once: true });
    }
}

// --- Setup Function ---
export function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Filters, Sorting, Menu Actions...
    searchInput?.addEventListener('input', handleFilterChange);
    typeInput?.addEventListener('input', handleFilterChange);
    oracleInput?.addEventListener('input', handleFilterChange);
    manaCostInput?.addEventListener('input', handleFilterChange);
    raritySelect?.addEventListener('change', handleFilterChange);
    sortSelect?.addEventListener('change', handleSortChange);
    exportFavoritesButton?.addEventListener('click', handleExportFavorites);
    importFavoritesInput?.addEventListener('change', handleImportFavorites);
    clearFavoritesButton?.addEventListener('click', handleClearFavorites);
    clearIgnoredTopButton?.addEventListener('click', handleClearIgnored); // Listener for top button
    resetFiltersButton?.addEventListener('click', resetFilters);

    // Filter Toggles
    const filterToggles = document.querySelectorAll('.filter-toggle');
    filterToggles.forEach(toggle => toggle?.addEventListener('change', handleFilterChange));

    // Menu Toggle Button
    menuToggleButton?.addEventListener('click', () => {
        const menuPanel = document.getElementById('menuPanel');
        const hamburgerIcon = document.getElementById('menuIconHamburger');
        const closeIcon = document.getElementById('menuIconClose');
        if (menuPanel?.classList.contains('-translate-x-full')) {
            openMenu();
            hamburgerIcon?.classList.replace('opacity-100', 'opacity-0');
            closeIcon?.classList.replace('opacity-0', 'opacity-100');
        } else {
            closeMenu();
            hamburgerIcon?.classList.replace('opacity-0', 'opacity-100');
            closeIcon?.classList.replace('opacity-100', 'opacity-0');
        }
    });

    // Menu Overlay Click
    menuOverlay?.addEventListener('click', () => {
        closeMenu();
        document.getElementById('menuIconHamburger')?.classList.replace('opacity-0', 'opacity-100');
        document.getElementById('menuIconClose')?.classList.replace('opacity-100', 'opacity-0');
    });

    // Filter Section Toggle
    toggleFiltersButton?.addEventListener('click', () => {
        if (filtersSortingContent) {
            const isOpen = filtersSortingContent.classList.toggle('is-open');
            toggleFiltersButton.classList.toggle('is-open', isOpen);
            // Set max-height based on scrollHeight for smooth animation
            if (isOpen) {
                filtersSortingContent.style.maxHeight = filtersSortingContent.scrollHeight + "px";
            } else {
                requestAnimationFrame(() => {
                    filtersSortingContent.style.maxHeight = '0px';
                });
            }
        }
    });
    // Initialize filters as collapsed
    if (filtersSortingContent) {
        filtersSortingContent.classList.remove('is-open');
        filtersSortingContent.style.maxHeight = '0px';
    }
    if (toggleFiltersButton) {
        toggleFiltersButton.classList.remove('is-open');
    }

    // --- Manual Swipe Event Listeners ---
    if (cardContainer) {
        // Touch Events
        cardContainer.addEventListener('touchstart', (e) => {
            if (e.target.closest('.card') && !e.target.closest('button')) {
                handleGestureStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
            }
        }, { passive: true });
        cardContainer.addEventListener('touchmove', (e) => {
            if (isSwiping) {
                const dX = e.touches[0].clientX - touchstartX;
                const dY = e.touches[0].clientY - touchstartY;
                if (Math.abs(dX) > Math.abs(dY)) {
                    e.preventDefault();
                }
                handleGestureMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });
        cardContainer.addEventListener('touchend', handleGestureEnd);
        cardContainer.addEventListener('touchcancel', handleGestureEnd);

        // Mouse Events
        cardContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.card') && !e.target.closest('button')) {
                handleGestureStart(e.clientX, e.clientY, e.target);
                e.preventDefault();
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (isSwiping) {
                handleGestureMove(e.clientX, e.clientY);
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (isSwiping) {
                handleGestureEnd(e);
            }
        });
        document.addEventListener('mouseleave', (e) => {
            if (isSwiping && e.relatedTarget === null) {
                handleGestureEnd(e);
            }
        });

        console.log("Manual swipe event listeners attached.");
    } else {
        console.error("Card container not found, cannot attach swipe listeners.");
    }

    document.addEventListener('DOMContentLoaded', () => {
        const backToTopBtn = document.getElementById('backToTopBtn');
        if (!backToTopBtn) return;
      
        // Show/hide the button based on scroll position
        window.addEventListener('scroll', () => {
          if (window.scrollY > 400) {
            backToTopBtn.classList.remove('hidden');
          } else {
            backToTopBtn.classList.add('hidden');
          }
        });
      
        // Click the button to smoothly scroll back to top
        backToTopBtn.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
      

    console.log("Event listeners set up complete.");
}
