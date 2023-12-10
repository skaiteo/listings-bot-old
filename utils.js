const enableTelegram =
    process.env.ENABLE_TELEGRAM == "true" ||
    process.env.ENABLE_TELEGRAM == "1";


exports.processDifferences = (platform, item, prevListings, currentListings) => {
    var dateTime = new Date().toLocaleString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
    });

    if (prevListings.length == 0) {
        console.log(`New item "${item}", populating listings...`);
        console.log(currentListings);
        return currentListings;
    } else {
        const diffListings = compareListings(prevListings, currentListings);
        if (diffListings.length == 0) {
            console.log(dateTime + `\t[${platform}] There is no update for "${item}"... :(`);
        } else {
            console.log(dateTime + `\t[${platform}] New update for "${item}"!! :) New listings:`);
            console.log(diffListings);
            if (enableTelegram)
                telegramBotSendtext(createListingsStr(platform, item, diffListings));
        }
        return appendListings(prevListings, diffListings);
    }
};

function compareListings(array1, array2) {
    const ids = new Set(array1.map(({ listingID }) => listingID));
    array2 = array2.filter(({ listingID }) => !ids.has(listingID));
    return array2;
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

function createListingsStr(platform, item, listings) {
    const splitMessages = [];
    let message = "";

    for (var i = 0; i < listings.length; i++) {
        message += `Search on ${platform}: [${item.toUpperCase()}]` + "\n";
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

function appendListings(prevListings, diffListings) {
    const newListings = [...diffListings, ...prevListings];
    return newListings.slice(0, 100);
}
