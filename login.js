const puppeteer = require("puppeteer");
const fs = require("fs/promises");

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--incognito"],
    });
    const context = await browser.createIncognitoBrowserContext();

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

    const item = {
        name: "steam deck",
        minPrice: "",
        maxPrice: ""
    };

    const url =
        "https://www.facebook.com/marketplace/109333975751208/search?query=" +
        encodeURIComponent(item.name) +
        "&sortBy=creation_time_descend&exact=false" +
        `&minPrice=${item.minPrice ?? ""}&maxPrice=${item.maxPrice ?? ""}`;

    await page.goto(url, { "waitUntil": "domcontentloaded", timeout: 0 });
    await page.screenshot({ path: "artifacts/screenshot.png" });
    const html = await page.content();
    console.log(html);
    await fs.writeFile("artifacts/page.html", html);

    // const elements = await page.$$("a");


})();
