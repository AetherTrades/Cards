// Cards/js/events.js
import { filterCards, applySort } from "./search.js"; // Filter/sort logic
import { resetIndex, toggleFavorite, exportFavoritesCSV, importFavoritesCSV, isFavorite, clearFavorites } from "./data.js"; // Data functions including import/export and clearFavorites
import { drawCards } from "./render.js"; // Needed for sort dropdown handler

// Debounce function (utility)
function debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Sets up all primary event listeners for the application UI.
 */
export function setupEventListeners() {
  console.log("✅ Setting up event listeners...");

  // --- Get References to DOM Elements ---
  // Containers & Buttons
  const cardContainer = document.getElementById("cardContainer");
  const toggleBtn = document.getElementById("toggleAdvanced");
  const advancedSearchDiv = document.getElementById("advancedSearch");
  const toggleIcon = document.getElementById("toggleIcon");
  const toggleText = document.getElementById("toggleText");
  const resetBtn = document.getElementById("resetFilters");
  const backToTopBtn = document.getElementById("backToTopBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFileInput = document.getElementById("importFile");
  const clearFavoritesBtn = document.getElementById("clearFavoritesBtn");
  
  // Filter/Sort Input Elements
  const searchInput = document.getElementById("search");
  const sortSelect = document.getElementById("sortSelect");
  const typeInput = document.getElementById("typeInput");
  const rarityInput = document.getElementById("rarityInput");
  const oracleInput = document.getElementById("oracleInput");
  const manaInput = document.getElementById("manaInput");
  const foilToggle = document.getElementById("foilToggle");
  const etchedToggle = document.getElementById("etchedToggle");
  const promoToggle = document.getElementById("promoToggle");
  const tokenToggle = document.getElementById("tokenToggle");
  const favoriteToggle = document.getElementById("favoriteToggle");
  // --- End Element References ---

  // Debounced version of filterCards for text inputs
  const debouncedFilterCards = debounce(filterCards, 300);

  // --- Attach Event Listeners ---

  // 1. Advanced Search Toggle Button
  if (toggleBtn && advancedSearchDiv && toggleIcon && toggleText) {
     toggleBtn.addEventListener("click", () => {
        const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
        toggleBtn.setAttribute("aria-expanded", !isExpanded);
        if (isExpanded) {
          // --- Collapse Logic ---
          advancedSearchDiv.style.maxHeight = advancedSearchDiv.scrollHeight + "px";
          requestAnimationFrame(() => {
            advancedSearchDiv.style.maxHeight = "0";
            advancedSearchDiv.style.paddingTop = "0";
            advancedSearchDiv.style.paddingBottom = "0";
            advancedSearchDiv.style.marginTop = "0";
            advancedSearchDiv.style.marginBottom = "0";
            // Delay setting visibility to hidden until after transition
            advancedSearchDiv.addEventListener('transitionend', () => {
                 if (toggleBtn.getAttribute("aria-expanded") === "false") {
                    advancedSearchDiv.style.visibility = "hidden";
                 }
            }, { once: true });
          });
          toggleIcon.textContent = "▼";
          toggleText.textContent = "Show Advanced Search & Options";
        } else {
          // --- Expand Logic ---
          advancedSearchDiv.style.visibility = "visible";
          advancedSearchDiv.style.paddingTop = "";
          advancedSearchDiv.style.paddingBottom = "";
          advancedSearchDiv.style.marginTop = "";
          advancedSearchDiv.style.marginBottom = "";
          advancedSearchDiv.style.maxHeight = advancedSearchDiv.scrollHeight + "px";
          toggleIcon.textContent = "▲";
          toggleText.textContent = "Hide Advanced Search & Options";
          advancedSearchDiv.addEventListener('transitionend', () => {
            if (toggleBtn.getAttribute("aria-expanded") === "true") {
              advancedSearchDiv.style.maxHeight = 'none';
            }
          }, { once: true });
        }
    });
  } else {
    console.warn("⚠️ Could not find all advanced search toggle elements.");
  }

  // 2. Filter Inputs (Text, Select, Checkbox) -> Trigger filterCards
  const filterElements = [
    searchInput, typeInput, rarityInput, oracleInput, manaInput,
    foilToggle, etchedToggle, promoToggle, tokenToggle, favoriteToggle
  ];
  filterElements.forEach(el => {
    if (el) {
      const isTextInput = (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search'));
      const eventType = isTextInput ? 'input' : 'change';
      const handler = isTextInput ? debouncedFilterCards : filterCards;
      el.addEventListener(eventType, handler);
    }
  });

  // 3. Sort Dropdown -> Trigger applySort and re-render
  if (sortSelect) {
      sortSelect.addEventListener('change', () => {
          console.log("Sort changed:", sortSelect.value);
          applySort();
          resetIndex();
          drawCards(true);
      });
  } else {
      console.warn("⚠️ Sort select dropdown not found.");
  }

  // 4. Reset Filters Button
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      console.log("Resetting filters...");
      if (searchInput) searchInput.value = "";
      if (typeInput) typeInput.value = "";
      if (oracleInput) oracleInput.value = "";
      if (manaInput) manaInput.value = "";
      if (rarityInput) rarityInput.value = "";
      if (sortSelect) sortSelect.value = "desc";
      if (foilToggle) foilToggle.checked = false;
      if (etchedToggle) etchedToggle.checked = false;
      if (promoToggle) promoToggle.checked = false;
      if (tokenToggle) tokenToggle.checked = false;
      if (favoriteToggle) favoriteToggle.checked = false;

      filterCards();
    });
  } else {
    console.warn("⚠️ Reset button not found.");
  }

  // 5. Back to Top Button Visibility & Click
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.remove("hidden");
      } else {
        backToTopBtn.classList.add("hidden");
      }
    }, { passive: true });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  } else {
    console.warn("⚠️ Back to Top button not found.");
  }

  // 6. Favorite Button Click Listener (using Event Delegation on card container)
  if (cardContainer) {
      cardContainer.addEventListener('click', (event) => {
          const button = event.target.closest('.favorite-button');
          if (button) {
              const cardId = button.dataset.cardId;
              if (cardId) {
                  console.log(`Favorite button clicked for card ID: ${cardId}`);
                  const isNowFavorite = toggleFavorite(cardId);
                  console.log(`Card ID ${cardId} is now favorite: ${isNowFavorite}`);
                  button.classList.toggle('favorited', isNowFavorite);
                  if (favoriteToggle?.checked && !isNowFavorite) {
                      console.log("Re-filtering because a card was unfavorited while 'Favorites Only' is active.");
                      filterCards();
                  }
              } else {
                  console.warn("⚠️ Favorite button clicked, but no card ID found in data attribute.");
              }
          }
      });
      console.log("⭐ Favorite button listener attached to card container.");
  } else {
      console.warn("⚠️ Card container not found, cannot attach favorite listener.");
  }

  // 7. Export Favorites Button
  if (exportBtn) {
      exportBtn.addEventListener('click', exportFavoritesCSV);
      console.log("⬇️ Export button listener attached.");
  } else {
      console.warn("⚠️ Export button (#exportBtn) not found.");
  }

  // 8. Import Favorites Button & File Input Handling
  if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => {
          importFileInput.click();
      });

      importFileInput.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file) {
              console.log(`Importing file: ${file.name}`);
              importFavoritesCSV(file);
              setTimeout(() => {
                 console.log("Refreshing UI after import...");
                 document.querySelectorAll('.card-base[data-card-id]').forEach(cardDiv => {
                    const cardId = cardDiv.dataset.cardId;
                    const favButton = cardDiv.querySelector('.favorite-button');
                    if (favButton) {
                        const shouldBeFavorited = isFavorite(cardId);
                        favButton.classList.toggle('favorited', shouldBeFavorited);
                    }
                 });
                 if (favoriteToggle?.checked) {
                     console.log("Re-filtering after import because 'Favorites Only' is active.");
                     filterCards();
                 }
                 console.log("UI refresh complete.");
              }, 200);
              event.target.value = null;
          }
      });
      console.log("⬆️ Import button and file input listeners attached.");
  } else {
      console.warn("⚠️ Import button (#importBtn) or file input (#importFile) not found.");
  }

  // 9. Clear All Favorites Button
  if (clearFavoritesBtn) {
      clearFavoritesBtn.addEventListener("click", () => {
          if (confirm("Are you sure you want to clear all favorites?")) {
              clearFavorites();
              document.querySelectorAll('.card-base[data-card-id]').forEach(cardDiv => {
                  const favButton = cardDiv.querySelector('.favorite-button');
                  if (favButton) {
                      favButton.classList.remove("favorited");
                  }
              });
              if (favoriteToggle && favoriteToggle.checked) {
                  filterCards();
              }
          }
      });
      console.log("✅ Clear All Favorites button listener attached.");
  } else {
      console.warn("⚠️ Clear All Favorites button not found.");
  }

  console.log("✅ All event listeners set up.");
}
