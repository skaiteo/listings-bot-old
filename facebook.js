const { readListingsFile, updateListings, writeListingsFile } = require("./utils");

const PLATFORM = "Facebook";

exports.searchFacebook = async (page, item) => {
    console.log(`[Facebook] Starting search for "${item.name}"...`);
    const link =
        "https://www.facebook.com/marketplace/109333975751208/search?query=" +
        encodeURIComponent(item.name) +
        "&sortBy=creation_time_descend&exact=false" +
        `&minPrice=${item.minPrice ?? ""}&maxPrice=${item.maxPrice ?? ""}`;
    console.log(link);

    await page.goto(link, { "waitUntil": "domcontentloaded", timeout: 0 });
    const elements = await page.$$("a");

    const currentListings = await mapToListings(item.name, elements);
    const prevListings = await readListingsFile(PLATFORM, item.name);
    const latestListings = updateListings(PLATFORM, item.name, prevListings, currentListings);

    await writeListingsFile(PLATFORM, item.name, latestListings);
};

async function mapToListings(itemName, elements) {
    const regex = new RegExp(`.*?${itemName.split(" ").join(".*?")}.*?`, "i");
    // console.log("RegExp: " + regex);

    const listings = await Promise.all(elements.map(async element => {
        const innerText = await element.evaluate(el => el.innerText);
        if (!regex.test(innerText)) return;

        return await element.evaluate((aTag) => {
            const [
                { firstChild: priceElement },
                { innerText: name },
                { innerText: location }
            ] = aTag.firstChild.childNodes[1].childNodes;
            const prices = [...priceElement.querySelectorAll("span[dir='auto']")].map(a => a.innerText);
            const thumbnailURL = aTag.querySelector("img").src;
            const itemURL = aTag.href;
            const listingID = itemURL.replace("https://www.facebook.com/marketplace/item/", "").split("/")[0];

            return { name, price: prices[0], location, listingID, thumbnailURL, itemURL };
        });
    }));

    return listings.filter(item => !!item);
}
