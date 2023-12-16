const { updateListings, readListingsFile, writeListingsFile } = require("./utils");

const PLATFORM = "Carousell";
const resellers = String(process.env.RESELLERS ?? "").split(", ");

exports.searchCarousell = async function (page, item) {
    console.log(`[${PLATFORM}] Starting search for "${item.name}"...`);
    const link = "https://carousell.com.my/search/" +
        encodeURIComponent(item.name) +
        "?sort_by=3&tab=marketplace" +
        `&price_start=${item.minPrice ?? ""}&price_end=${item.maxPrice ?? ""}`;

    await page.goto(link, { waitUntil: "load", timeout: 0 });
    const data = await page.evaluate(function () {
        return window.initialState;
    });
    const currentListings = mapToListings(data);

    const prevListings = await readListingsFile(PLATFORM, item.name);
    const latestListings = updateListings(PLATFORM, item.name, prevListings, currentListings);

    await writeListingsFile(PLATFORM, item.name, latestListings);
};

function mapToListings(data) {
    const cards = data.SearchListing.listingCards;
    return cards.flatMap((element) => {
        const name = element.belowFold[0].stringContent;
        const price = element.belowFold[1].stringContent;
        const condition = element.belowFold[3].stringContent;
        const listingID = element.listingID;
        const thumbnailURL = element.thumbnailURL;
        const sellerUsername = data.Listing.listingsMap[element.listingID]
            .seller.username;
        const itemURL = ("https://carousell.com.my/p/" + name.replace(/[^a-zA-Z0-9 ]/g, "-") + "-" + listingID).replace(/ /g, "-");
        const isBumper = element.aboveFold[0].component === "active_bump";  //  Lightning icons - Most resellers will not have active bumps
        const isSpotlighter = element.hasOwnProperty('promoted');   //  Purple promoted icons - Most resellers will not have spotlight

        const listing = { name, listingID, price, sellerUsername, condition, thumbnailURL, itemURL };

        if (isBumper || isSpotlighter)
            console.log("Excluding bumper and spotlighter: " + sellerUsername);
        else if (!resellers.includes(sellerUsername))
            return [listing];

        return [];
    });
}
