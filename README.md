# Linkwarden JSON to HTML Bookmarks Converter (Browser-Based)

This simple web tool converts a JSON export file from [Linkwarden](https://linkwarden.app/) into a standard Netscape Bookmark HTML file, suitable for importing into browsers or other bookmark managers.

The conversion process happens entirely within your web browser using JavaScript. Your JSON file is **not** uploaded to any server. 

## Features

* **Client-Side Conversion:** Protects your privacy as the JSON file is processed locally in your browser.
* **JSON to HTML:** Converts Linkwarden's export format (expected to be an object containing a `collections` array, where each collection has a `links` array) into a standard `bookmarks.html` file.
* **Folder Structure:** Attempts to recreate the folder structure based on a predefined mapping of Linkwarden `collectionId`s to folder names within the `converter.js` file.
* **Error Handling:** Provides basic feedback for file selection errors, JSON parsing errors, and unexpected data structures.
* **Timestamp Conversion:** Converts Linkwarden's `createdAt` and `updatedAt` timestamps to the UNIX epoch seconds format required by the bookmark standard.
* **Uncategorized Handling:** Bookmarks without a `collectionId` or whose `collectionId` is not found in the predefined map are placed at the root level.
* **Sorting:** Bookmarks within each folder (and uncategorized bookmarks) are sorted alphabetically by name. Folders themselves are also sorted alphabetically.

## How to Use

1. **Export from Linkwarden:** Go to your Linkwarden instance, navigate to Settings -> Data Management, and click "Export Data" to download your `linkwarden_export_....json` file.
2. **Open `index.html`:** Download or clone this repository. Open the `index.html` file directly in your web browser (e.g., by double-clicking it).  It can be run directly from your machine and does not need to be run from a web server.
3. **Select File:** Click the "Choose File" or "Browse" button and select the Linkwarden JSON export file you downloaded.
4. **Convert:** Click the "Convert and Download" button.
5. **Download:** If successful, your browser will prompt you to download a file named `bookmarks.html`.
6. **Import:** Import the `bookmarks.html` file into your desired browser or bookmark manager.

## Important Notes & Limitations

* **Hardcoded Collections:** The mapping between Linkwarden `collectionId` (which appears to be a number) and the desired folder name in the HTML file is **hardcoded** inside the `converter.js` file within the `USER_COLLECTIONS` object.
  
  ```javascript
  // --- User Provided Collection Data ---
  const USER_COLLECTIONS = {
      27152: "Utils",
      5985: "Account Sites",
      // ... other mappings
      6000: "Unorganized" // Example
  };
  ```
  
  **You MUST edit this `USER_COLLECTIONS` object in `converter.js` to match *your* specific Linkwarden collection IDs and desired folder names.** You can usually find the collection IDs by inspecting the JSON export file or potentially through the Linkwarden UI/API if available.
* **JSON Structure Assumption:** The script assumes the JSON export has a root object containing a `collections` key, which is an array of collection objects. Each collection object is expected to have a `links` key, which is an array of bookmark objects. It also includes a fallback for a root-level array of bookmarks, though the primary structure is preferred. If Linkwarden changes its export format significantly, this script may need updates.
* **Bookmark Fields:** The script extracts `name`, `url`, `description`, `createdAt`, and `updatedAt` from the bookmark objects within the JSON. Other fields are ignored.

## Potential Improvements

* Allow users to upload a mapping file or provide the mapping via the UI instead of hardcoding it.
* Add support for tags if they are present in the Linkwarden export.
* More robust error handling and reporting for edge cases in the JSON data.
* Add options for sorting or structuring the output.
