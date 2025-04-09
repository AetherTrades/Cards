let allCards = [];
let filteredCards = [];
const imageCache = new Map();

const cardList = document.getElementById("cardContainer");
const searchInput = document.getElementById("search");
const sortSelect = document.querySelector("select");

const foilToggle = document.getElementById("foilToggle");
const etchedToggle = document.getElementById("etchedToggle");
const promoToggle = document.getElementById("promoToggle");
const tokenToggle = document.getElementById("tokenToggle");

const rarityInput = document.getElementById("rarityInput");
const typeInput = document.getElementById("typeInput");
const oracleInput = document.getElementById("oracleInput");
const manaInput = document.getElementById("manaInput");

let currentIndex = 0;
const cardsPerBatch = 50;
let observer = null;

/**
 * Debounce helper: delays the execution of the callback function until after
 * a specified delay period has elapsed.
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Fetches card image and metadata from Scryfall with caching.
 */
async function getCardImageFromScryfall(id) {
  if (imageCache.has(id)) return imageCache.get(id);

  try {
    const res = await fetch(`https://api.scryfall.com/cards/${id}`);
    const cardData = await res.json();

    // Get the primary image URL (or from card faces if needed)
    const imgUrl = cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal;
    const prices = {
      usd: cardData.prices?.usd || "N/A",
      foil: cardData.prices?.usd_foil || "N/A",
      etched: cardData.prices?.usd_etched || "N/A"
    };

    const data = {
      imgUrl,
      prices,
      rarity: cardData.rarity || "unknown",
      set_name: cardData.set_name || "",
      layout: cardData.layout || "",
      promo: cardData.promo || false,
      // Additional fields from Scryfall useful for advanced search:
      type_line: cardData.type_line || "",
      oracle_text: cardData.oracle_text || "",
      mana_cost: cardData.mana_cost || ""
    };

    imageCache.set(id, data);
    return data;
  } catch (err) {
    console.error("Scryfall fetch failed:", err);
    return {
      imgUrl: "",
      prices: { usd: "N/A", foil: "N/A", etched: "N/A" },
      rarity: "unknown",
      set_name: "",
      layout: "",
      promo: false,
      type_line: "",
      oracle_text: "",
      mana_cost: ""
    };
  }
}

/**
 * Fetch and parse the CSV file of card data.
 * After parsing, preload Scryfall API data for each card.
 */
function fetchAndParseCSV() {
  fetch("cards.csv")
    .then((res) => res.text())
    .then((csvText) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          allCards = results.data;
          // Once CSV is loaded, preload Scryfall data for all cards.
          loadScryfallData();
        }
      });
    })
    .catch((err) => {
      console.error("Failed to load cards.csv:", err);
    });
}

/**
 * Preloads Scryfall data for each card from the CSV.
 * Stores the result in a new 'scryfall' property on each card.
 */
async function loadScryfallData() {
  const promises = allCards.map(async (card) => {
    card.scryfall = await getCardImageFromScryfall(card["Scryfall ID"]);
  });
  await Promise.all(promises);
  // Initially display all cards.
  filteredCards = allCards.slice();
  filterCards();
}

/**
 * Draws a batch of cards into the card container.
 * If reset is true, clears the container before drawing.
 */
function drawCards(reset = false) {
  if (reset) {
    cardList.innerHTML = "";
    currentIndex = 0;
  }

  document.getElementById("cardCount").textContent = `Showing ${filteredCards.length} cards`;

  const nextBatch = filteredCards.slice(currentIndex, currentIndex + cardsPerBatch);
  nextBatch.forEach((card) => {
    const div = document.createElement("div");
    div.className = `rounded shadow p-3 flex flex-col items-center text-center w-60 min-h-[370px] transition-all hover:shadow-lg hover:-translate-y-1 border-2 ${getBorderGlowClass(card.scryfall ? card.scryfall.rarity : card.Rarity)}`;

    const scryfallId = card["Scryfall ID"];
    // Use the preloaded scryfall data for drawing
    const { imgUrl, prices, promo, layout } = card.scryfall || {};
    const foilType = (card.Foil || "").toLowerCase() || "normal";
    // Determine if this card is foil based on csv info or Scryfall promo data
    const isFoil = foilType === "foil" || foilType === "etched" || promo;
    // Check if the card is a token using Scryfall data if available
    const isToken =
      (card.scryfall && card.scryfall.layout === "token") ||
      (card.Type && card.Type.toLowerCase().includes("token"));

    const wrapper = document.createElement("div");
    wrapper.className = `card-wrapper ${isFoil ? "foil" : ""}`;

    const img = document.createElement("img");
    img.alt = card.Name;
    img.width = 200;
    img.height = 280;
    img.src = imgUrl || "";
    img.className = "object-contain transition-transform duration-300 hover:scale-105";

    // Improve foil visibility on dark backgrounds
    img.style.mixBlendMode = isFoil ? "lighten" : "normal";
    img.style.filter = isFoil ? "brightness(1.2)" : "none";

    wrapper.appendChild(img);

    // Determine which price to use based on the foil type or promo
    const displayPrice =
      foilType === "foil" || promo ? prices.foil : (foilType === "etched" ? prices.etched : prices.usd);
    const marketPrice = parseFloat(displayPrice);
    const myPrice = marketPrice ? (marketPrice * 0.85).toFixed(2) : "N/A";

    const name = document.createElement("div");
    name.className = "mt-2 font-semibold text-sm truncate w-full text-gray-100";
    name.textContent = `${card.Quantity || 1}x ${card.Name}`;

    const metaSet = document.createElement("div");
    metaSet.className = "text-xs text-gray-400 mb-1";
    metaSet.textContent = card.scryfall ? card.scryfall.set_name : "";

    const pricing = document.createElement("div");
    pricing.className = "flex justify-between items-center gap-6 text-sm text-gray-200 font-medium mb-2";

    const myPriceTag = document.createElement("div");
    myPriceTag.className = "price-fade";
    myPriceTag.innerHTML = `
      <div class="text-green-400 text-xs">My Price</div>
      <div class="text-lg font-bold bg-gradient-to-r from-green-400 to-green-600 text-transparent bg-clip-text">$${myPrice}</div>
    `;
    
    const marketTag = document.createElement("div");
    marketTag.className = "price-fade";
    marketTag.innerHTML = `
      <div class="text-gray-400 text-xs">Market Price</div>
      <div class="text-lg font-bold bg-gradient-to-r from-gray-400 to-white text-transparent bg-clip-text">$${marketPrice || "N/A"}</div>
    `;
    
    pricing.appendChild(myPriceTag);
    pricing.appendChild(marketTag);

    // Trigger fade-in effect for pricing display
    setTimeout(() => {
      myPriceTag.classList.add("show");
      marketTag.classList.add("show");
    }, 50);

    const tagContainer = document.createElement("div");
    tagContainer.className = "flex flex-wrap justify-center gap-1 mt-2 pt-2 border-t border-gray-700 text-xs";

    if (foilType === "foil") tagContainer.appendChild(makeTag("Foil", "blue"));
    if (foilType === "etched") tagContainer.appendChild(makeTag("Etched", "purple"));
    if (promo) tagContainer.appendChild(makeTag("Promo", "pink"));
    if (isToken) tagContainer.appendChild(makeTag("Token", "yellow"));

    div.appendChild(wrapper);
    div.appendChild(name);
    div.appendChild(metaSet);
    div.appendChild(pricing);
    div.appendChild(tagContainer);

    cardList.appendChild(div);
  });

  currentIndex += cardsPerBatch;

  if (currentIndex >= filteredCards.length) {
    document.getElementById("loadingStatus").textContent = "All cards loaded.";
    observer?.disconnect();
  }
}

/**
 * Creates a styled tag element.
 */
function makeTag(label, color) {
  const span = document.createElement("span");
  span.textContent = label;
  span.className = `bg-${color}-900 text-${color}-300 border border-${color}-800 px-2 py-0.5 rounded-full shadow-md drop-shadow-[0_0_6px_var(--tw-shadow-color)]`;
  return span;
}

/**
 * Determines the appropriate border glow class based on rarity.
 */
function getBorderGlowClass(rarity) {
  switch ((rarity || '').toLowerCase()) {
    case 'common': return 'border-[#b1b1b1] shadow-[0_0_10px_#b1b1b1]';
    case 'uncommon': return 'border-[#1f9e3b] shadow-[0_0_10px_#1f9e3b]';
    case 'rare': return 'border-[#c89f26] shadow-[0_0_10px_#c89f26]';
    case 'mythic': return 'border-[#ed7014] shadow-[0_0_10px_#ed7014]';
    default: return 'border-gray-700';
  }
}

/**
 * Sets up an Intersection Observer to lazy-load cards as the user scrolls.
 */
function setupObserver() {
  const sentinel = document.getElementById("loadingSentinel");
  if (observer) observer.disconnect();

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && currentIndex < filteredCards.length) {
      drawCards();
    }
  });

  if (sentinel) observer.observe(sentinel);
}

/**
 * Filters cards based on advanced search fields using Scryfall data.
 */
function filterCards() {
  const query = searchInput.value.toLowerCase();
  const rarity = rarityInput.value.toLowerCase();
  const type = typeInput.value.toLowerCase();
  const oracle = oracleInput.value.toLowerCase();
  const mana = manaInput.value;

  // Toggle states
  const foil = foilToggle.checked;
  const etched = etchedToggle.checked;
  const promo = promoToggle.checked;
  const tokenOnly = tokenToggle.checked;

  // Use Scryfall data (if loaded) or fallback to CSV fields
  filteredCards = allCards.filter((card) => {
    const scryData = card.scryfall || {};
    const cardType = scryData.type_line ? scryData.type_line.toLowerCase() : (card.Type ? card.Type.toLowerCase() : "");
    const cardOracle = scryData.oracle_text ? scryData.oracle_text.toLowerCase() : (card.Oracle ? card.Oracle.toLowerCase() : "");
    const cardMana = scryData.mana_cost || card["Mana cost"] || "";
    const cardRarity = scryData.rarity || card.Rarity || "";

    const nameMatch = card.Name.toLowerCase().includes(query) || card["Set code"].toLowerCase().includes(query);
    const rarityMatch = rarity ? cardRarity.toLowerCase() === rarity : true;
    const typeMatch = type ? cardType.includes(type) : true;
    const oracleMatch = oracle ? cardOracle.includes(oracle) : true;
    const manaMatch = mana ? cardMana.includes(mana) : true;

    // For foil/etched/promo toggling, use CSV value or Scryfall data where applicable
    const foilType = (card.Foil || "").toLowerCase();
    const isPromo = scryData.promo || false;
    const isToken = (scryData.layout && scryData.layout === "token") || cardType.includes("token");

    const foilMatch =
      (!foil || foilType === "foil") &&
      (!etched || foilType === "etched") &&
      (!promo || isPromo);

    const tokenMatch = !tokenOnly || isToken;

    return nameMatch && rarityMatch && typeMatch && oracleMatch && manaMatch && foilMatch && tokenMatch;
  });

  applySort();
  drawCards(true);
  setupObserver();
}

/**
 * Sorts the filtered cards by purchase price.
 */
function applySort() {
  const sortValue = sortSelect.value;
  if (sortValue === "desc") {
    filteredCards.sort((a, b) => parseFloat(b["Purchase price"] || 0) - parseFloat(a["Purchase price"] || 0));
  } else if (sortValue === "asc") {
    filteredCards.sort((a, b) => parseFloat(a["Purchase price"] || 0) - parseFloat(b["Purchase price"] || 0));
  }
}

// Set up event listeners on all filter elements (using debouncing)
const debouncedFilter = debounce(filterCards, 300);
document.querySelectorAll([
  "#search",
  "#rarityInput",
  "#typeInput",
  "#oracleInput",
  "#manaInput",
  "#foilToggle",
  "#etchedToggle",
  "#promoToggle",
  "#tokenToggle",
  "select"
]).forEach((el) => {
  el.addEventListener("input", debouncedFilter);
});

// Reset filters when the reset button is clicked.
document.getElementById("resetFilters").addEventListener("click", () => {
  typeInput.value = "";
  rarityInput.value = "";
  oracleInput.value = "";
  manaInput.value = "";
  foilToggle.checked = false;
  etchedToggle.checked = false;
  promoToggle.checked = false;
  tokenToggle.checked = false;
  filterCards();
});

// Start by fetching the CSV data when the DOM is loaded.
window.addEventListener("DOMContentLoaded", () => {
  fetchAndParseCSV();
});
