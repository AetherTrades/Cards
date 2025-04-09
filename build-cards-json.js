// build-cards-json.js

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const fetch = require("node-fetch"); // Use node-fetch v2!

const INPUT_CSV = "./cards.csv";
const OUTPUT_JSON = "./data/cards.json"; // Adjust if needed

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchScryfallData(id) {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/${id}`);
    if (!res.ok) throw new Error(`Scryfall returned ${res.status}`);
    const card = await res.json();

    const imgUrl =
      card.image_uris?.border_crop ||
      card.card_faces?.[0]?.image_uris?.border_crop ||
      "";

    return {
      oracle_text: card.oracle_text || "",
      mana_cost: card.mana_cost || "",
      rarity: card.rarity || "",
      set_name: card.set_name || "",
      layout: card.layout || "",
      promo: card.promo || false,
      type_line: card.type_line || "",
      imgUrl,
      prices: {
        usd: card.prices?.usd || "0",
        foil: card.prices?.usd_foil || "0",
        etched: card.prices?.usd_etched || "0"
      }
    };
  } catch (err) {
    console.warn(`⚠️ Failed to fetch ${id}: ${err.message}`);
    return null;
  }
}

async function main() {
  const csvText = fs.readFileSync(INPUT_CSV, "utf-8");
  const { data: cards } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`📦 Parsed ${cards.length} cards from CSV.\n`);

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const id = card["Scryfall ID"];

    if (!id) {
      console.warn(`❌ Skipping card missing Scryfall ID: "${card.Name}"`);
      continue;
    }

    console.log(`🔄 [${i + 1}/${cards.length}] Fetching: ${card.Name}`);
    const scryfall = await fetchScryfallData(id);

    if (scryfall) {
      card.scryfall = scryfall;
    }

    await sleep(5); // Respect Scryfall's rate limit
  }

  // Ensure the output folder exists
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cards, null, 2));

  console.log(`\n✅ Done! Output written to: ${OUTPUT_JSON}`);
}

main();
