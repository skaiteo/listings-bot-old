const resellers = String(process.env.RESELLERS ?? "").split(", ");
const enableTelegram =
    process.env.ENABLE_TELEGRAM == "true" ||
    process.env.ENABLE_TELEGRAM == "1";

exports.mapSearchToListings = (data) => {
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

        listing = {
            name: name,
            price: price,
            condition: condition,
            listingID: listingID,
            thumbnailURL: thumbnailURL,
            seller_username: sellerUsername,
            itemURL: itemURL
        };

        if (isBumper || isSpotlighter)
            console.log("Excluding bumper and spotlighter: " + sellerUsername);
        else if (!resellers.includes(sellerUsername))
            return [listing];

        return [];
    });
};

exports.processDifferences = (item, prevListings, currentListings) => {
    if (prevListings.length == 0) {
        console.log(`New item "${item}", populating listings...`);
        console.log(currentListings);
        return currentListings;
    } else {
        const diffListings = compareListings(prevListings, currentListings);
        if (diffListings.length == 0)
            console.log(dateTime + `\t There is no update for "${item}"... :(`);
        else {
            console.log(dateTime + `\t There is an update for "${item}"!! :)\tNew listings:`);
            console.log(diffListings);
            if (enableTelegram)
                telegramBotSendtext(createListingsStr(item, diffListings));
        }
        return appendListings(prevListings, diffListings);
    }
};

function appendListings(prevListings, diffListings) {
    const newListings = [...diffListings, ...prevListings];
    return newListings.slice(0, 100);
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
                console.log("Send Telegram success");
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

function compareListings(array1, array2) {
    ids = new Set(array1.map(({ listingID }) => listingID));
    array2 = array2.filter(({ listingID }) => !ids.has(listingID));
    return array2;
}

function createListingsStr(item, listings) {
    splitMessages = [];
    let message = "";

    for (var i = 0; i < listings.length; i++) {
        message += `Search: [${item.toUpperCase()}]` + "\n";
        message += "Name: " + listings[i]["name"] + "\n";
        message += "Price: " + listings[i]["price"] + "\n";
        message += "Condition: " + listings[i]["condition"] + "\n";
        message += "Seller Username: " + listings[i]["seller_username"] + "\n";
        message += "Thumbnail: " + listings[i]["thumbnailURL"] + "\n";
        message += "Item Link: " + listings[i]["itemURL"] + "\n";
        splitMessages.push(message);
        message = "";
    }

    return splitMessages;
}
