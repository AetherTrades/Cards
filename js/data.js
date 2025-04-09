// js/data.js
import { openDB, cacheCardData, cleanupUnusedCards } from "./indexeddb.js";
import { filterCards } from "./search.js";

export let allCards = [];
export let filteredCards = [];
export const cardsPerBatch = 50;

let currentIndex = 0;
export function getCurrentIndex() {
  return currentIndex;
}
export function incrementIndex() {
  currentIndex += cardsPerBatch;
}
export function resetIndex() {
  currentIndex = 0;
}

export let db = null;

export async function fetchAndParseJSON() {
  console.log("✅ Running fetchAndParseJSON()");

  try {
    db = await openDB();

    const res = await fetch("./Cards/data/cards.json");
    const json = await res.json();

    if (!Array.isArray(json) || json.length === 0) {
      console.error("❌ Failed to load cards.json or it was empty.");
      return;
    }

    console.log(`📦 Loaded ${json.length} cards from cards.json`);
    allCards = json.map((card, i) => ({ ...card, __index: i }));

    const validIds = allCards.map((card) => card["Scryfall ID"]);
    await cleanupUnusedCards(db, validIds);

    for (const card of allCards) {
      const scryData = card.scryfall || {};
      await cacheCardData(db, card["Scryfall ID"], scryData);

      const foilType = (card.Foil || "").toLowerCase();
      const isPromo = scryData.promo || card.Promos === "TRUE";

      const displayPrice =
        foilType === "etched"
          ? scryData.prices?.etched
          : foilType === "foil" || isPromo
          ? scryData.prices?.foil
          : scryData.prices?.usd;

      const price = parseFloat(displayPrice || "0");
      card.marketPrice = price;
      card.myPrice = (price * 0.85).toFixed(2);

      scryData.searchable = [
        card.Name,
        scryData.oracle_text,
        scryData.type_line,
        scryData.set_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    }

    // Sort by marketPrice descending before first render
    document.getElementById("sortSelect").value = "desc";
    filteredCards = [...allCards].sort((a, b) => b.marketPrice - a.marketPrice);

    console.log("✅ Finished processing cards. Rendering sorted list.");

    filterCards(); // triggers initial render
    import("./observer.js").then((mod) => mod.setupObserver());
  } catch (err) {
    console.error("❌ Error in fetchAndParseJSON:", err);
  }
}
