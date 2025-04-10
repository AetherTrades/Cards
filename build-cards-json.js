// Cards/build-cards-json.js
// Refactored using ES Modules and modern Node.js features
// Now includes output for unmatched CSV entries
// Handles regular cards and tokens found in the default Scryfall bulk data.

// Dependencies: npm install papaparse
import { promises as fs, createWriteStream as createWriteStreamSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import Papa from 'papaparse';

// --- Configuration ---
const CSV_FILE = "cards.csv";
const OUTPUT_FILE = "data/cards.json";
const UNMATCHED_CSV_OUTPUT_FILE = "data/unmatched_cards.json"; // Output for unmatched cards
const CACHE_DIR = ".cache";
const BULK_FILE_NAME = "default-cards.json"; // Includes cards and tokens
const BULK_FILE_PATH = path.join(CACHE_DIR, BULK_FILE_NAME);
const SCRYFALL_BULK_API = "https://api.scryfall.com/bulk-data/default-cards";
// Consider making this configurable via environment variable or command-line arg
const MY_PRICE_MULTIPLIER = 0.85;
const VERBOSE_LOGGING = false; // Set true for detailed matching logs
// --------------------

/**
 * Ensures a directory exists, creating it recursively if necessary.
 * @param {string} dirPath - The directory path to ensure.
 */
async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') { // Ignore error only if directory already exists
            console.error(`❌ Failed to ensure directory ${dirPath}:`, error);
            throw error;
        }
    }
}

/**
 * Fetches and caches Scryfall bulk data using streaming.
 * The "default-cards" bulk data includes regular cards and tokens.
 * @returns {Promise<Array<Object>>} - A promise that resolves with the parsed bulk data.
 */
async function getBulkData() {
    await ensureDir(CACHE_DIR);

    if (existsSync(BULK_FILE_PATH)) {
        try {
            console.log(`✅ Using cached Scryfall bulk data from: ${BULK_FILE_PATH}`);
            const raw = await fs.readFile(BULK_FILE_PATH, "utf8");
            return JSON.parse(raw);
        } catch (readError) {
            console.warn(`⚠️ Error reading cache file (${readError.message}). Attempting download...`);
            // Proceed to download if reading cache fails
        }
    } else {
        console.log(`🌐 Cache not found at ${BULK_FILE_PATH}. Downloading Scryfall bulk data ('default-cards')...`);
    }

    // Download logic
    try {
        const metaRes = await fetch(SCRYFALL_BULK_API);
        if (!metaRes.ok) {
            throw new Error(`Failed to fetch bulk data metadata (${metaRes.status} ${metaRes.statusText}) from ${SCRYFALL_BULK_API}`);
        }
        const meta = await metaRes.json();
        const downloadUri = meta?.download_uri;
        if (!downloadUri) {
            throw new Error("Download URI not found in Scryfall bulk data metadata.");
        }
        console.log(` Downloading from: ${downloadUri}`);

        const bulkRes = await fetch(downloadUri);
        if (!bulkRes.ok || !bulkRes.body) {
            throw new Error(`Failed to download bulk data file (${bulkRes.status} ${bulkRes.statusText})`);
        }

        // Stream download to file
        const bulkDataRaw = await bulkRes.json();

        // Load CSV identifiers to a Set
        const cardsFromCSV = await loadCSV(CSV_FILE);
        const identifiers = new Set(cardsFromCSV.map(csvCard => {
            const setCode = csvCard["Set code"];
            const collectorNumberRaw = csvCard["Collector number"];
            const collectorNumberClean = String(collectorNumberRaw).toLowerCase().replace(/[^0-9a-z★]/g, '');
            return `${setCode}:${collectorNumberClean}`.toLowerCase();
        }));

        // Filter bulk data
        const filteredBulkData = bulkDataRaw.filter(card => {
            if (!card.set || !card.collector_number) return false;
            const cleanCollectorNumber = String(card.collector_number).toLowerCase().replace(/[^0-9a-z★]/g, '');
            const key = `${card.set}:${cleanCollectorNumber}`.toLowerCase();
            return identifiers.has(key);
        });

        await fs.writeFile(BULK_FILE_PATH, JSON.stringify(filteredBulkData, null, 2));
        console.log(`✅ Bulk data downloaded and cached to: ${BULK_FILE_PATH}`);

        return filteredBulkData;

    } catch (downloadError) {
        console.error(`❌ Failed to download or process bulk data: ${downloadError.message}`);
        // Attempt to clean up potentially incomplete cache file
        try {
            if (existsSync(BULK_FILE_PATH)) {
                await fs.unlink(BULK_FILE_PATH);
                console.log(`🧹 Cleaned up incomplete cache file: ${BULK_FILE_PATH}`);
            }
        } catch (cleanupError) {
            console.error(`⚠️ Failed to clean up cache file: ${cleanupError.message}`);
        }
        throw downloadError; // Re-throw error to stop the script
    }
}

/**
 * Parses the CSV file asynchronously.
 * @param {string} filePath - Path to the CSV file.
 * @returns {Promise<Array<Object>>} - A promise that resolves with parsed CSV data.
 */
async function loadCSV(filePath) {
    console.log(`📄 Reading CSV file: ${filePath}`);
    try {
        const csvContent = await fs.readFile(filePath, "utf8");
        const result = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Automatically infer types
        });

        if (result.errors.length > 0) {
            console.warn("⚠️ Errors encountered during CSV parsing:");
            result.errors.slice(0, 5).forEach(err => console.warn(` - Row ${err.row}: ${err.message} (${err.code})`));
            if (result.errors.length > 5) console.warn(` ... (${result.errors.length - 5} more errors)`);
        }

        // Filter out rows missing essential keys for matching AT THIS STAGE
        // These keys are needed for both cards and tokens for matching
        const validData = result.data.filter(c => c?.Name && c?.["Set code"] && c?.["Collector number"]);
        const skippedCount = result.data.length - validData.length;
        if (skippedCount > 0) {
            console.log(` Skipped ${skippedCount} rows from CSV due to missing Name, Set code, or Collector number.`);
        }
        console.log(` Found ${validData.length} potentially valid card/token entries in CSV.`);
        return validData;

    } catch (error) {
        console.error(`❌ Failed to read or parse CSV file ${filePath}: ${error.message}`);
        throw error;
    }
}

/**
 * Selects the best image URL from Scryfall data.
 * @param {Object} imageUris - The image_uris object from Scryfall.
 * @param {Array<Object>} cardFaces - The card_faces array from Scryfall (for multi-faced cards).
 * @returns {string} - The selected image URL or an empty string.
 */
/**
 * Selects the best image URL from Scryfall data.
 * @param {Object} imageUris - The image_uris object from Scryfall.
 * @param {Array<Object>} cardFaces - The card_faces array from Scryfall (for multi-faced cards).
 * @returns {string} - The selected image URL or an empty string.
 */
function getImageUrl(imageUris, cardFaces) {
    // Prioritize the border-cropped version first if available
    if (imageUris?.border_crop) return imageUris.border_crop;
    
    // Fallback: Use the normal or large image from the primary imageUris object
    if (imageUris?.normal) return imageUris.normal;
    if (imageUris?.large) return imageUris.large;
    
    // For multi-faced cards, check the first face for a border-cropped version first
    if (cardFaces?.[0]?.image_uris?.border_crop) return cardFaces[0].image_uris.border_crop;
    if (cardFaces?.[0]?.image_uris?.normal) return cardFaces[0].image_uris.normal;
    if (cardFaces?.[0]?.image_uris?.large) return cardFaces[0].image_uris.large;
    
    // Default fallback if no usable image is found
    return "";
  }
  

/**
 * Determines the market price based on finish and availability.
 * Tokens generally don't have market prices in Scryfall's price data.
 * @param {Object} prices - The prices object from Scryfall data.
 * @param {string} csvFinish - The finish specified in the CSV ('foil', 'etched', 'normal', etc.).
 * @param {boolean} isPromo - Whether the card is considered a promo.
 * @returns {number} - The determined market price, defaulting to 0.
 */
function getMarketPrice(prices = {}, csvFinish = 'normal', isPromo = false) {
    // Tokens typically lack price data, so prices will likely be null.
    if (!prices || Object.keys(prices).length === 0) {
        return 0;
    }

    let price = null;
    const finishLower = csvFinish.toLowerCase(); // Ensure consistent casing

    // Prioritize based on CSV finish
    if (finishLower === "etched" && prices.usd_etched != null) price = prices.usd_etched;
    else if (finishLower === "foil" && prices.usd_foil != null) price = prices.usd_foil;
    else if (prices.usd != null) price = prices.usd; // Default to non-foil if available

    // Fallback if preferred finish price is missing
    if (price == null) {
        if (prices.usd != null) price = prices.usd;
        else if (prices.usd_foil != null) price = prices.usd_foil;
        else if (prices.usd_etched != null) price = prices.usd_etched;
    }

    // Promo heuristic: If it's a promo and we have a foil price, prefer foil price if current price is non-foil or null.
    // This might apply to promo tokens if they somehow get foil price data, but less likely.
    if (isPromo && prices.usd_foil != null && (price == null || price === prices.usd)) {
        price = prices.usd_foil;
        if (VERBOSE_LOGGING) console.log(` Promo heuristic applied: using foil price ${price}`);
    }

    // Final conversion to number
    return parseFloat(price || "0");
}


/**
 * Main function to build the enriched card data JSON.
 */
async function buildCardData() {
    try {
        console.time("Total Build Time");

        // 1. Load CSV and Bulk Data concurrently
        console.time("Data Loading");
           const cardsFromCSV = await loadCSV(CSV_FILE);

        const bulkData = await getBulkData(); // Fetches "default-cards" which includes tokens
        console.timeEnd("Data Loading");

        if (!cardsFromCSV || cardsFromCSV.length === 0) {
            console.log("🚫 No valid card/token entries found in CSV. Exiting.");
            return;
        }
        if (!bulkData || bulkData.length === 0) {
            console.log("🚫 Failed to load Scryfall bulk data. Exiting.");
            return;
        }

        // 2. Build Index from Bulk Data
        console.time("Index Building");
        const scryfallIndex = new Map();
        for (const card of bulkData) {
            // *** MODIFIED: Removed filter that excluded tokens ***
            // Now includes cards with layout 'token', 'emblem', etc. if they have set/collector_number
            // We rely on the CSV having entries for the tokens we want to match.
            // Basic filter for entries that are unlikely to match CSV structure (e.g., art cards without numbers)
             if (!card.set || !card.collector_number) {
                 // Optional: Log if skipping bulk entries lacking set/collector_number
                 // if (VERBOSE_LOGGING) console.log(` Skipping bulk entry (no set/collector_number): ${card.name} (${card.id})`);
                 continue;
             }

            // Handle variations in collector numbers (e.g., "100a" vs "100", "T1", "5★")
            // Keep only the alphanumeric part and potential star for matching
            const cleanCollectorNumber = String(card.collector_number).toLowerCase().replace(/[^0-9a-z★]/g, '');
            const key = `${card.set}:${cleanCollectorNumber}`.toLowerCase();
            // Overwrite duplicates, assuming the last entry in bulk is sufficient (unlikely to matter much for tokens)
            scryfallIndex.set(key, card);

            // Add entry for full art ★ suffix if present and differs from cleaned version
            if (card.collector_number.includes("★") && !cleanCollectorNumber.endsWith("★")) {
                const keyWithStar = `${card.set}:${card.collector_number.toLowerCase()}`; // Keep star in this key
                scryfallIndex.set(keyWithStar, card);
            }
        }
        console.timeEnd("Index Building");
        console.log(` Index built with ${scryfallIndex.size} unique entries (including cards and tokens).`);

        // 3. Enrich CSV data with Scryfall data
        console.log(`✨ Enriching ${cardsFromCSV.length} cards/tokens from CSV...`);
        console.time("Card Enrichment");
        const enrichedCards = [];
        const unmatchedCsvEntries = [];
        let matchCount = 0;
        let noMatchCount = 0;

        for (const csvCard of cardsFromCSV) {
            const setCode = csvCard["Set code"];
            const collectorNumberRaw = csvCard["Collector number"];

            // Basic check (already done in loadCSV, but good safety)
            if (!setCode || !collectorNumberRaw) {
                 if (VERBOSE_LOGGING) console.warn(` Skipping CSV row (missing Set code or Collector number): ${csvCard.Name || 'Unknown Name'} (Raw CN: ${collectorNumberRaw})`);
                 unmatchedCsvEntries.push({
                     reason: "Missing Set code or Collector number in CSV",
                     csvData: csvCard
                 });
                 continue;
            }

            // Clean CSV collector number similarly to the index key
            const collectorNumberClean = String(collectorNumberRaw).toLowerCase().replace(/[^0-9a-z★]/g, '');

            const key = `${setCode}:${collectorNumberClean}`.toLowerCase();
            let match = scryfallIndex.get(key);

            // Attempt match with raw collector number if clean fails and raw contains star
            // (Handles cases where CSV has "5★" and index has "set:5★")
            if (!match && String(collectorNumberRaw).includes("★")) {
                const rawKey = `${setCode}:${String(collectorNumberRaw).toLowerCase()}`;
                match = scryfallIndex.get(rawKey);
                 if (match && VERBOSE_LOGGING) console.log(` Match found using raw collector number key: ${rawKey}`);
            }

            if (!match) {
                if (VERBOSE_LOGGING) console.warn(`❓ No Scryfall match for key: ${key} (CSV Card: ${csvCard.Name}, Set: ${setCode}, CN: ${collectorNumberRaw})`);
                noMatchCount++;
                unmatchedCsvEntries.push({
                    reason: `No Scryfall match found for key: ${key} (using clean CN)`,
                    csvData: csvCard
                });
                continue; // Skip to next card/token
            }

            // --- Match Found ---
            matchCount++;
            // Determine finish/promo status from CSV and Scryfall data
            const csvFinish = (csvCard.Foil || "normal").toLowerCase();
            // Consider 'Promo?' column if it exists, otherwise rely on Scryfall `promo` field.
            const isPromo = (csvCard["Promo?"] === true || csvCard.Promos === true || match.promo === true);
            // Tokens generally don't have prices, getMarketPrice will return 0.
            const marketPrice = getMarketPrice(match.prices, csvFinish, isPromo);
            const imgUrl = getImageUrl(match.image_uris, match.card_faces);

            enrichedCards.push({
                ...csvCard, // Keep original CSV data
                scryfall: { // Nest relevant Scryfall data
                    id: match.id,
                    // Tokens might lack oracle_id, mana_cost, cmc, colors, legalities
                    oracle_id: match.oracle_id || null, // Use null if missing
                    name: match.name,
                    set: match.set,
                    set_name: match.set_name,
                    collector_number: match.collector_number,
                    rarity: match.rarity, // Often 'token' for tokens
                    layout: match.layout, // Will be 'token' for tokens
                    type_line: match.type_line || "", // Tokens have type lines
                    oracle_text: match.oracle_text || "", // Tokens might have reminder text
                    mana_cost: match.mana_cost || "", // Empty for tokens
                    cmc: match.cmc || 0, // 0 for tokens
                    colors: match.colors || [], // Empty for tokens unless specified (uncommon)
                    color_identity: match.color_identity || [], // May exist based on abilities/frame
                    legalities: match.legalities || {}, // Empty for tokens
                    promo: match.promo || false,
                    reprint: match.reprint || false,
                    variation: match.variation || false,
                    imgUrl: imgUrl,
                    prices: match.prices || {}, // Will be empty/null for tokens
                },
                // Market price will be 0 for most tokens
                marketPrice: marketPrice,
                myPrice: (marketPrice * MY_PRICE_MULTIPLIER).toFixed(2), // Will be "0.00" for tokens
                searchableText: [csvCard.Name, match.set_name, card["Set code"],match.type_line, match.oracle_text,match.rarity].filter(Boolean).join(" ").toLowerCase()
            });
        }
        console.timeEnd("Card Enrichment");

        // 4. Write Output Files
        await ensureDir(path.dirname(OUTPUT_FILE)); // Ensure output directory exists

        console.log(`\n💾 Writing ${enrichedCards.length} enriched cards/tokens to ${OUTPUT_FILE}...`);
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(enrichedCards, null, 2));

        // Write unmatched entries if any exist
        if (unmatchedCsvEntries.length > 0) {
            await ensureDir(path.dirname(UNMATCHED_CSV_OUTPUT_FILE)); // Ensure output directory exists
            console.log(`💾 Writing ${unmatchedCsvEntries.length} unmatched CSV entries to ${UNMATCHED_CSV_OUTPUT_FILE}...`);
            try {
                await fs.writeFile(UNMATCHED_CSV_OUTPUT_FILE, JSON.stringify(unmatchedCsvEntries, null, 2));
            } catch (writeError) {
                console.error(`❌ Failed to write unmatched cards file: ${writeError.message}`);
            }
        } else {
            console.log("✅ No unmatched CSV entries to write.");
            // Optionally remove the unmatched file if it exists from a previous run
            try {
                if (existsSync(UNMATCHED_CSV_OUTPUT_FILE)) {
                    await fs.unlink(UNMATCHED_CSV_OUTPUT_FILE);
                    console.log(`🗑️ Removed previous ${UNMATCHED_CSV_OUTPUT_FILE}.`);
                }
            } catch (unlinkError) {
                console.warn(`⚠️ Could not remove previous ${UNMATCHED_CSV_OUTPUT_FILE}: ${unlinkError.message}`);
            }
        }

        console.log(`\n--- Build Summary ---`);
        console.log(` Total cards/tokens processed from CSV: ${cardsFromCSV.length}`);
        console.log(` ✅ Matched with Scryfall data: ${matchCount}`);
        console.log(` ❓ No Scryfall match found:    ${noMatchCount}`);
        console.log(`---------------------`);
        console.timeEnd("Total Build Time");
        console.log(`\n✅ Done!`);

    } catch (error) {
        console.error("\n❌ An error occurred during the build process:", error);
        process.exit(1); // Exit with error code
    }
}

// --- Run the main function ---
buildCardData();