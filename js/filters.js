/**
 * js/filters.js
 * Combined filtering + sorting logic for MTG Card Viewer
 */

import {
    getAllCards,
    setFilteredCards,
  } from './data.js';
  import {
    clearCardContainer,
    renderCards,
    showNoMoreCardsMessage,
    initializeObserver,
  } from './renderer.js';
    import { displayError, debounce } from './utils.js';

  
// ——— DOM Elements ———
const searchInput       = document.getElementById('searchInput');
const typeInput         = document.getElementById('typeInput');
const oracleInput       = document.getElementById('oracleInput');
const manaCostInput     = document.getElementById('manaCostInput');
const raritySelect      = document.getElementById('raritySelect');
const foilToggle        = document.getElementById('foilToggle');
const etchedToggle      = document.getElementById('etchedToggle');
const promoToggle       = document.getElementById('promoToggle');
const tokenToggle       = document.getElementById('tokenToggle');
const favoriteToggle    = document.getElementById('favoriteToggle');
const hideIgnoredToggle = document.getElementById('hideIgnoredToggle');
const sortSelect        = document.getElementById('sortSelect');


  // ——— Sorting Logic (from old sorting.js) ———
  
    import { getFilteredCards } from './data.js';
    const rarityOrder = { common:1, uncommon:2, rare:3, mythic:4 };

    export function applySort() {
    try {
        const list = getFilteredCards();
        list.sort((a, b) => {
        switch (sortSelect.value) {
            case 'price_desc':
            return (b.myPrice  ?? b.prices?.usd ?? 0)
                - (a.myPrice  ?? a.prices?.usd ?? 0);
            case 'price_asc':
            return (a.myPrice  ?? a.prices?.usd ?? 0)
                - (b.myPrice  ?? b.prices?.usd ?? 0);
            case 'name_asc':
            return a.name.localeCompare(b.name);
            case 'name_desc':
            return b.name.localeCompare(a.name);
            case 'cmc_asc':
            return (a.cmc || 0) - (b.cmc || 0);
            case 'cmc_desc':
            return (b.cmc || 0) - (a.cmc || 0);
            case 'rarity_asc':
            return (rarityOrder[a.rarity] ?? 99)
                - (rarityOrder[b.rarity] ?? 99);
            case 'rarity_desc':
            return (rarityOrder[b.rarity] ?? 99)
                - (rarityOrder[a.rarity] ?? 99);
            case 'quantity_desc':
            return (b.quantity || 0) - (a.quantity || 0);
            case 'quantity_asc':
            return (a.quantity || 0) - (b.quantity || 0);
            case 'set_asc':
                // sort by set code then name
            return (a.set || '').localeCompare(b.set || '') || a.name.localeCompare(b.name);
                
            default:
            return 0;
        }
        });
    // re-set the filteredCards to our newly sorted list
    setFilteredCards(list);   // ← resets currentIndex too :contentReference[oaicite:4]{index=4}&#8203;:contentReference[oaicite:5]{index=5}
          
    } catch (err) {
        console.error('Error in applySort()', err);
        displayError('Sorting failed. Check console for details.', err);
    }
    }

  
  // ——— Filtering + Render Logic (from old search.js) ———
  export function filterAndRenderCards() {
    try {
      const all = getAllCards();
      let filtered = all.filter(card => {
        // never show a card in the grid if it's been favorited
        if (card.isFavorite) return false;
        const q = searchInput.value.trim().toLowerCase();
        if (q && !card.name.toLowerCase().includes(q)) return false;
        if (typeInput.value && card.type !== typeInput.value) return false;
        if (oracleInput.value && !card.oracleText.toLowerCase().includes(oracleInput.value.trim().toLowerCase())) return false;
        if (manaCostInput.value) {
            // Upper‐case the user’s input and strip whitespace
            const inputMana = manaCostInput.value.trim().toUpperCase();
            // Normalize the card’s manaCost field: remove all “{” and “}”
            const cardMana = (card.manaCost || '')
            .replace(/[{}]/g, '')
            .toUpperCase();
            if (cardMana !== inputMana) return false;
        }

        if (raritySelect.value && card.rarity !== raritySelect.value) return false;
        if (foilToggle.checked && !card.foil) return false;
        if (etchedToggle.checked && !card.etched) return false;
        if (promoToggle.checked         && !card.isPromo)  return false;
        if (tokenToggle.checked         && !(card.isToken ?? card.layout === 'token')) return false;
        if (favoriteToggle.checked && !card.isFavorite) return false;
        if (hideIgnoredToggle.checked   &&  card.isIgnored)  return false;
        return true;
      });
  
      setFilteredCards(filtered);
      applySort();
      clearCardContainer();
  
      if (filtered.length > 0) {
        renderCards();
      } else {
        showNoMoreCardsMessage('No cards match the current filters.');
      }
    } catch (err) {
      console.error('Error in filterAndRenderCards()', err);
      displayError('Filtering failed. Check console for details.', err);
    }
  }
  
  // ——— Debounced handler for input events ———
  export const onFilterInput = debounce(() => {
    filterAndRenderCards();
  }, 250);
  
  // ——— Listen for sort changes ———
  sortSelect.addEventListener('change', () => {
    applySort();
    clearCardContainer();
    renderCards();
    applySort();            // now also resets index
    clearCardContainer();
    renderCards();
    initializeObserver();   // re-hook infinite scroll at the new top
  });
  