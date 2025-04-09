// js/main.js
import { fetchAndParseJSON } from './data.js';
import { setupEventListeners } from './events.js';

document.addEventListener("DOMContentLoaded", () => {
  fetchAndParseJSON();
  setupEventListeners();
});
