require("dotenv").config();
const puppeteer = require("puppeteer");
const { mapSearchToListings, processDifferences } = require("./utils");
const fs = require("fs").promises;

let context;

async function scrapeItems() {
    const items = new Set(String(process.env.ITEMS)
        .split(",")
        .map((item) => item.trim()));
    await Promise.all([...items].map(item => loadPage(item)));
}

async function loadPage(item) {
    console.log(`Starting search for "${item}"...`);
    var link = "https://carousell.com.my/search/" + encodeURIComponent(item) + "?sort_by=3&tab=marketplace";
    var page = await context.newPage();
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36"
    );
    await page.setCacheEnabled(false);

    await page.setRequestInterception(true);

    page.on("request", (req) => {
        if (req.resourceType() == "document") req.continue();
        else req.abort();
    });
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

    var asiaTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Shanghai",
    });
    dateTime = new Date(asiaTime);

    const newListings = processDifferences(item, prevListings, currentListings);

    await fs.writeFile(filePath, JSON.stringify(newListings, null, 2) + "\n");
}

async function createBrowser(cb) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--incognito"],
    });
    context = await browser.createIncognitoBrowserContext();
    await cb();
    await browser.close();
}

createBrowser(scrapeItems);
