// Cards/build-cards-json.js
// Processes cards.csv and Scryfall bulk data ('default-cards')
// to create data/cards.json for the frontend application.

// Dependencies: npm install papaparse
import { promises as fs, createWriteStream as createWriteStreamSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import Papa from 'papaparse';
import os from 'node:os'; // <-- Import os module

// --- Configuration ---
const CSV_FILE = "cards.csv"; // Input CSV file path (in the same directory as script)
const OUTPUT_FILE = "data/cards.json"; // Main output JSON file path
const UNMATCHED_CSV_OUTPUT_FILE = "data/unmatched_cards.json"; // Output for unmatched CSV rows

// --- Cache Location ---
const desktopDir = path.join(os.homedir(), 'Desktop'); // Get user's Desktop path
const CACHE_DIR = desktopDir; // Use Desktop directory for cache
console.log(`ℹ️ Using cache directory: ${CACHE_DIR}`); // Log the cache path being used
// --------------------

const BULK_FILE_NAME = "default-cards.json"; // Scryfall bulk file type (includes tokens)
const BULK_FILE_PATH = path.join(CACHE_DIR, BULK_FILE_NAME); // Full path to cached bulk file on Desktop
const SCRYFALL_BULK_API = "https://api.scryfall.com/bulk-data/default-cards"; // API endpoint for bulk data info
const MY_PRICE_MULTIPLIER = 0.85; // Multiplier for calculating 'myPrice' if not in CSV
const VERBOSE_LOGGING = false; // Set true for detailed matching logs per card
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
 * Downloads Scryfall bulk data if cache is missing or invalid.
 * Uses streaming for efficient download and caching.
 * @returns {Promise<string>} - A promise that resolves with the file path of the cached bulk data.
 */
async function downloadBulkDataIfNeeded() {
    // Note: We don't need to ensureDir for Desktop as it should already exist.
    // If you wanted a subfolder on the Desktop, you would use ensureDir here.
    // await ensureDir(CACHE_DIR);

    // Basic check: download if file doesn't exist on Desktop
    if (!existsSync(BULK_FILE_PATH)) {
        console.log(`🌐 Cache miss on Desktop. Downloading Scryfall bulk data ('${BULK_FILE_NAME}')...`);
        try {
            // 1. Fetch metadata to get the download URI
            const metaRes = await fetch(SCRYFALL_BULK_API);
            if (!metaRes.ok) {
                throw new Error(`Failed to fetch bulk data metadata (${metaRes.status} ${metaRes.statusText}) from ${SCRYFALL_BULK_API}`);
            }
            const meta = await metaRes.json();
            const downloadUri = meta?.download_uri;
            if (!downloadUri) {
                throw new Error("Download URI not found in Scryfall bulk data metadata.");
            }
            console.log(`  Downloading from: ${downloadUri}`);

            // 2. Fetch the actual bulk data file using streaming
            const bulkRes = await fetch(downloadUri);
            if (!bulkRes.ok || !bulkRes.body) {
                throw new Error(`Failed to download bulk data file (${bulkRes.status} ${bulkRes.statusText})`);
            }

            // 3. Stream the download directly to the cache file on Desktop
            console.log(`  Saving to: ${BULK_FILE_PATH}`);
            const fileStream = createWriteStreamSync(BULK_FILE_PATH);
            await pipeline(bulkRes.body, fileStream); // Efficiently pipes the download stream to the file stream

            console.log(`✅ Bulk data downloaded and cached to Desktop: ${BULK_FILE_PATH}`);

        } catch (downloadError) {
            console.error(`❌ Failed to download or cache bulk data to Desktop: ${downloadError.message}`);
            // Attempt to clean up potentially incomplete cache file
            try {
                if (existsSync(BULK_FILE_PATH)) {
                    await fs.unlink(BULK_FILE_PATH);
                    console.log(`🧹 Cleaned up potentially incomplete cache file on Desktop: ${BULK_FILE_PATH}`);
                }
            } catch (cleanupError) {
                console.error(`⚠️ Failed to clean up cache file on Desktop: ${cleanupError.message}`);
            }
            throw downloadError; // Re-throw error to stop the script
        }
    } else {
         console.log(`✅ Using cached Scryfall bulk data from Desktop: ${BULK_FILE_PATH}`);
    }
     return BULK_FILE_PATH;
}

/**
 * Loads and parses the Scryfall bulk data from the cached file.
 * @param {string} bulkFilePath - Path to the cached bulk data JSON file (now on Desktop).
 * @returns {Promise<Array<Object>>} - A promise that resolves with the parsed bulk data array.
 */
async function loadBulkData(bulkFilePath) {
    console.log(`💾 Loading Scryfall bulk data from cache: ${bulkFilePath}`);
    try {
        const raw = await fs.readFile(bulkFilePath, "utf8");
        console.log(`  Parsing ${raw.length} bytes of JSON data... (This might take a moment)`);
        const parsedData = JSON.parse(raw);
        console.log(`  Successfully parsed bulk data.`);
        return parsedData;
    } catch (error) {
        console.error(`❌ Failed to read or parse bulk data cache ${bulkFilePath}: ${error.message}`);
        // Add a check for common Desktop access issues if needed (though less likely)
        if (error.code === 'ENOENT') {
             console.error(`\n>>> Cache file not found at expected Desktop location. Has it been downloaded previously? <<<\n`);
        } else if (error.code === 'EACCES') {
             console.error(`\n>>> Permission denied reading cache file from Desktop. Check file/folder permissions. <<<\n`);
        }
        throw error;
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
            header: true, // Use first row as headers
            skipEmptyLines: true, // Ignore empty lines
            dynamicTyping: true, // Automatically convert numbers, booleans
            transformHeader: header => header.trim() // Trim whitespace from headers
        });

        // Log parsing errors
        if (result.errors.length > 0) {
            console.warn("⚠️ Errors encountered during CSV parsing:");
            result.errors.slice(0, 5).forEach(err => console.warn(` - Row ${err.row}: ${err.message} (${err.code})`));
            if (result.errors.length > 5) console.warn(` ... (${result.errors.length - 5} more errors)`);
        }

        const requiredKeys = ["Name", "Set code", "Collector number", "Quantity"];
        const validData = result.data.filter(row => {
            const hasRequired = requiredKeys.every(key => row?.[key] != null && String(row?.[key]).trim() !== '');
            const hasValidQuantity = typeof row.Quantity === 'number' /* && row.Quantity >= 0 */;

            if (!hasRequired) {
                if (VERBOSE_LOGGING) console.log(`Skipping row: Missing required key(s) - ${JSON.stringify(row)}`);
                return false;
            }
            if (!hasValidQuantity) {
                 if (VERBOSE_LOGGING) console.log(`Skipping row: Invalid or zero Quantity - ${JSON.stringify(row)}`);
                 return false;
            }
            return true;
        });
        const skippedCount = result.data.length - validData.length;

        if (skippedCount > 0) {
            console.log(`  Skipped ${skippedCount} rows from CSV due to missing required data or invalid quantity.`);
        }
        console.log(`  Found ${validData.length} valid card entries in CSV.`);
        return validData;

    } catch (error) {
        console.error(`❌ Failed to read or parse CSV file ${filePath}: ${error.message}`);
        if (error.code === 'ENOENT') {
             console.error(`\n>>> Please ensure '${path.basename(filePath)}' exists in the script directory (${path.dirname(filePath)}) <<<\n`); // Adjusted path reporting
        }
        throw error;
    }
}

/**
 * Selects the best image URL from Scryfall data (border_crop > normal > large).
 * Handles single-faced and multi-faced cards.
 * @param {Object} imageUris - The image_uris object from Scryfall.
 * @param {Array<Object>} cardFaces - The card_faces array from Scryfall (for multi-faced cards).
 * @returns {string | null} - The selected image URL or null if none found.
 */
function getImageUrl(imageUris, cardFaces) {
    // Prioritize border_crop if available
    if (imageUris?.border_crop) return imageUris.border_crop;

    // Fallback to normal or large from primary imageUris
    if (imageUris?.normal) return imageUris.normal;
    if (imageUris?.large) return imageUris.large;

    // For multi-faced cards, check the first face
    if (cardFaces?.[0]?.image_uris?.border_crop) return cardFaces[0].image_uris.border_crop;
    if (cardFaces?.[0]?.image_uris?.normal) return cardFaces[0].image_uris.normal;
    if (cardFaces?.[0]?.image_uris?.large) return cardFaces[0].image_uris.large;

    // Default fallback if no usable image is found
    return null; // Return null explicitly if no image found
}

/**
 * Determines the market price based on finish and availability from Scryfall prices.
 * @param {Object} prices - The prices object from Scryfall data (e.g., { usd: '1.23', usd_foil: '4.56' }).
 * @param {string} csvFinish - The finish specified in the CSV ('foil', 'etched', 'normal', etc.).
 * @param {boolean} isPromo - Whether the card is considered a promo.
 * @returns {number} - The determined market price, defaulting to 0.
 */
function getMarketPrice(prices = {}, csvFinish = 'normal', isPromo = false) {
    if (!prices || Object.keys(prices).length === 0) {
        return 0; // No price data available (common for tokens)
    }

    let price = null;
    const finishLower = String(csvFinish || 'normal').toLowerCase(); // Ensure string and lowercase

    // Try to find price based on CSV finish preference
    if (finishLower === "etched" && prices.usd_etched != null) price = prices.usd_etched;
    else if (finishLower === "foil" && prices.usd_foil != null) price = prices.usd_foil;
    else if (prices.usd != null) price = prices.usd; // Default to non-foil if available

    // Fallback if preferred finish price was missing
    if (price == null) {
        if (prices.usd != null) price = prices.usd;
        else if (prices.usd_foil != null) price = prices.usd_foil;
        else if (prices.usd_etched != null) price = prices.usd_etched;
    }

    // Promo heuristic: If it's a promo and we ended up with non-foil price,
    // but a foil price exists, prefer the foil price.
    if (isPromo && prices.usd_foil != null && price === prices.usd) {
        price = prices.usd_foil;
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

        // 1. Load CSV and Ensure/Load Bulk Data
        console.time("Data Loading");
        const cardsFromCSV = await loadCSV(CSV_FILE);
        const bulkFilePath = await downloadBulkDataIfNeeded(); // Ensure bulk data is downloaded/cached on Desktop
        const bulkData = await loadBulkData(bulkFilePath); // Load the full bulk data from Desktop
        console.timeEnd("Data Loading");

        if (!cardsFromCSV || cardsFromCSV.length === 0) {
            console.log("🚫 No valid card entries found in CSV. Exiting.");
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
            if (!card.set || !card.collector_number) {
                continue;
            }
            const cleanCollectorNumber = String(card.collector_number).toLowerCase().replace(/[^0-9a-z★]/g, '');
            // include language code in index key
            const key = `${card.set}:${cleanCollectorNumber}:${card.lang}`.toLowerCase();            
            scryfallIndex.set(key, card);
            const rawCollectorNumberStr = String(card.collector_number).toLowerCase();
            if (rawCollectorNumberStr.includes("★") && rawCollectorNumberStr !== cleanCollectorNumber) {
                const keyWithStar = `${card.set}:${rawCollectorNumberStr}:${card.lang}`;                
                if (!scryfallIndex.has(keyWithStar)) {
                    scryfallIndex.set(keyWithStar, card);
                }
            }
        }
        console.timeEnd("Index Building");
        console.log(`  Index built with ${scryfallIndex.size} unique Scryfall entries.`);

        // 3. Enrich CSV data with Scryfall data
        console.log(`✨ Enriching ${cardsFromCSV.length} cards from CSV...`);
        console.time("Card Enrichment");
        const enrichedCards = [];
        const unmatchedCsvEntries = [];
        let matchCount = 0;
        let noMatchCount = 0;

        for (const csvCard of cardsFromCSV) {
            const name = csvCard["Name"];
            const setCode = csvCard["Set code"];
            const collectorNumberRaw = csvCard["Collector number"];
            // use the CSV’s Language column (default to English)
            const desiredLang = (csvCard["Language"] || 'en').toLowerCase();
            const quantity = csvCard["Quantity"];

            if (!name || !setCode || !collectorNumberRaw) {
                 console.warn(`Internal Skip: Row missing critical field after loadCSV filter - ${JSON.stringify(csvCard)}`);
                 continue;
            }

            const collectorNumberClean = String(collectorNumberRaw).toLowerCase().replace(/[^0-9a-z★]/g, '');
            // include desiredLang in the lookup
            const key = `${setCode}:${collectorNumberClean}:${desiredLang}`.toLowerCase();
                
                let match = scryfallIndex.get(key);

            const rawCollectorNumberStr = String(collectorNumberRaw).toLowerCase();
            if (!match && rawCollectorNumberStr.includes("★")) {
                const rawKey = `${setCode}:${rawCollectorNumberStr}:${desiredLang}`;
                match = scryfallIndex.get(rawKey);
            }

            if (!match) {
                if (VERBOSE_LOGGING) console.warn(`❓ No Scryfall match for key: ${key} (CSV Card: ${name}, Set: ${setCode}, CN: ${collectorNumberRaw})`);
                noMatchCount++;
                unmatchedCsvEntries.push({
                    reason: `No Scryfall match found for key: ${key}`,
                    csvData: csvCard
                });
                continue;
            }

            matchCount++;

            const csvFinishRaw = csvCard.Foil || csvCard.Finish || 'normal';
            const csvFinish = String(csvFinishRaw).toLowerCase();
            const isFoil = csvFinish === 'foil';
            const isEtched = csvFinish === 'etched';
            const isPromo = (csvCard["Promo?"] === true || csvCard.Promos === true || match.promo === true);

            const marketPrice = getMarketPrice(match.prices, csvFinish, isPromo);
            const imgUrl = getImageUrl(match.image_uris, match.card_faces);
            const myPrice = parseFloat(csvCard.myPrice ?? (marketPrice * MY_PRICE_MULTIPLIER).toFixed(2)) || 0;
            const cmc = typeof match.cmc === 'number' ? match.cmc : 0;

            const searchableText = [
                name,
                match.set_name,
                setCode,
                match.type_line,
                match.oracle_text,
                match.rarity,
                csvFinish
            ].filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, ' ');

            const uniqueId = `${match.id}${isFoil ? '_foil' : ''}${isEtched ? '_etched' : ''}`;

            enrichedCards.push({
                id: uniqueId,
                name: name,
                set: setCode,
                collectorNumber: collectorNumberRaw,
                quantity: quantity,
                isFoil: isFoil,
                isEtched: isEtched,
                isPromo: isPromo,
                marketPrice: marketPrice,
                myPrice: myPrice,
                cmc: cmc,
                searchableText: searchableText,
                imageUrl: imgUrl,
                setName: match.set_name,
                rarity: match.rarity,
                typeLine: match.type_line || "",
                oracleText: match.oracle_text || "",
                manaCost: match.mana_cost || "",
                colors: match.colors || [],
                colorIdentity: match.color_identity || [],
                keywords: match.keywords || [],
                layout: match.layout,
                scryfall: {
                    id: match.id,
                    oracle_id: match.oracle_id || null,
                    legalities: match.legalities || {},
                    reprint: match.reprint || false,
                    variation: match.variation || false,
                    prices: match.prices || {},
                },
            });
        } // End CSV loop
        console.timeEnd("Card Enrichment");

        // 4. Write Output Files
        await ensureDir(path.dirname(OUTPUT_FILE)); // Ensure output directory exists in project

        console.log(`\n💾 Writing ${enrichedCards.length} enriched cards to ${OUTPUT_FILE}...`);
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(enrichedCards, null, 2));

        // Write unmatched entries if any exist
        if (unmatchedCsvEntries.length > 0) {
            await ensureDir(path.dirname(UNMATCHED_CSV_OUTPUT_FILE)); // Ensure data dir exists
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

        // --- Summary ---
        console.log(`\n--- Build Summary ---`);
        console.log(` Total valid entries processed from CSV: ${cardsFromCSV.length}`);
        console.log(` ✅ Matched with Scryfall data: ${matchCount}`);
        console.log(` ❓ No Scryfall match found:       ${noMatchCount}`);
        console.log(`---------------------`);
        console.timeEnd("Total Build Time");
        console.log(`\n✅ Done! Output file generated at: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("\n❌ An error occurred during the build process:", error);
        process.exit(1); // Exit with error code
    }
}

// --- Run the main function ---
buildCardData();