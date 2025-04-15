// js/render.js
// Handles rendering cards to the DOM, including infinite scroll logic
// and updating UI elements like card counts.

import { getNextBatch, hasMoreCards, getFilteredCount, getQuantity } from './data.js';
import { disconnectObserver, observeSentinel } from './observer.js';

// --- DOM Elements ---
const cardContainer = document.getElementById('cardContainer');
const cardCountElement = document.getElementById('cardCount');
const loadingSentinel = document.getElementById('loadingSentinel');
const loadingStatusElement = document.getElementById('loadingStatus');
const loadingIndicator = document.getElementById('loadingIndicator');

// --- Constants ---
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/630x880/374151/9ca3af?text=Loading...';

// --- Private Helper Functions ---

/**
 * Creates the HTML element for a single card.
 * @param {object} card - The card data object.
 * @returns {HTMLElement} The card element.
 */
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.classList.add(
        'card', 'bg-gray-800', 'border', 'border-gray-700', 'rounded-lg',
        'shadow-md', 'overflow-hidden', 'transition-all', 'duration-200', 'ease-in-out'
    );
    const rarityDisplay = card.rarity || 'unknown';
    // Rarity class removed from card element, added to span below
    cardElement.dataset.cardId = card.id;

    // State classes
    if (card.isFavorite) cardElement.classList.add('is-favorite');
    if (card.isIgnored) cardElement.classList.add('is-ignored');

    // --- NEW: Add specific foil class ---
    if (card.isFoil) {
        cardElement.classList.add('is-foil-card');
    }
    // --- End NEW ---

    // --- Data Preparation ---
    let currentQuantity = getQuantity(card.id);
    const originalQuantity = card.quantity;
    if (isNaN(currentQuantity) || currentQuantity === null || currentQuantity === undefined) {
        currentQuantity = 0;
    }
    const marketPrice = card.marketPrice ?? card.prices?.usd ?? null;
    const myPrice = card.myPrice ?? null;
    const setCodeDisplay = card.set ? card.set.toUpperCase() : 'N/A';
    const collectorNumberDisplay = card.collectorNumber ?? '';
    const cardNameDisplay = card.name || 'Unknown Card';
    const setNameDisplay = card.setName || '';

    // Build Tags HTML
    let tagsHtml = '<div class="card-tags">';
    if (card.isFoil) tagsHtml += '<span class="card-tag tag-foil">Foil</span>';
    if (card.isEtched) tagsHtml += '<span class="card-tag tag-etched">Etched</span>';
    if (card.isPromo) tagsHtml += '<span class="card-tag tag-promo">Promo</span>';
    if (card.isToken) tagsHtml += '<span class="card-tag tag-token">Token</span>';
    tagsHtml += '</div>';

    let priceHtml = `
    <div class="card-price text-sm mb-2 flex flex-row gap-4 items-center justify-center">
  `;
  
  // If Market price
  if (marketPrice !== null) {
    priceHtml += `
      <div class="price-market-container inline-flex items-center">
        <span class="price-label text-xs text-gray-500 mr-1">Market: </span>
        <span class="price-market text-gray-500 line-through">$${marketPrice.toFixed(2)}</span>
      </div>
    `;
  }
  
  // If My Price
  if (myPrice !== null) {
    priceHtml += `
      <div class="price-my-container inline-flex items-center">
        <span class="price-label text-xs text-green-600 mr-1">My Price: </span>
        <span class="price-my font-semibold text-green-400">$${myPrice.toFixed(2)}</span>
      </div>
    `;
  } else if (marketPrice === null) {
    // No price at all
    priceHtml += `<span class="text-xs text-gray-500">No price data</span>`;
  }
  
  priceHtml += '</div>';
  

    // --- Final Card HTML ---
    cardElement.innerHTML = `
        <div class="card-image-container"> {/* Removed has-foil-overlay class here */}
            <img src="${card.imageUrl || PLACEHOLDER_IMAGE_URL}"
                 alt="${cardNameDisplay}"
                 class="card-image w-full h-auto aspect-[63/88] block bg-gray-700"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE_URL}'; this.classList.add('img-error');"
            >
            ${tagsHtml}
        </div>
        <div class="card-content p-3">
            <h3 class="card-name font-semibold text-sm text-gray-100 mb-0 truncate" title="${cardNameDisplay}">${cardNameDisplay}</h3>
            <p class="card-set-name text-xs italic text-gray-400 mb-1" title="${setNameDisplay}">${setNameDisplay}</p>
            <div class="card-info text-xs text-gray-400 mb-2 flex justify-between items-center">
                <span class="card-set truncate" title="${setNameDisplay}">${setCodeDisplay} #${collectorNumberDisplay}</span>
                <span class="card-rarity font-medium capitalize rarity-${rarityDisplay}">${rarityDisplay}</span>
            </div>
            ${priceHtml}
            <div class="quantity-controls flex items-center justify-center gap-2 mt-1">
                <button class="quantity-decrease bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-lg leading-none transition" ${currentQuantity <= 1 ? 'disabled' : ''}>-</button>
                <span class="quantity-display font-medium text-gray-200 text-sm min-w-[1.5rem] text-center">
                    ${currentQuantity} / ${card.quantity}
                </span>

                <button class="quantity-increase bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-lg leading-none transition" ${currentQuantity >= originalQuantity ? 'disabled' : ''}>+</button>
            </div>
        </div>
    `;

    // Attach quantity button listeners
    const decreaseBtn = cardElement.querySelector('.quantity-decrease');
    const increaseBtn = cardElement.querySelector('.quantity-increase');
    const quantityDisplay = cardElement.querySelector('.quantity-display');

    decreaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let qty = getQuantity(card.id);
        if (isNaN(qty) || qty === null || qty === undefined) qty = 0;
        if (qty > 1) {
            const newQuantity = qty - 1;
             import('./data.js').then(dataModule => {
                 if (dataModule.updateQuantity(card.id, newQuantity)) {
                    quantityDisplay.textContent = `${newQuantity} / ${card.quantity}`;
                    decreaseBtn.disabled = newQuantity <= 0;
                     const oQty = card.quantity;
                     increaseBtn.disabled = newQuantity >= oQty;
                     if(dataModule.isFavorite(card.id)) {
                         import('./menu.js').then(menuModule => menuModule.updateMenuFavorites());
                     }
                 }
             });
        }
    });

    increaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let qty = getQuantity(card.id);
        if (isNaN(qty) || qty === null || qty === undefined) qty = 0;
        const oQty = card.quantity;
        if (qty < oQty) {
            const newQuantity = qty + 1;
            import('./data.js').then(dataModule => {
                if (dataModule.updateQuantity(card.id, newQuantity)) {
                    quantityDisplay.textContent = `${newQuantity} / ${card.quantity}`;
                    decreaseBtn.disabled = false;
                    increaseBtn.disabled = newQuantity >= oQty;
                    if(dataModule.isFavorite(card.id)) {
                        import('./menu.js').then(menuModule => menuModule.updateMenuFavorites());
                    }
                }
            });
        }
    });

    return cardElement;
}

// --- Rest of render.js ---
// (updateCardCount, updateLoadingStatus, clearCardContainer, renderCards, etc.
// remain the same as the previous version provided in the chat)

/** Updates the displayed card count. */
function updateCardCount() { if (cardCountElement) cardCountElement.textContent = `Showing ${getFilteredCount().toLocaleString()} cards`; }
/** Updates the loading status message. */
function updateLoadingStatus(status) { if (!loadingStatusElement || !loadingSentinel) return; switch(status) { case 'loading': loadingStatusElement.textContent = 'Loading more cards...'; loadingSentinel.classList.remove('hidden'); break; case 'no more': loadingStatusElement.textContent = 'All matching cards displayed.'; loadingSentinel.classList.remove('hidden'); break; case 'no match': loadingStatusElement.textContent = 'No cards match the current filters.'; loadingSentinel.classList.remove('hidden'); break; default: loadingSentinel.classList.add('hidden'); } }
/** Clears all cards from the container. */
export function clearCardContainer() { if (cardContainer) cardContainer.innerHTML = ''; updateCardCount(); updateLoadingStatus(''); }
/** Renders the next batch of cards based on the current index. */
export function renderCards(batchSize) { if (!cardContainer) return; console.log(`Rendering next batch of cards...`); const cardsToRender = getNextBatch(batchSize); if (cardsToRender.length === 0 && cardContainer.children.length === 0) { updateLoadingStatus('no match'); disconnectObserver(); updateCardCount(); return; } const fragment = document.createDocumentFragment(); cardsToRender.forEach(card => { if (!card || !card.id || !card.name) { console.warn('Skipping rendering of invalid/incomplete card data:', card); return; } try { const cardElement = createCardElement(card); fragment.appendChild(cardElement); } catch (error) { console.error('Error creating card element for card:', card, error); } }); cardContainer.appendChild(fragment); updateCardCount(); if (hasMoreCards()) { updateLoadingStatus('loading'); observeSentinel(); } else { console.log("All filtered cards have been rendered."); updateLoadingStatus('no more'); disconnectObserver(); } }
/** Shows the main loading indicator (usually during initial load). */
export function showLoading() { if (loadingIndicator) loadingIndicator.classList.remove('hidden'); }
/** Hides the main loading indicator. */
export function hideLoading() { if (loadingIndicator) loadingIndicator.classList.add('hidden'); }
/** Shows a specific message in the loading status area and stops the observer. */
export function showNoMoreCardsMessage(message = 'All matching cards displayed.') { updateLoadingStatus(message === 'No cards match the current filters.' ? 'no match' : 'no more'); disconnectObserver(); }