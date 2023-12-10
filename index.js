require("dotenv").config();
const puppeteer = require("puppeteer");
const { searchCarousell } = require("./carousell");

(async () => {
    const items = new Set(String(process.env.ITEMS)
        .split(",")
        .map((item) => item.trim()));

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--incognito"],
    });
    const context = await browser.createIncognitoBrowserContext();

    await Promise.allSettled([...items].map(async item => {
        var page = await context.newPage();

        await page.setCacheEnabled(false);
        await page.setRequestInterception(true);
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36"
        );

        page.on("request", (req) => {
            if (req.resourceType() == "document") req.continue();
            else req.abort();
        });

        await searchCarousell(page, item);
        // searchFacebook
    }));

    await browser.close();
})();
