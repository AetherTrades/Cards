/**
 * js/main.js
 * Entry point: initialize the MTG Card Viewer application
 */

import { loadInitialData } from './data.js';
import { filterAndRenderCards } from './filters.js';
import { initializeObserver, showLoading, hideLoading, clearCardContainer, showNoMoreCardsMessage } from './renderer.js';
import { setupUI } from './ui.js';
import { displayError } from './utils.js';

async function initializeApp() {
  showLoading();
  try {
    // Load CSV & background price/image data
    await loadInitialData();

    // Wire up UI (filters, menu, swipe, back-to-top, import/export)
    setupUI();

    // Do an initial filter + render pass
    filterAndRenderCards();

    // Kick off infinite‐scroll observer
    initializeObserver();

    console.log('Application initialized successfully.');
  } catch (err) {
    console.error('Error during application initialization:', err);
    displayError('Failed to initialize the application. Please try refreshing the page.', err);
    clearCardContainer();
    showNoMoreCardsMessage();
  } finally {
    hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);
