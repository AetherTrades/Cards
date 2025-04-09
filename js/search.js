// js/search.js
import { filteredCards, allCards, resetIndex } from './data.js';
import { drawCards } from './render.js';

const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sortSelect");
const foilToggle = document.getElementById("foilToggle");
const etchedToggle = document.getElementById("etchedToggle");
const promoToggle = document.getElementById("promoToggle");
const tokenToggle = document.getElementById("tokenToggle");
const rarityInput = document.getElementById("rarityInput");
const typeInput = document.getElementById("typeInput");
const oracleInput = document.getElementById("oracleInput");
const manaInput = document.getElementById("manaInput");

export function filterCards() {
  const query = searchInput.value.toLowerCase();
  const type = typeInput.value.toLowerCase();
  const rarity = rarityInput.value.toLowerCase();
  const oracle = oracleInput.value.toLowerCase();
  const mana = manaInput.value.trim().toUpperCase().replace(/\s+/g, "");
  const foil = foilToggle.checked;
  const etched = etchedToggle.checked;
  const promo = promoToggle.checked;
  const tokenOnly = tokenToggle.checked;

  filteredCards.length = 0;

  for (const card of allCards) {
    const s = card.scryfall || {};
    const foilType = (card.Foil || "").toLowerCase();
    const isPromo = s.promo || card.Promos === "TRUE";
    const isToken = s.layout === "token" || (card.Type?.toLowerCase().includes("token"));

    const searchableName = (card.Name || "").toLowerCase();
    const setCode = (card["Set code"] || "").toLowerCase();
    const cardType = (s.type_line || card.Type || "").toLowerCase();
    const cardOracle = (s.oracle_text || card.Oracle || "").toLowerCase();
    const cardManaRaw = s.mana_cost || card["Mana cost"] || "";
    const cardMana = cardManaRaw.replace(/[{}]/g, "").toUpperCase().replace(/\s+/g, "");
    const cardRarity = (s.rarity || card.Rarity || "").toLowerCase();

    if (
      (!query || searchableName.includes(query) || setCode.includes(query)) &&
      (!rarity || cardRarity === rarity) &&
      (!type || cardType.includes(type)) &&
      (!oracle || cardOracle.includes(oracle)) &&
      (!mana || cardMana.includes(mana)) &&
      (!foil || foilType === "foil") &&
      (!etched || foilType === "etched") &&
      (!promo || isPromo) &&
      (!tokenOnly || isToken)
    ) {
      filteredCards.push(card);
    }
  }

  applySort();
  resetIndex();
  drawCards(true);
}

export function applySort() {
  const sortValue = sortSelect?.value || "desc";
  filteredCards.sort((a, b) => {
    const pA = parseFloat(a.marketPrice || 0);
    const pB = parseFloat(b.marketPrice || 0);
    return sortValue === "asc" ? pA - pB : pB - pA;
  });
}

// Bind all filters to filterCards() — run once after DOM is loaded
export function bindSearchEvents() {
  searchInput.addEventListener("input", () => filterCards());
  sortSelect.addEventListener("change", () => filterCards());
  foilToggle.addEventListener("change", () => filterCards());
  etchedToggle.addEventListener("change", () => filterCards());
  promoToggle.addEventListener("change", () => filterCards());
  tokenToggle.addEventListener("change", () => filterCards());
  rarityInput.addEventListener("change", () => filterCards());
  typeInput.addEventListener("input", () => filterCards());
  oracleInput.addEventListener("input", () => filterCards());
  manaInput.addEventListener("input", () => filterCards());
}
