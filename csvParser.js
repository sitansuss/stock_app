// csvParser.js - Make sure your file matches this exactly

/**
 * Parses a date string, attempting common formats like YYYY-MM-DD and DD-MM-YYYY.
 * @param {string} dateStr The date string to parse.
 * @returns {Date|null} A Date object in UTC, or null if parsing fails.
 */
function parseDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmedDateStr = dateStr.trim();

    // 1. Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDateStr)) {
        const date = new Date(trimmedDateStr + 'T00:00:00Z'); // Assume UTC
        if (!isNaN(date.getTime())) return date;
    }

    // 2. Try DD-MM-YYYY format
    const match = trimmedDateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10); // 1-based month
        const year = parseInt(match[3], 10);
        if (year > 1000 && year < 3000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const date = new Date(Date.UTC(year, month - 1, day)); // Month is 0-indexed for Date.UTC
            if (!isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
                 return date;
            }
        }
    }

    if (trimmedDateStr) console.warn(`[CSV Parser] Could not parse date string: "${trimmedDateStr}"`);
    return null;
}

/**
 * Safely parses a value into a floating-point number. Handles strings, numbers, NaN, null.
 * @param {*} value The value to parse.
 * @returns {number|null} The parsed number, or null if parsing fails or input is invalid.
 */
function safeParseFloat(value) {
     if (value === null || value === undefined) return null;
     if (typeof value === 'number' && !isNaN(value)) return value; // Already a number
     if (typeof value === 'string') {
        const trimmedValue = value.trim();
        // Handle specific non-numeric strings that should be treated as null
        if (trimmedValue === '' || trimmedValue.toLowerCase() === 'nan' || trimmedValue.toLowerCase() === 'null' || trimmedValue === '-') {
             return null;
        }
        // Attempt to parse the string as a float
        const parsed = parseFloat(trimmedValue);
        // Check if the result is a valid number
        if (!isNaN(parsed)) {
            return parsed;
        }
     }
     // If it's a non-empty string that couldn't be parsed, log a warning
     if (typeof value === 'string' && value.trim() !== '') {
        console.warn(`[CSV Parser] Could not parse value to float: "${value}" (Trimmed: "${value.trim()}"). Returning null.`);
     }
     return null; // Return null for anything else that couldn't be parsed
}


/**
 * Processes raw data rows parsed by PapaParse into a structured format.
 * @param {Array<Object>} data Array of row objects from PapaParse.
 * @param {number} headerRowsCount Number of header rows (usually 1). Used for accurate row number logging.
 * @returns {Object} An object mapping index/company names to arrays of data points.
 */
function processDataRows(data, headerRowsCount = 1) {
    const processedData = {}; // { indexName: [ { date, open, high, low, close, _parsedDate } ] }
    const baseRowNum = headerRowsCount + 1; // File row number starts after header(s)

    data.forEach((row, index) => {
        const currentFileRowNum = baseRowNum + index;
        // Assume headers are already cleaned (lowercase, snake_case)
        const indexName = row.index_name ? String(row.index_name).trim() : null;
        const dateString = row.index_date ? String(row.index_date).trim() : null;

        if (!indexName || !dateString) {
            if (Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')) {
                 console.warn(`[CSV Parser] Skipping file row #${currentFileRowNum}: Missing index_name or index_date. Row:`, row);
            }
            return;
        }

        const parsedDate = parseDateString(dateString);
        if (!parsedDate) {
            console.warn(`[CSV Parser] Skipping file row #${currentFileRowNum} for index "${indexName}": Unparseable date "${dateString}"`);
            return;
        }

        // Use safeParseFloat for all numeric columns
        const open = safeParseFloat(row.open_index_value);
        const high = safeParseFloat(row.high_index_value);
        const low = safeParseFloat(row.low_index_value);
        const close = safeParseFloat(row.closing_index_value);

        // Require at least a valid closing value? Maybe not, allow rows with only some valid data?
        // Let's allow rows even if only some values are valid, chart will show gaps.
        // Commenting out the strict close check:
        // if (close === null) {
        //     console.warn(`[CSV Parser] Skipping file row #${currentFileRowNum} for index "${indexName}": Invalid/missing closing value "${row.closing_index_value || ''}"`);
        //     return;
        // }

        if (!processedData[indexName]) processedData[indexName] = [];

        processedData[indexName].push({
            date: dateString, open: open, high: high, low: low, close: close,
            _parsedDate: parsedDate // Keep JS Date object for sorting/filtering
        });
    });

    for (const indexName in processedData) {
        try {
            processedData[indexName].sort((a, b) => a._parsedDate.getTime() - b._parsedDate.getTime());
        } catch (e) {
            console.error(`[CSV Parser] Error sorting dates for index ${indexName}.`, e);
        }
    }
    console.log(`[CSV Parser] Processed ${Object.keys(processedData).length} unique indices/companies.`);
    return processedData;
}


/**
 * Main function to parse CSV text using PapaParse.
 * @param {string} csvText The raw CSV text content.
 * @returns {Promise<Object>} A promise resolving with the processed data object.
 */
function parseStockData(csvText) {
    console.log("[CSV Parser] Starting parsing process...");
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: false, // Handle typing manually
            transformHeader: header => String(header || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            complete: (results) => {
                console.log("[CSV Parser] PapaParse complete callback triggered.");

                if (results.errors.length > 0) {
                    console.error("[CSV Parser] PapaParse reported errors:", results.errors);
                    let errorMsg = `Error parsing CSV (${results.errors.length} errors). `;
                    const firstError = results.errors[0];
                    if (firstError) { const rowNum = (firstError.row ?? 'unknown') + 2; errorMsg += `First error: "${firstError.message || 'Unknown'}" (Code: ${firstError.code}, Approx. File Row: ${rowNum}). Check CSV format.`; }
                    return reject(new Error(errorMsg));
                }

                if (!results.meta || !results.meta.fields || results.meta.fields.length === 0) return reject(new Error("CSV Parsing Error: Could not detect valid headers."));

                const detectedHeaders = results.meta.fields;
                console.log("[CSV Parser] Cleaned headers found:", detectedHeaders);

                const essentialHeaders = ['index_name', 'index_date', 'closing_index_value'];
                const supplementaryHeaders = ['open_index_value', 'high_index_value', 'low_index_value'];

                const missingEssential = essentialHeaders.filter(h => !detectedHeaders.includes(h));
                if (missingEssential.length > 0) { const msg = `CSV Format Error: Missing ESSENTIAL columns: ${missingEssential.join(', ')}.`; console.error(`[CSV Parser] ${msg}`); return reject(new Error(msg)); }

                const missingSupplementary = supplementaryHeaders.filter(h => !detectedHeaders.includes(h));
                 if (missingSupplementary.length > 0) console.warn(`[CSV Parser] Note: Missing supplementary columns: ${missingSupplementary.join(', ')}. Open/High/Low data may be incomplete.`);

                 if (!results.data || results.data.length === 0) { console.warn("[CSV Parser] CSV has headers but no data rows."); return resolve({}); }
                 console.log(`[CSV Parser] Found ${results.data.length} data rows. Starting processing...`);

                try {
                    const processedData = processDataRows(results.data, 1);
                    console.log("[CSV Parser] Data processing finished successfully.");
                    resolve(processedData);
                } catch (processingError) { console.error("[CSV Parser] Error during custom data processing:", processingError); reject(new Error(`Data Processing Failed: ${processingError.message}`)); }
            },
            error: (error) => { console.error("[CSV Parser] PapaParse Streaming Error:", error); reject(new Error(`CSV Stream Error: ${error.message || 'Unknown PapaParse stream error'}`)); }
        });
    });
}

// Export the main function
export { parseStockData };