// data/worker.js

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

self.onmessage = async function (e) {
  const cards = e.data.cards;
  const results = [];

  for (const card of cards) {
    const id = card["Scryfall ID"];

    try {
      const res = await fetch(`https://api.scryfall.com/cards/${id}`);
      const cardData = await res.json();

      const imgUrl =
        cardData.image_uris?.border_crop ||
        cardData.card_faces?.[0]?.image_uris?.border_crop || "";

      results.push({
        index: card.__index,
        scryfall: {
          imgUrl,
          prices: {
            usd: cardData.prices?.usd || "0",
            foil: cardData.prices?.usd_foil || "0",
            etched: cardData.prices?.usd_etched || "0"
          },
          rarity: cardData.rarity || "unknown",
          set_name: cardData.set_name || "",
          layout: cardData.layout || "",
          promo: cardData.promo || false,
          type_line: cardData.type_line || "",
          oracle_text: cardData.oracle_text || "",
          mana_cost: cardData.mana_cost || ""
        }
      });
    } catch (err) {
      console.warn(`Scryfall fetch failed for ID ${id}:`, err);
      results.push({
        index: card.__index,
        scryfall: {
          imgUrl: "",
          prices: { usd: "0", foil: "0", etched: "0" },
          rarity: card.Rarity || "unknown",
          set_name: card["Set name"] || "",
          layout: "",
          promo: false,
          type_line: card.Type || "",
          oracle_text: card.Oracle || "",
          mana_cost: card["Mana cost"] || ""
        }
      });
    }

    await sleep(10); // ✅ Respect Scryfall rate limit: 100ms/request
  }

  self.postMessage({ type: "batch", data: results });
};
