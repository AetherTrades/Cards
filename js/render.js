// Cards/js/render.js
import { cardsPerBatch, filteredCards, getCurrentIndex, incrementIndex, isFavorite } from './data.js';

// DOM Elements
const cardList = document.getElementById("cardContainer");
const countElement = document.getElementById("cardCount");

// Constants
const PLACEHOLDER_IMG = "https://placehold.co/630x880/333/ccc?text=No+Image"; // Placeholder image URL
const MY_PRICE_MULTIPLIER = 0.85; // Example: Your price is 85% of market

/**
 * Maps rarity strings to corresponding CSS classes for border/glow effects.
 * @param {string} rarity - The card rarity (lowercase).
 * @returns {string} - CSS class string defined in styles.css.
 */
function getRarityClasses(rarity = 'common') {
  const rarityMap = {
    common: 'card-glow-common',
    uncommon: 'card-glow-uncommon',
    rare: 'card-glow-rare',
    mythic: 'card-glow-mythic',
    special: 'card-glow-mythic', // Treat special like mythic for glow
    default: 'card-glow-default' // Fallback
  };
  return rarityMap[rarity.toLowerCase()] || rarityMap.default;
}

/**
 * Creates a styled tag element (e.g., for Foil, Promo).
 * Uses Tailwind classes for styling.
 * @param {string} label - The text label for the tag.
 * @param {string} colorName - A key corresponding to Tailwind color classes (e.g., 'blue', 'purple').
 * @returns {HTMLSpanElement} - The styled span element.
 */
function makeTag(label, colorName) {
  const colorClasses = {
    blue: 'bg-blue-900 text-blue-300 border border-blue-700',
    purple: 'bg-purple-900 text-purple-300 border border-purple-700',
    pink: 'bg-pink-900 text-pink-300 border border-pink-700',
    yellow: 'bg-yellow-900 text-yellow-300 border border-yellow-700',
    default: 'bg-gray-700 text-gray-300 border border-gray-600'
  };
  const tagColor = colorClasses[colorName] || colorClasses.default;
  const span = document.createElement("span");
  span.textContent = label;
  span.className = `${tagColor} px-2 py-0.5 rounded-full shadow text-xs font-medium`;
  return span;
}

/**
 * Renders a batch of cards to the DOM based on the current filter/sort state.
 * @param {boolean} [reset=false] - If true, clears the existing cards before rendering.
 */
export function drawCards(reset = false) {
  if (!cardList) {
    console.error("❌ Card container element (#cardContainer) not found.");
    return;
  }

  if (reset) {
    cardList.innerHTML = "";
  }

  if (countElement) {
    countElement.textContent = `Showing ${filteredCards.length} cards`;
  }

  const start = getCurrentIndex();
  const batch = filteredCards.slice(start, start + cardsPerBatch);
  const fragment = document.createDocumentFragment();

  for (const card of batch) {
    const scry = card.scryfall || {};
    const foilType = (card.Foil || "normal").toLowerCase();
    const isPromo = scry.promo === true || String(card.Promos).toUpperCase() === "TRUE";
    const isFoil = foilType === "foil" || foilType === "etched" || isPromo;
    const isToken = scry.layout === "token" || String(card.Type).toLowerCase().includes("token");
    const cardId = card['Scryfall ID'];
    const rarity = (scry.rarity || card.Rarity || 'common').toLowerCase();

    // Create the card wrapper and set classes
    const wrapper = document.createElement("div");
    wrapper.className = `card-base ${getRarityClasses(rarity)}`;
    wrapper.dataset.cardId = cardId;

    // Create favorite button
    const favButton = document.createElement("button");
    favButton.className = `favorite-button ${isFavorite(cardId) ? 'favorited' : ''}`;
    favButton.dataset.cardId = cardId;
    favButton.setAttribute('aria-label', 'Favorite this card');
    favButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.757 2.827c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
      </svg>
    `;

    // Create image wrapper and image element
    const imgWrap = document.createElement("div");
    imgWrap.className = `card-image-wrapper ${isFoil ? "foil" : ""}`;
    const img = document.createElement("img");
    img.alt = card.Name || "Card Image";
    img.title = card.Name || "Card Image";
    img.loading = "lazy";
    img.src = scry.imgUrl || PLACEHOLDER_IMG;
    img.onerror = () => {
      img.src = PLACEHOLDER_IMG;
      img.alt = "Image not found";
      console.warn(`Failed to load image for ${card.Name || cardId}: ${scry.imgUrl}`);
    };
    imgWrap.appendChild(img);

    // Create card details section
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'card-details';

    // --- Info Group (Name, [Foil Tag], Type, Set, Quantity) ---
    const infoGroup = document.createElement("div");
    infoGroup.className = 'mb-2 text-center'; // Added margin-bottom

    // Card Name
    const nameContainer = document.createElement("div");
    nameContainer.className = "flex justify-center items-center gap-1";

    const name = document.createElement("div");
    name.className = "font-semibold text-sm truncate w-full text-gray-100";
    name.textContent = card.Name || 'Unnamed Card';
    nameContainer.appendChild(name);
    infoGroup.appendChild(nameContainer);

       // Card Type Line with tooltip for oracle text
    const typeLine = document.createElement("div");
    typeLine.className = "text-xs text-gray-400 italic truncate w-full tooltip";
    typeLine.textContent = scry.type_line || card.Type || "";
    const oracleText = scry.oracle_text || card.Oracle || 'No oracle text available.';
    const tooltipSpan = document.createElement('span');
    tooltipSpan.className = 'tooltip-text';
    tooltipSpan.textContent = oracleText;
    typeLine.appendChild(tooltipSpan);

    // Set Name and Code
    const metaSet = document.createElement("div");
    metaSet.className = "text-xs text-gray-500";
    metaSet.textContent = scry.set_name
      ? `${scry.set_name} (${(card["Set code"] || scry.set)?.toUpperCase() || 'N/A'})`
      : (card["Set name"] || "");

      // Quantity Display
    const quantityDiv = document.createElement("div");
    quantityDiv.className = "text-xs text-gray-500";
    quantityDiv.textContent = `Quantity: ${card.Quantity || 1}`;

      //Foil Name Tag
    const tagWrapper = document.createElement("div");
    tagWrapper.className = "flex justify-center mt-1";
    if (foilType === "foil") {
      const foilNameTag = makeTag("Foil", "blue");
      tagWrapper.appendChild(foilNameTag);
    }
    if (foilType === "etched") {
      const foilNameTag = makeTag("Etched", "purple");
      tagWrapper.appendChild(foilNameTag);
    }
    if (isPromo && foilType !== "etched") {
       const promoNameTag = makeTag("Promo", "pink");
      tagWrapper.appendChild(promoNameTag);
    }
     if (isToken){
        const tokenNameTag = makeTag("Token", "yellow");
        tagWrapper.appendChild(tokenNameTag);
    }



    infoGroup.append(typeLine, metaSet, quantityDiv,tagWrapper);

    // --- Pricing Section ---
    const priceBox = document.createElement("div");
    priceBox.className = "flex justify-around items-center gap-2 text-sm font-medium my-2 w-full max-w-[90%] mx-auto bg-gradient-to-b from-gray-800/30 to-gray-900/30 rounded-md py-1.5 px-2 shadow-inner";
    const marketPriceNum = parseFloat(card.marketPrice || card["Purchase price"] || "0");
    const myPriceNum = parseFloat(card.myPrice || (marketPriceNum * MY_PRICE_MULTIPLIER));
    const myTag = document.createElement("div");
    myTag.className = "price-fade text-center";
    myTag.innerHTML = `<div class='text-green-500 text-[10px] leading-tight uppercase font-medium'>My Price</div><div class='text-sm font-bold text-green-400'>$${myPriceNum.toFixed(2)}</div>`;
    const marketTag = document.createElement("div");
    marketTag.className = "price-fade text-center";
    marketTag.innerHTML = `<div class='text-gray-400 text-[10px] leading-tight uppercase font-medium'>Market</div><div class='text-sm font-bold text-gray-300'>$${marketPriceNum.toFixed(2)}</div>`;
    priceBox.append(myTag, marketTag);

    // --- Tags Section for remaining tags ---
    const tagWrap = document.createElement("div");
    tagWrap.className = "flex flex-wrap justify-center items-center gap-1.5 min-h-[24px] mt-1 w-full";
    // Note: Since foil tag is already placed under the name, we exclude it here.

    // If you also want the token tag here, remove the following condition
    //if (!isToken) tagWrap.append(makeTag("Token", "yellow"));

    // Assemble card details
    detailsDiv.append(infoGroup, priceBox, tagWrap);

    // Assemble final card element
    wrapper.append(imgWrap, favButton, detailsDiv);
    fragment.appendChild(wrapper);

    // Trigger price fade-in animation
    setTimeout(() => {
      myTag.classList.add("show");
      marketTag.classList.add("show");
    }, 50);
  }

  cardList.appendChild(fragment);
  incrementIndex();
}