// js/events.js
import { filterCards, bindSearchEvents } from "./search.js";

export function setupEventListeners() {
  // Toggle Advanced Search
  const toggleBtn = document.getElementById("toggleAdvanced");
  const advancedSearch = document.getElementById("advancedSearch");
  const toggleIcon = document.getElementById("toggleIcon");
  const toggleText = document.getElementById("toggleText");

  toggleBtn.addEventListener("click", () => {
    const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
    toggleBtn.setAttribute("aria-expanded", !isExpanded);

    if (isExpanded) {
      advancedSearch.style.maxHeight = "0";
      advancedSearch.style.visibility = "hidden";
      toggleIcon.textContent = "▼";
      toggleText.textContent = "Show Advanced Search";
    } else {
      advancedSearch.style.maxHeight = advancedSearch.scrollHeight + "px";
      advancedSearch.style.visibility = "visible";
      toggleIcon.textContent = "▲";
      toggleText.textContent = "Hide Advanced Search";
    }
  });

  // Reset Filters Button
  const resetBtn = document.getElementById("resetFilters");
  resetBtn.addEventListener("click", () => {
    document.getElementById("search").value = "";
    document.getElementById("typeInput").value = "";
    document.getElementById("oracleInput").value = "";
    document.getElementById("manaInput").value = "";
    document.getElementById("rarityInput").value = "";
    document.getElementById("sortSelect").value = "desc";

    document.getElementById("foilToggle").checked = false;
    document.getElementById("etchedToggle").checked = false;
    document.getElementById("promoToggle").checked = false;
    document.getElementById("tokenToggle").checked = false;

    filterCards();
  });

  // Back to Top Button
  const backToTopBtn = document.getElementById("backToTopBtn");
  window.addEventListener("scroll", () => {
    backToTopBtn.classList.toggle("hidden", window.scrollY < 300);
  });
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 🔗 Make sure search bindings are activated
  bindSearchEvents();
}
