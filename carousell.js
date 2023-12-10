const { processDifferences } = require("./utils");
const fs = require("fs").promises;

const resellers = String(process.env.RESELLERS ?? "").split(", ");

exports.searchCarousell = async function (page, item) {
    console.log(`[Carousell] Starting search for "${item}"...`);
    var link = "https://carousell.com.my/search/" + encodeURIComponent(item) + "?sort_by=3&tab=marketplace";

    await page.goto(link, { waitUntil: "load", timeout: 0 });
    var data = await page.evaluate(function () {
        return window.initialState;
    });
    await page.close();

    const filePath = `listings/${item.replace(/ /g, "-")}.json`;
    let prevListings = [];
    try {
        prevListings = JSON.parse(await fs.readFile(filePath));
    } catch (error) {
        console.error(`Read file error for ${filePath}: `, error);
    }

    const currentListings = mapSearchToListings(data);

    const newListings = processDifferences("Carousell", item, prevListings, currentListings);

    // Write once to carousell_<item>.json when migrating
    await fs.writeFile(filePath, JSON.stringify(newListings, null, 2) + "\n");
};

function mapSearchToListings(data) {
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

        const listing = {
            name,
            price,
            condition,
            listingID,
            thumbnailURL,
            seller_username: sellerUsername,
            itemURL
        };

        if (isBumper || isSpotlighter)
            console.log("Excluding bumper and spotlighter: " + sellerUsername);
        else if (!resellers.includes(sellerUsername))
            return [listing];

        return [];
    });
}