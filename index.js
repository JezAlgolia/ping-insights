const algoliasearch = require("algoliasearch");
const searchInsights = require("search-insights");
require("localstorage-polyfill");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

global.localStorage = localStorage;

console.log(process.env);
const DRY_RUN = true; // Set to false to ping real events to Insights

const client = algoliasearch(
  `${process.env.ALGOLIA_APP_ID}`,
  `${process.env.ALGOLIA_API_KEY}`
);
const index = client.initIndex(`${process.env.ALGOLIA_INDEX_NAME}`);
searchInsights("init", {
  appId: `${process.env.ALGOLIA_APP_ID}`,
  apiKey: `${process.env.ALGOLIA_API_KEY}`,
});

async function performAlgoliaOperations() {
  const userToken = generateUserToken();
  const searchParams = {
    filters:
      'category_pages:"Home, Furniture & Storage > Furniture > TV units"',
    clickAnalytics: true,
    analytics: true,
    userToken: userToken,
  };

  try {
    const searchResponse = await index.search("", searchParams);

    if (searchResponse.hits.length === 0) {
      console.log("No results found for the search query.");
      return;
    }

    const queryID = searchResponse.queryID;
    const objectIDs = searchResponse.hits.map((hit) => hit.objectID);
    const hits = searchResponse.hits;
    console.log(`QueryID: ${queryID}`);
    console.log(`Found ${objectIDs.length} results`);

    const shouldClick = Math.random() > 0.5;
    const shouldConvert = Math.random() > 0.8;

    if (shouldClick) {
      const randomIndex = Math.floor(Math.random() * hits.length);
      const randomHit = hits[randomIndex];
      await sendClickEvent(
        queryID,
        randomHit.objectID,
        randomIndex + 1,
        userToken
      );
    }

    if (shouldConvert) {
      const randomObjectID =
        objectIDs[Math.floor(Math.random() * objectIDs.length)];
      await sendConversionEvent(queryID, randomObjectID, userToken);
    }
  } catch (error) {
    console.error("Error performing Algolia operations:", error);
  }
}

async function sendClickEvent(queryID, objectID, position, userToken) {
  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Click event: QueryID: ${queryID}, ObjectID: ${objectID}, Position: ${position}, UserToken: ${userToken}`
    );
    return;
  }

  try {
    searchInsights("clickedObjectIDsAfterSearch", {
      eventName: "Product Clicked",
      index: ALGOLIA_INDEX_NAME,
      userToken: userToken,
      queryID: queryID,
      objectIDs: [objectID],
      positions: [position],
    });
    console.log(
      `Click event sent: QueryID: ${queryID}, ObjectID: ${objectID}, Position: ${position}, UserToken: ${userToken}`
    );
  } catch (error) {
    console.error("Error sending click event:", error);
  }
}

async function sendConversionEvent(queryID, objectID, userToken) {
  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Conversion event: QueryID: ${queryID}, ObjectID: ${objectID}, UserToken: ${userToken}`
    );
    return;
  }

  try {
    searchInsights("convertedObjectIDsAfterSearch", {
      eventName: "Product Purchased",
      index: ALGOLIA_INDEX_NAME,
      userToken: userToken,
      queryID: queryID,
      objectIDs: [objectID],
    });

    console.log(
      `Conversion event sent: QueryID: ${queryID}, ObjectID: ${objectID}, UserToken: ${userToken}`
    );
  } catch (error) {
    console.error("Error sending conversion event:", error);
  }
}

function generateUserToken() {
  return uuidv4();
}

// Run the script n many (replace 1000) times
(async () => {
  for (let i = 0; i < 1000; i++) {
    await performAlgoliaOperations();
  }
})();
