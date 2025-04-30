/**
 * js/renderer.js
 * Handles rendering cards + infinite-scroll observer logic
 */

import {
    getNextBatch,
    hasMoreCards,
    getFilteredCount,
    getQuantity
  } from './data.js';
  import { displayError } from './utils.js';
  
  // ——— DOM Elements ———
  const cardContainer       = document.getElementById('cardContainer');
  const cardCountElement    = document.getElementById('cardCount');
  const loadingSentinel     = document.getElementById('loadingSentinel');
  const loadingStatusElem   = document.getElementById('loadingStatus');
  const loadingIndicator    = document.getElementById('loadingIndicator');
  const PLACEHOLDER_IMAGE   = 'https://placehold.co/630x880/374151/9ca3af?text=Loading...';
  
  // ——— IntersectionObserver Setup ———
  let observer = null, isObserving = false;
  
  function handleIntersection(entries) {
    entries.forEach(entry => {
    if (entry.isIntersecting && hasMoreCards()) {
        renderCards();
    } else if (!hasMoreCards()) {
    disconnectObserver();
    }
    // Whenever the sentinel enters the viewport, load the next batch.
    if (entry.isIntersecting) {
     renderCards();
    }
    });
  }
  
  function initObserver() {
    if (!loadingSentinel) return;
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });
    observeSentinel();
  }
  
  function observeSentinel() {
    if (observer && loadingSentinel && !isObserving) {
      observer.observe(loadingSentinel);
      isObserving = true;
    }
  }
  
  function disconnectObserver() {
    if (observer) {
      observer.disconnect();
      isObserving = false;
    }
  }
  
  // ——— UI Helpers ———
  function updateCardCount() {
    if (cardCountElement) {
      cardCountElement.textContent = `Showing ${getFilteredCount().toLocaleString()} cards`;
    }
  }
  
  function updateLoadingStatus(status) {
    if (!loadingStatusElem || !loadingSentinel) return;
    switch (status) {
      case 'loading':
        loadingStatusElem.textContent = 'Loading more cards...';
        loadingSentinel.classList.remove('hidden');
        break;
      case 'no more':
        loadingStatusElem.textContent = 'All matching cards displayed.';
        loadingSentinel.classList.remove('hidden');
        break;
      case 'no match':
        loadingStatusElem.textContent = 'No cards match the current filters.';
        loadingSentinel.classList.remove('hidden');
        break;
      default:
        loadingSentinel.classList.add('hidden');
    }
  }
  
  export function clearCardContainer() {
    if (cardContainer) cardContainer.innerHTML = '';
    updateCardCount();
    updateLoadingStatus('');
  }
  
  export function showLoading() {
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
  }
  
  export function hideLoading() {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
  }
  
  export function showNoMoreCardsMessage(msg = 'All matching cards displayed.') {
    updateLoadingStatus(msg === 'No cards match the current filters.' ? 'no match' : 'no more');
    disconnectObserver();
  }
  
  // ——— Card Element Factory ———
  function createCardElement(card) {
    const el = document.createElement('div');
    el.className = [
      'card','bg-gray-800','border','border-gray-700','rounded-lg',
      'shadow-md','overflow-hidden','transition-all','duration-200'
    ].join(' ');
    el.dataset.cardId = card.id;
    if (card.isFavorite) el.classList.add('is-favorite');
    if (card.isIgnored)  el.classList.add('is-ignored');
    if (card.isFoil)     el.classList.add('is-foil-card');
  
    // Quantity logic
    let qty = getQuantity(card.id) || 0;
    const maxQty = card.quantity;
  
    // Tags
    const tags = [];
    if (card.isFoil)  tags.push('Foil');
    if (card.isEtched)tags.push('Etched');
    if (card.isPromo) tags.push('Promo');
    if (card.isToken) tags.push('Token');
  
    const tagsHtml = tags
      .map(t => `<span class="card-tag tag-${t.toLowerCase()}">${t}</span>`)
      .join('');
  
    // Prices
    const market = card.marketPrice ?? card.prices?.usd ?? null;
    const mine   = card.myPrice ?? null;
    const priceHtmlParts = [];
    if (market !== null) {
      priceHtmlParts.push(`
        <div class="price-market inline-flex items-center">
          <span class="text-xs text-gray-500 mr-1">Market:</span>
          <span class="text-gray-500 line-through">$${market.toFixed(2)}</span>
        </div>
      `);
    }
    if (mine !== null) {
      priceHtmlParts.push(`
        <div class="price-my inline-flex items-center">
          <span class="text-xs text-green-600 mr-1">My Price:</span>
          <span class="font-semibold text-green-400">$${mine.toFixed(2)}</span>
        </div>
      `);
    }
    if (market === null && mine === null) {
      priceHtmlParts.push(`<span class="text-xs text-gray-500">No price data</span>`);
    }
    const priceHtml = `<div class="card-price flex gap-4 items-center mb-2">${priceHtmlParts.join('')}</div>`;
  
    // Build inner HTML
    el.innerHTML = `
      <div class="card-image-container">
        <img
          src="${card.imageUrl || PLACEHOLDER_IMAGE}"
          alt="${card.name}"
          class="card-image w-full aspect-[63/88] bg-gray-700"
          loading="lazy"
          onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'; this.classList.add('img-error');"
        >
        <div class="card-tags absolute top-2 right-2 flex flex-col gap-1 z-5">${tagsHtml}</div>
      </div>
      <div class="card-content p-3">
        <h3 class="text-sm font-semibold text-gray-100 truncate">${card.name}</h3>
        <p class="text-xs italic text-gray-400 truncate">${card.setName}</p>
        <div class="flex justify-between text-xs text-gray-400 mb-2">
          <span>${(card.set||'').toUpperCase()} #${card.collectorNumber||''}</span>
          <span class="capitalize rarity-${card.rarity||'unknown'}">${card.rarity||'Unknown'}</span>
        </div>
        ${priceHtml}
        <div class="quantity-controls flex items-center justify-center gap-2 mt-1">
          <button class="quantity-decrease" ${qty<=1?'disabled':''}>–</button>
          <span class="quantity-display">${qty} / ${maxQty}</span>
          <button class="quantity-increase" ${qty>=maxQty?'disabled':''}>+</button>
        </div>
      </div>
    `;
  
    // Attach quantity handlers
    const dec = el.querySelector('.quantity-decrease');
    const inc = el.querySelector('.quantity-increase');
    const disp= el.querySelector('.quantity-display');
  
    dec.addEventListener('click', e => {
      e.stopPropagation();
      if (qty>1) {
        qty--;
        import('./data.js').then(m=>m.updateQuantity(card.id, qty));
        disp.textContent = `${qty} / ${maxQty}`;
        inc.disabled = qty>=maxQty;
        dec.disabled = qty<=1;
      }
    });
    inc.addEventListener('click', e => {
      e.stopPropagation();
      if (qty<maxQty) {
        qty++;
        import('./data.js').then(m=>m.updateQuantity(card.id, qty));
        disp.textContent = `${qty} / ${maxQty}`;
        inc.disabled = qty>=maxQty;
        dec.disabled = qty<=1;
      }
    });
  
    return el;
  }
  
  // ——— Main Render Function ———
  export function renderCards(batchSize = 20) {
    try {
      if (!cardContainer) return;
      const cards = getNextBatch(batchSize);
      if (cards.length === 0 && cardContainer.children.length === 0) {
        updateLoadingStatus('no match');
        disconnectObserver();
        return;
      }
      const frag = document.createDocumentFragment();
      cards.forEach(c => {
        if (c && c.id) {
          frag.appendChild(createCardElement(c));
        }
      });
      cardContainer.appendChild(frag);
      updateCardCount();
  
      if (hasMoreCards()) {
        updateLoadingStatus('loading');
        observeSentinel();
      } else {
        updateLoadingStatus('no more');
        disconnectObserver();
      }
    } catch (err) {
      console.error('Error in renderCards()', err);
      displayError('Rendering cards failed.', err);
    }
  }
  
  // ——— Export Observer Init ———
  export { initObserver as initializeObserver };
  