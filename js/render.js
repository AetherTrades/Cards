// js/render.js
import { cardsPerBatch, filteredCards, getCurrentIndex, incrementIndex } from './data.js';

const cardList = document.getElementById("cardContainer");
const PLACEHOLDER_IMG = "assets/honk.gif";

export function drawCards(reset = false) {
  if (reset) {
    cardList.innerHTML = "";
  }

  document.getElementById("cardCount").textContent = `Showing ${filteredCards.length} cards`;

  const start = getCurrentIndex();
  const batch = filteredCards.slice(start, start + cardsPerBatch);

  for (const card of batch) {
    const scry = card.scryfall || {};

    const foilType = (card.Foil || "").toLowerCase();
    const isPromo = scry.promo || card.Promos === "TRUE";
    const isFoil = foilType === "foil" || foilType === "etched" || isPromo;
    const isToken = scry.layout === "token" || (card.Type?.toLowerCase().includes("token"));

    const wrapper = document.createElement("div");
    wrapper.className = `rounded-2xl shadow-lg p-4 flex flex-col items-center text-center w-full max-w-xs min-h-[420px] hover:-translate-y-1 border-4 ${getBorderGlowClass(scry.rarity || card.Rarity)}`;

    const imgWrap = document.createElement("div");
    imgWrap.className = `card-wrapper ${isFoil ? "foil" : ""}`;

    const img = document.createElement("img");
    img.alt = card.Name;
    img.title = card.Name;
    img.loading = "lazy";
    img.width = 230;
    img.height = 320;
    img.src = scry.imgUrl || PLACEHOLDER_IMG;
    img.className = "object-contain rounded-img transition-transform duration-300 hover:scale-105";
    img.onerror = () => (img.src = PLACEHOLDER_IMG);

    // Optional foil visuals
    if (isFoil) {
      img.style.mixBlendMode = "lighten";
      img.style.filter = "brightness(1.2)";
    }

    imgWrap.appendChild(img);

    const name = document.createElement("div");
    name.className = "mt-2 font-semibold text-sm truncate w-full text-gray-100";
    name.textContent = `${card.Quantity || 1}x ${card.Name}`;

    const metaSet = document.createElement("div");
    metaSet.className = "text-xs text-gray-400 mb-1";
    metaSet.textContent = scry.set_name || "";

    const priceBox = document.createElement("div");
    priceBox.className = "flex justify-between items-center gap-6 text-sm text-gray-200 font-medium mb-2";

    const fallbackPrice = parseFloat(card["Purchase price"] || "0");
    const market = parseFloat(card.marketPrice || fallbackPrice || 0);
    const myPrice = parseFloat(card.myPrice || (market * 0.85).toFixed(2));

    const myTag = document.createElement("div");
    myTag.className = "price-fade";
    myTag.innerHTML = `<div class='text-green-400 text-xs'>My Price</div><div class='text-lg font-bold bg-gradient-to-r from-green-400 to-green-600 text-transparent bg-clip-text'>$${myPrice.toFixed(2)}</div>`;

    const marketTag = document.createElement("div");
    marketTag.className = "price-fade";
    marketTag.innerHTML = `<div class='text-gray-400 text-xs'>Market Price</div><div class='text-lg font-bold bg-gradient-to-r from-gray-400 to-white text-transparent bg-clip-text'>$${market.toFixed(2)}</div>`;

    priceBox.append(myTag, marketTag);

    const tagWrap = document.createElement("div");
    tagWrap.className = "flex flex-wrap justify-center gap-1 mt-2 pt-2 border-t border-gray-700 text-xs";

    if (foilType === "foil") tagWrap.append(makeTag("Foil", "blue"));
    if (foilType === "etched") tagWrap.append(makeTag("Etched", "purple"));
    if (isPromo) tagWrap.append(makeTag("Promo", "pink"));
    if (isToken) tagWrap.append(makeTag("Token", "yellow"));

    wrapper.append(imgWrap, name, metaSet, priceBox, tagWrap);
    cardList.appendChild(wrapper);

    setTimeout(() => {
      myTag.classList.add("show");
      marketTag.classList.add("show");
    }, 50);
  }

  incrementIndex();
}

export function makeTag(label, color) {
  const glowColorMap = {
    blue: "#60a5fa",
    purple: "#c084fc",
    pink: "#f472b6",
    yellow: "#facc15",
    green: "#4ade80",
    red: "#f87171",
    white: "#f9fafb",
    gray: "#9ca3af"
  };

  const glowColor = glowColorMap[color] || "#888";
  const span = document.createElement("span");
  span.textContent = label;
  span.className = `bg-${color}-900 text-${color}-300 border border-${color}-800 px-2 py-0.5 rounded-full shadow-md glow-animate`;
  span.style.boxShadow = `0 0 8px ${glowColor}`;
  return span;
}

export function getBorderGlowClass(rarity) {
  switch ((rarity || '').toLowerCase()) {
    case 'common': return 'border-[#b1b1b1] shadow-[0_0_10px_#b1b1b1]';
    case 'uncommon': return 'border-[#1f9e3b] shadow-[0_0_10px_#1f9e3b]';
    case 'rare': return 'border-[#c89f26] shadow-[0_0_10px_#c89f26]';
    case 'mythic': return 'border-[#ed7014] shadow-[0_0_10px_#ed7014]';
    default: return 'border-gray-700';
  }
}
