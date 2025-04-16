// --- User Provided Collection Data ---
const USER_COLLECTIONS = {
    27152: "Utils",
    5985: "Account Sites",
    5977: "ChatAI",
    5982: "Arr",
    5986: "Nintendo Switch Sites",
    5987: "Things to Buy",
    5991: "COH Server",
    5988: "Travel Sites",
    5990: "Game Links",
    5994: "Github Repos",
    5995: "Linux Bookmarks",
    5997: "Web Apps",
    5998: "Sysadmin Links",
    27154: "Media Stuff",
    27155: "Server Applications",
    5999: "Software Development",
    6000: "Unorganized"
};

// --- DOM Element References ---
const fileInput = document.getElementById('jsonFile');
const convertButton = document.getElementById('convertButton');
const statusDiv = document.getElementById('status');

// --- Helper Functions ---

/**
 * Safely escape text for HTML.
 * @param {string | null | undefined} text - The text to escape.
 * @returns {string} - The escaped HTML string.
 */
function escapeHtml(text) {
    if (text == null) return ''; // Handle null or undefined
    return String(text) // Ensure it's a string
           .replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;');
}

/**
 * Convert an ISO 8601-like date string to a UNIX timestamp (seconds).
 * Handles potential timezone info and milliseconds.
 * Returns current timestamp if input is invalid or missing.
 * @param {string | null | undefined} dateStr - The date string.
 * @returns {number} - UNIX timestamp in seconds.
 */
function dateToTimestamp(dateStr) {
    if (!dateStr) {
        return Math.floor(Date.now() / 1000);
    }
    try {
        // Date.parse() handles ISO 8601 including 'Z' quite well.
        // It returns milliseconds since epoch, or NaN on failure.
        const timestampMs = Date.parse(dateStr);
        if (isNaN(timestampMs)) {
            // Fallback for potential non-standard formats if needed,
            // but Date.parse is generally robust for ISO-like strings.
            console.warn(`Could not parse date: ${dateStr}. Using current time.`);
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor(timestampMs / 1000); // Convert ms to seconds
    } catch (e) {
        console.error(`Error parsing date string "${dateStr}":`, e);
        return Math.floor(Date.now() / 1000); // Fallback
    }
}

// --- HTML Generation Functions ---

function generateHtmlHeader() {
    return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;
}

function generateHtmlFooter() {
     // The outer DL corresponds to the main "Bookmarks" H1
     return `</DL><p>\n`;
}

function generateBookmarkItem(bookmark) {
    const title = escapeHtml(bookmark.name || 'Untitled');
    const url = escapeHtml(bookmark.url || '#');
    // Linkwarden might use 'createdAt' or similar
    const addDate = dateToTimestamp(bookmark.createdAt || bookmark.created_at);
    // Linkwarden might use 'updatedAt' or similar
    const lastModified = dateToTimestamp(bookmark.updatedAt || bookmark.updated_at);
    const description = escapeHtml(bookmark.description || '');

    // Indentation for readability in the output file
    let itemHtml = `        <DT><A HREF="${url}" ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}">${title}</A>\n`;
    if (description) {
        itemHtml += `        <DD>${description}\n`;
    }
    return itemHtml;
}

 function generateFolderItem(name) {
    const folderName = escapeHtml(name);
    const timestamp = Math.floor(Date.now() / 1000); // Use current time for folder dates
    // Indentation for readability
    return `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${folderName}</H3>\n    <DL><p>\n`;
}

function closeFolderItem() {
    // Closes the DL opened by generateFolderItem
    return `    </DL><p>\n`;
}

// --- Core Conversion Logic ---

/**
 * Processes the parsed JSON data and generates the HTML bookmark string.
 * @param {object | Array} data - The parsed JSON data from Linkwarden.
 * @returns {{html: string | null, error: string | null}} - Object containing HTML string or error message.
 */
function processData(data) {
    let bookmarks = [];
    let errorMessage = null;

    // --- Data Organization ---
    // Check if the main structure is an object and contains 'collections' array
    if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'collections' in data && Array.isArray(data.collections)) {
        console.log(`Found ${data.collections.length} collection objects in JSON.`);
        data.collections.forEach(collObj => {
            // Check if the item in 'collections' is an object and has a 'links' array
            if (typeof collObj === 'object' && collObj !== null && Array.isArray(collObj.links)) {
                bookmarks.push(...collObj.links); // Add links from this collection
            } else {
                 const collName = collObj?.name || 'N/A';
                 const collId = collObj?.id || 'N/A';
                 console.warn(`Expected an array for 'links' in collection '${collName}' (ID: ${collId}), but found type ${typeof collObj?.links}. Skipping.`);
            }
        });
    }
    // Handle cases where the JSON root itself might be an array of bookmarks (less likely for Linkwarden export)
    else if (Array.isArray(data)) {
         console.log("JSON root is an array. Attempting to treat items as bookmarks directly.");
         bookmarks = data.filter(item => typeof item === 'object' && item !== null); // Basic check
    }
    // If neither structure matches
    else {
        errorMessage = "Invalid JSON structure: Expected an object with a 'collections' array containing 'links', or a root array of bookmarks.";
        console.error(errorMessage, data); // Log the problematic data structure
        return { html: null, error: errorMessage };
    }

    if (bookmarks.length === 0) {
        console.warn("No bookmarks were extracted from the JSON data.");
         // Generate empty file structure if no bookmarks found but JSON was valid
         let htmlOutput = [generateHtmlHeader(), generateHtmlFooter()];
         return { html: htmlOutput.join(""), error: null }; // Return empty but valid HTML
    }

    console.log(`Successfully extracted ${bookmarks.length} total bookmarks.`);

    // --- Group bookmarks by collection ID ---
    const bookmarksByCollection = {};
    const uncategorizedBookmarks = [];

    bookmarks.forEach(bm => {
        // Ensure bm is a valid object before accessing properties
        if (typeof bm !== 'object' || bm === null) {
            console.warn("Skipping invalid item in bookmarks list:", bm);
            return; // Skip this item
        }

        let collectionId = bm.collectionId; // May be number, string, null, undefined

        if (collectionId != null) { // Check for null or undefined explicitly
            const parsedId = parseInt(collectionId, 10);
            if (!isNaN(parsedId)) {
                collectionId = parsedId; // Use the number version if parsing succeeds
            } else {
                // If collectionId exists but is not a valid number string
                console.warn(`Invalid non-integer collectionId found: ${bm.collectionId} for bookmark '${bm.name || 'N/A'}'. Placing in Uncategorized.`);
                collectionId = null; // Treat as uncategorized
            }
        } else {
            // collectionId is null or undefined
            collectionId = null;
        }

        // Check against the hardcoded map using the potentially parsed numeric ID
        if (collectionId !== null && USER_COLLECTIONS.hasOwnProperty(collectionId)) {
            if (!bookmarksByCollection[collectionId]) {
                bookmarksByCollection[collectionId] = [];
            }
            bookmarksByCollection[collectionId].push(bm);
        } else {
             // Add to uncategorized if ID is null, undefined, or not in USER_COLLECTIONS
             if (collectionId !== null) { // Log only if it had an ID that wasn't found
                 console.info(`Bookmark '${bm.name || 'N/A'}' has collectionId ${bm.collectionId}, which is not in the predefined list. Placing in Uncategorized.`);
             }
            uncategorizedBookmarks.push(bm);
        }
    });

    // --- Generate HTML ---
    let htmlOutput = [];
    htmlOutput.push(generateHtmlHeader());

    // Sort helper function (case-insensitive)
    const sortByName = (a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    };

    // Add uncategorized bookmarks first (at the root level)
    if (uncategorizedBookmarks.length > 0) {
        console.log(`Adding ${uncategorizedBookmarks.length} uncategorized bookmarks to the root.`);
        uncategorizedBookmarks.sort(sortByName).forEach(bm => {
            htmlOutput.push(generateBookmarkItem(bm));
        });
    }

    // Add bookmarks organized by the predefined collections (folders)
    // Get collection IDs from the map, parse them as numbers for lookup, sort by name
    const sortedCollectionIds = Object.keys(USER_COLLECTIONS)
        .map(id => parseInt(id, 10)) // Ensure IDs are numbers for lookup
        .sort((idA, idB) => {
            const nameA = (USER_COLLECTIONS[idA] || '').toLowerCase();
            const nameB = (USER_COLLECTIONS[idB] || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

    sortedCollectionIds.forEach(collectionId => {
        // Check if we actually have bookmarks for this collection ID
        if (bookmarksByCollection[collectionId] && bookmarksByCollection[collectionId].length > 0) {
            const collectionName = USER_COLLECTIONS[collectionId];
            const bookmarksInCollection = bookmarksByCollection[collectionId];
            console.log(`Adding folder '${collectionName}' with ${bookmarksInCollection.length} bookmarks.`);
            htmlOutput.push(generateFolderItem(collectionName));
            bookmarksInCollection.sort(sortByName).forEach(bm => {
                htmlOutput.push(generateBookmarkItem(bm));
            });
            htmlOutput.push(closeFolderItem());
        } else {
             // Optional: Log collections from the map that had no corresponding bookmarks
             // console.log(`Predefined collection '${USER_COLLECTIONS[collectionId]}' (ID: ${collectionId}) had no matching bookmarks in the export.`);
        }
    });

    htmlOutput.push(generateHtmlFooter());

    return { html: htmlOutput.join(""), error: null };
}

// --- Download Trigger ---

/**
 * Triggers a browser download for the given text content.
 * @param {string} content - The text content to download.
 * @param {string} filename - The desired filename for the download.
 * @param {string} contentType - The MIME type (e.g., 'text/html;charset=utf-8').
 */
function triggerDownload(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Append anchor to body (required for Firefox)
    a.click(); // Programmatically click the anchor to trigger download
    document.body.removeChild(a); // Remove the anchor from the body
    URL.revokeObjectURL(url); // Release the object URL to free up memory
}


// --- Event Listener Setup ---
// Ensure the DOM is fully loaded before attaching listeners
document.addEventListener('DOMContentLoaded', () => {
    // Re-fetch elements inside DOMContentLoaded in case script runs before elements exist
    const fileInput = document.getElementById('jsonFile');
    const convertButton = document.getElementById('convertButton');
    const statusDiv = document.getElementById('status');

    if (!fileInput || !convertButton || !statusDiv) {
        console.error("Initialization failed: Could not find required HTML elements (jsonFile, convertButton, status).");
        alert("Error initializing the page. Please check the console.");
        return;
    }

    convertButton.addEventListener('click', () => {
        statusDiv.textContent = ''; // Clear previous status
        statusDiv.className = ''; // Clear previous classes (error/success)

        const file = fileInput.files[0];

        if (!file) {
            statusDiv.textContent = 'Error: Please select a JSON file first.';
            statusDiv.className = 'error';
            return;
        }

        // Basic check for .json extension (case-insensitive)
        if (!file.name.toLowerCase().endsWith('.json')) {
             statusDiv.textContent = 'Error: Please select a file with the .json extension.';
             statusDiv.className = 'error';
             // Clear the file input for convenience
             fileInput.value = '';
             return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const jsonString = event.target.result;
                const data = JSON.parse(jsonString); // Parse the JSON string

                statusDiv.textContent = 'Processing...'; // Indicate activity

                // Use setTimeout to allow the UI to update ("Processing...") before potentially blocking work
                setTimeout(() => {
                    const result = processData(data); // Perform the conversion

                    if (result.error) {
                        statusDiv.textContent = `Error: ${result.error}`;
                        statusDiv.className = 'error';
                    } else if (result.html !== null) { // Check if HTML content exists
                        triggerDownload(result.html, 'bookmarks.html', 'text/html;charset=utf-8');
                        statusDiv.textContent = 'Success! Check your downloads for bookmarks.html.';
                        statusDiv.className = 'success';
                    } else {
                         // Should not happen if processData always returns html or error, but safety check
                         statusDiv.textContent = 'Error: Conversion failed unexpectedly after processing.';
                         statusDiv.className = 'error';
                    }
                    // Clear file input after processing (success or error)
                    fileInput.value = '';

                }, 10); // Small delay (10ms) seems sufficient for UI update

            } catch (e) {
                if (e instanceof SyntaxError) {
                    statusDiv.textContent = 'Error: Could not parse JSON. Please ensure the file is valid UTF-8 encoded JSON.';
                    console.error("JSON Parsing Error:", e);
                } else {
                    statusDiv.textContent = `Error: An unexpected error occurred: ${e.message}`;
                    console.error("Processing Error:", e);
                }
                statusDiv.className = 'error';
                // Clear file input on error
                fileInput.value = '';
            }
        };

        reader.onerror = (event) => {
            statusDiv.textContent = 'Error: Could not read the selected file.';
            statusDiv.className = 'error';
            console.error("File Reading Error:", event.target.error);
            // Clear file input on error
            fileInput.value = '';
        };

        // Start reading the file as text (assuming UTF-8)
        reader.readAsText(file);
    });
});
