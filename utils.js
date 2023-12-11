const fs = require("fs").promises;
const enableTelegram =
    process.env.ENABLE_TELEGRAM == "true" ||
    process.env.ENABLE_TELEGRAM == "1";

exports.readListingsFile = async (platform, item) => {
    const path = getPath(platform, item);

    try {
        return JSON.parse(await fs.readFile(path));
    } catch (error) {
        console.warn(`Read file error for ${path}: `, error);
        return [];
    }
};

exports.writeListingsFile = async (platform, item, listings) => {
    await fs.writeFile(getPath(platform, item),
        JSON.stringify(listings, null, 2) + "\n");
};

function getPath(platform, item) {
    return `listings/${item.replace(/ /g, "-")}_${platform.toLowerCase()}.json`;
}

exports.updateListings = (platform, item, prevListings, currentListings) => {
    var dateTime = new Date().toLocaleString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
    });

    if (prevListings.length == 0) {
        console.log(`New item "${item}", populating listings...`);
        console.log(currentListings);
        return currentListings;
    } else {
        const { latestListings, listingUpdates } = compareListings(prevListings, currentListings);
        if (listingUpdates.length == 0) {
            console.log(dateTime + `\t[${platform}] There is no update for "${item}"... :(`);
        } else {
            console.log(dateTime + `\t[${platform}] New update for "${item}"!! :)`);
            console.log(listingUpdates);
            if (enableTelegram)
                telegramBotSendtext(createListingsStr(platform, item, listingUpdates));
        }

        return latestListings.slice(0, 100);
    }
};

function compareListings(prevListings, currentListings) {
    const currList = [...currentListings].reverse();

    const listingUpdates = [];
    const latestListings = [...prevListings].reverse();

    const idList = latestListings.map(({ listingID }) => listingID);
    currList.forEach(listing => {
        const idx = idList.indexOf(listing.listingID);

        if (idx === -1) {
            latestListings.push(listing);
            listingUpdates.push(listing);
        } else {
            const regex = / |RM|MYR/gi;
            const isDifferentPrice = latestListings[idx].price.replace(regex, "")
                !== listing.price.replace(regex, "");

            if (isDifferentPrice) {
                const newPriceListing = {
                    ...listing,
                    oldPrice: latestListings[idx].price
                };
                latestListings[idx] = newPriceListing;
                listingUpdates.push(newPriceListing);
            }
        }
    });

    return {
        latestListings: latestListings.reverse(),
        listingUpdates
    };
}

function telegramBotSendtext(telegramListings) {
    const axios = require("axios");

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const BOT_CHATID = process.env.BOT_CHATID;

    telegramListings.forEach((listingStr) => {
        const url =
            "https://api.telegram.org/bot" +
            BOT_TOKEN +
            "/sendMessage?chat_id=" +
            BOT_CHATID +
            "&parse_mode=html&text=" +
            encodeURIComponent(listingStr);

        axios.get(url)
            .then((response) => {
                // handle success
                console.log(response.data.result.text + "\n");
            })
            .catch((error) => {
                // handle error
                console.error(error.config.url);
            })
            .then(() => {
                // always executed
            });
    });
}

function createListingsStr(platform, item, listings) {
    const splitMessages = [];
    let message = "";

    for (var i = 0; i < listings.length; i++) {
        const oldPrice = listings[i]["oldPrice"];
        message += oldPrice ? "Price update" : "New listing";
        message += ` on ${platform}: [${item.toUpperCase()}]` + "\n";
        message += "Name: " + listings[i]["name"] + "\n";
        message += "Price: " + listings[i]["price"] + " ";
        message += (oldPrice ? `<del>${oldPrice}</del>` : "") + "\n";
        if (platform === "Carousell") {
            message += "Condition: " + listings[i]["condition"] + "\n";
            message += "Seller Username: " + listings[i]["sellerUsername"] + "\n";
        } else if (platform === "Facebook") {
            message += "Location: " + listings[i]["location"] + "\n";
        }
        message += "Thumbnail: " + listings[i]["thumbnailURL"] + "\n";
        message += "Item Link: " + listings[i]["itemURL"] + "\n";
        splitMessages.push(message);
        console.log(message);
        message = "";
    }

    return splitMessages;
}
