/**
 * js/ui.js
 * Combines side-menu logic, all global event listeners, and swipe-to-favorite/ignore into one place.
 */

import { clearCardContainer, renderCards, showNoMoreCardsMessage } from './renderer.js';
import { filterAndRenderCards, applySort } from './filters.js';
import { debounce, displayError, displayInfo } from './utils.js';
import {
  toggleFavorite,
  addIgnored,
  clearFavorites,
  clearIgnored,
  importFavoritesCSV,
  exportFavoritesCSV,
  getFavorites,
  getQuantity
} from './data.js';

// ——— DOM ELEMENTS ———
// Side menu
const sideMenu      = document.getElementById('menuPanel');
const menuOverlay   = document.getElementById('menuOverlay');
const menuFavList   = document.getElementById('menuFavList');
const menuFavCount  = document.getElementById('menuFavCount');
const menuFavTotal  = document.getElementById('menuFavTotal');
const hamburgerIcon = document.getElementById('menuIconHamburger');
const closeIcon     = document.getElementById('menuIconClose');

// Filter & sort controls
const searchInput        = document.getElementById('searchInput');
const typeInput          = document.getElementById('typeInput');
const oracleInput        = document.getElementById('oracleInput');
const manaCostInput      = document.getElementById('manaCostInput');
const raritySelect       = document.getElementById('raritySelect');
const sortSelect         = document.getElementById('sortSelect');
const resetFiltersButton = document.getElementById('resetFilters');
const toggleFiltersButton= document.getElementById('toggleFiltersBtn');
const filtersSortingContent = document.getElementById('filtersSortingContent');

// Favorites import/export
const exportFavoritesButton = document.getElementById('exportFavorites');
const importFavoritesInput  = document.getElementById('importFavoritesInput');
const clearFavoritesButton  = document.getElementById('clearFavorites');
const clearIgnoredTopButton = document.getElementById('clearIgnoredTopBtn');

// Swipe & back-to-top
const cardContainer = document.getElementById('cardContainer');
const backToTopBtn  = document.getElementById('backToTopBtn');

// Filter toggles (for collapsing the filter panel)
const filterToggles = document.querySelectorAll('.filter-toggle');

const DEBOUNCE_DELAY = 300;

/** ——— SIDE MENU FUNCTIONS ——— */
function updateMenuFavorites() {
  if (!menuFavList || !menuFavCount || !menuFavTotal) return;
  import('./data.js').then(m => {
    const list = m.getFavorites();
    menuFavList.innerHTML = '';
    if (list.length === 0) {
      menuFavList.innerHTML = '<p class="text-gray-500 italic px-4">No favorites yet.</p>';
      menuFavCount.textContent = '0';
      menuFavTotal.textContent = '0.00';
      return;
    }
    let total = 0;
    const frag = document.createDocumentFragment();
    list.forEach(card => {
      let qty = m.getQuantity(card.id) || 0;
      const price = card.myPrice ?? card.prices?.usd ?? 0;
      total += price * qty;
      const item = document.createElement('div');
      item.className = 'favorite-item';
      item.dataset.cardId = card.id;
      item.innerHTML = `
        <span class="favorite-item-name" title="${card.name}">
          ${card.name}${qty>1?` <span class="favorite-item-quantity">(x${qty})</span>`:''}
        </span>
        <span class="favorite-item-price">$${price.toFixed(2)}</span>
        <button class="favorite-item-remove" title="Remove">&times;</button>
      `;
      item.querySelector('.favorite-item-remove').addEventListener('click', e => {
        e.stopPropagation();
        m.toggleFavorite(card.id);
        updateMenuFavorites();
        const el = document.querySelector(`.card[data-card-id="${card.id}"]`);
        el?.classList.remove('is-favorite');
      });
      frag.appendChild(item);
    });
    menuFavList.appendChild(frag);
    menuFavCount.textContent = list.length.toLocaleString();
    menuFavTotal.textContent = total.toFixed(2);
  }).catch(console.error);
}

function openMenu() {
  if (!sideMenu || !menuOverlay) return;
  updateMenuFavorites();
  sideMenu.classList.remove('-translate-x-full');
  menuOverlay.classList.remove('hidden');
  menuOverlay.classList.add('opacity-100');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  if (!sideMenu || !menuOverlay) return;
  sideMenu.classList.add('-translate-x-full');
  menuOverlay.classList.add('hidden');
  menuOverlay.classList.remove('opacity-100');
  document.body.style.overflow = '';
}

function setupMenu() {
  if (sideMenu)    sideMenu.classList.add('-translate-x-full');
  if (menuOverlay) menuOverlay.classList.add('hidden');
  updateMenuFavorites();
}

/** ——— FILTER & SORT HANDLERS ——— */
const debouncedFilter = debounce(filterAndRenderCards, DEBOUNCE_DELAY);

function handleFilterChange() {
  debouncedFilter();
}

function handleSortChange() {
  applySort();
  clearCardContainer();
  renderCards();
  // re-open menu counts if needed
  updateMenuFavorites();
}

function resetFilters() {
  [searchInput,typeInput,oracleInput,manaCostInput].forEach(i=>i&&(i.value=''));
  raritySelect && (raritySelect.value = '');
  filterToggles.forEach(t => t.checked = false);
  sortSelect && (sortSelect.value = 'price_desc');
  handleFilterChange();
  displayInfo("Filters & sort reset.");
  closeMenu();
  hamburgerIcon?.classList.replace('opacity-0','opacity-100');
  closeIcon?.classList.replace('opacity-100','opacity-0');
}

/** ——— IMPORT/EXPORT & CLEAR ——— */
function handleExportFavorites() {
  const csv = exportFavoritesCSV();
  if (!csv) return;
  try {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `mtg_favorites_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    displayInfo("Favorites exported.");
  } catch (e) {
    displayError("Export failed.", e);
  }
}

function handleImportFavorites(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const res = await importFavoritesCSV(ev.target.result);
      displayInfo(`Imported ${res.importedCount} new, ${res.notFoundCount} not found.`);
      updateMenuFavorites();
      filterAndRenderCards();
    } catch (err) {
      displayError("Import failed: "+err.message, err);
    } finally {
      e.target.value = null;
    }
  };
  reader.onerror = err => {
    displayError("Read error.", err);
    e.target.value = null;
  };
  reader.readAsText(file);
}

/** ——— BACK-TO-TOP BUTTON ——— */
function setupBackToTop() {
  if (!backToTopBtn) return;
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('hidden', window.scrollY < 400);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/** ——— COLLAPSIBLE FILTER SECTION ——— */
function setupCollapsibleFilters() {
  if (!toggleFiltersButton || !filtersSortingContent) return;
  filtersSortingContent.classList.remove('is-open');
  filtersSortingContent.style.maxHeight = '0px';
  toggleFiltersButton.addEventListener('click', () => {
    const open = filtersSortingContent.classList.toggle('is-open');
    toggleFiltersButton.classList.toggle('is-open', open);
    filtersSortingContent.style.maxHeight = open
      ? filtersSortingContent.scrollHeight + 'px'
      : '0px';
  });
}

/** ——— SWIPE-TO-FAVORITE/IGNORE ——— */
let touchStartX = 0;
let currentCard = null;
let touchStartY   = 0;      // track vertical start too
let isSwiping     = null;   // null = undecided; true = horiz; false = vert
function handleGestureStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping   = null;           // decide on first move
    currentCard = e.target.closest('.card');
  if (!currentCard) return;
  currentCard.classList.remove('swipe-left','swipe-right','swipe-reset');
}

function handleGestureMove(e) {
    if (!currentCard) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    // On first significant move, decide if swipe is horiz or vert
    if (isSwiping === null) {
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    isSwiping = Math.abs(dx) > Math.abs(dy);
        } else {
    return; // not enough movement yet
        }
        }
    
    // If it’s a vertical gesture, bail so page scroll works
    if (!isSwiping) {
    currentCard = null;
    return;
    }
    
    // Horizontal swipe: move card
    currentCard.style.transform = `translateX(${dx}px) rotate(${dx/10}deg)`;
    e.preventDefault();  // only block scroll when swiping
}

function handleGestureEnd(e) {
    if (!currentCard || isSwiping === false) {
        currentCard = null;
        return; // bail if not swiping or no card
        }
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const dx = endX - touchStartX;
  const THRESHOLD = 30;

  if (dx > THRESHOLD) {
    // right swipe → favorite
    currentCard.classList.add('swipe-right');
    toggleFavorite(currentCard.dataset.cardId);
    // Notify user
    displayInfo('Added to favorites');
  } else if (dx < -THRESHOLD) {
    // left swipe → ignore
    currentCard.classList.add('swipe-left');
    addIgnored(currentCard.dataset.cardId);
    // Notify user
    displayInfo('Added to ignored');
  } else {
    // reset position
    currentCard.classList.add('swipe-reset');
    currentCard.addEventListener('transitionend', () => {
      currentCard.style.transform = '';
      currentCard.classList.remove('swipe-reset');
      currentCard = null;
    }, { once: true });
    isSwiping = null;
    return;
  }

  // remove the card after the swipe animation
  currentCard.addEventListener('transitionend', () => {
    currentCard.remove();
    isSwiping   = null;
    currentCard = null;
  }, { once: true });
}

/** ——— ATTACH ALL LISTENERS ——— */
function setupEventListeners() {
  // Filters & sort
  searchInput?.addEventListener('input', handleFilterChange);
  typeInput?.addEventListener('input', handleFilterChange);
  oracleInput?.addEventListener('input', handleFilterChange);
  manaCostInput?.addEventListener('input', handleFilterChange);
  raritySelect?.addEventListener('change', handleFilterChange);
  sortSelect?.addEventListener('change', handleSortChange);
  resetFiltersButton?.addEventListener('click', resetFilters);
  filterToggles.forEach(t => t.addEventListener('change', handleFilterChange));

  // Menu toggle
  document.getElementById('menuToggleBtn')?.addEventListener('click', () => {
    if (sideMenu.classList.contains('-translate-x-full')) {
      openMenu();
      hamburgerIcon?.classList.replace('opacity-100','opacity-0');
      closeIcon?.classList.replace('opacity-0','opacity-100');
    } else {
      closeMenu();
      hamburgerIcon?.classList.replace('opacity-0','opacity-100');
      closeIcon?.classList.replace('opacity-100','opacity-0');
    }
  });
  menuOverlay?.addEventListener('click', () => {
    closeMenu();
    hamburgerIcon?.classList.replace('opacity-0','opacity-100');
    closeIcon?.classList.replace('opacity-100','opacity-0');
  });

  // Import/export favorites
  exportFavoritesButton?.addEventListener('click', handleExportFavorites);
  importFavoritesInput?.addEventListener('change', handleImportFavorites);
  clearFavoritesButton?.addEventListener('click', () => {
    clearFavorites();
    updateMenuFavorites();
    filterAndRenderCards();
  });
clearIgnoredTopButton?.addEventListener('click', () => {
    clearIgnored();            // wipe the ignored set :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
    filterAndRenderCards();    // re-render the grid (now with no cards ignored)
    });
  // Swipe gestures
  cardContainer?.addEventListener('touchstart', handleGestureStart, { passive: true });
  cardContainer?.addEventListener('touchmove',  handleGestureMove, { passive: false });
  cardContainer?.addEventListener('touchend',   handleGestureEnd);
  cardContainer?.addEventListener('mousedown',  handleGestureStart);
  document.addEventListener('mousemove', e => {
    if (currentCard) handleGestureMove(e);
  });
  document.addEventListener('mouseup', handleGestureEnd);
  document.addEventListener('mouseleave', handleGestureEnd);

  setupBackToTop();
  setupCollapsibleFilters();
}

/** ——— PUBLIC SETUP ——— */
export function setupUI() {
  setupMenu();
  setupEventListeners();
}
