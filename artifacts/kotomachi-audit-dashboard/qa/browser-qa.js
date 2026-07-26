"use strict";

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const qa = __dirname;
const prefix = process.argv[2] || "round";
const port = Number(process.argv[3] || 8765);
const baseUrl = "http://127.0.0.1:" + port + "/";
const fileUrl = "file:///" + path.join(root, "index.html").replace(/\\/g, "/");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

function screenshotName(name) {
  return path.join(qa, prefix === "final" ? name + ".png" : prefix + "-" + name + ".png");
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, baseUrl);
    const relative = decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    const file = path.resolve(root, relative);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function instrument(page) {
  const bucket = { console: [], pageErrors: [], externalRequests: [] };
  page.on("console", message => {
    if (message.type() === "error" || message.type() === "warning") {
      bucket.console.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", error => bucket.pageErrors.push(String(error && (error.stack || error.message) || error)));
  page.on("request", request => {
    const url = request.url();
    if (!url.startsWith(baseUrl) && !url.startsWith("file:///")) bucket.externalRequests.push(url);
  });
  return bucket;
}

async function run() {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const report = {
    prefix,
    serverUrl: baseUrl,
    desktop: {},
    mobile: {},
    fileMode: {},
    errors: [],
    externalRequests: []
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ["clipboard-read", "clipboard-write"]
    });
    const page = await context.newPage();
    const desktopEvents = instrument(page);
    await page.goto(baseUrl, { waitUntil: "load", timeout: 15000 });
    await page.waitForSelector("#report-integrity strong");

    report.desktop.overview = await page.evaluate(() => ({
      title: document.title,
      integrity: document.querySelector("#report-integrity strong").textContent,
      textLength: document.body.innerText.length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      sidebarVisible: getComputedStyle(document.querySelector("#sidebar")).display !== "none"
    }));
    await page.screenshot({ path: screenshotName("desktop-overview"), fullPage: false });

    const pages = ["overview", "findings", "system-map", "journeys", "eval-data", "engineering", "roadmap", "flagship", "full-report"];
    report.desktop.pages = {};
    for (const name of pages) {
      await page.locator("[data-page=\"" + name + "\"]").click();
      report.desktop.pages[name] = await page.locator("[data-page-panel=\"" + name + "\"]").isVisible();
    }

    await page.locator("[data-page=\"overview\"]").click();
    await page.locator("#global-search-input").fill("音频");
    report.desktop.globalSearchResults = await page.locator("#global-search-results .search-result").count();
    await page.locator("#global-search-input").press("Escape");

    await page.locator("[data-page=\"findings\"]").click();
    await page.locator("#filter-severity").selectOption("High");
    report.desktop.highFindingCount = await page.locator(".finding-card").count();
    const cards = page.locator(".finding-card");
    for (let i = 0; i < Math.min(3, await cards.count()); i += 1) {
      await cards.nth(i).locator("summary").first().click();
    }
    report.desktop.openFindings = await page.locator(".finding-card[open]").count();
    const copyButton = page.locator(".copy-path").first();
    if (await copyButton.count()) {
      await copyButton.click();
      await page.waitForTimeout(150);
      report.desktop.copyToast = await page.locator("#toast").textContent();
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: screenshotName("desktop-findings"), fullPage: false });

    const beforeTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.locator(".sidebar .theme-toggle").click();
    const afterTheme = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      stored: localStorage.getItem("kotomachi-audit-theme")
    }));
    await page.locator(".sidebar .theme-toggle").click();
    report.desktop.theme = { before: beforeTheme, after: afterTheme };

    await page.locator("[data-page=\"full-report\"]").click();
    report.desktop.fullReport = await page.evaluate(() => {
      const raw = document.querySelector("#raw-report-source");
      const scrolls = Array.from(document.querySelectorAll(".table-scroll"));
      return {
        sections: document.querySelectorAll(".report-section").length,
        rawChars: raw ? raw.textContent.length : -1,
        tables: document.querySelectorAll(".report-document table").length,
        codePaths: document.querySelectorAll(".report-document .file-ref code").length,
        horizontalTables: scrolls.filter(node => node.scrollWidth > node.clientWidth).length,
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    });
    await page.locator("#report-search-input").fill("Guided");
    report.desktop.fullReportSearch = await page.locator(".report-section:not([hidden])").count();
    await page.locator("#report-search-input").fill("");
    await page.waitForTimeout(1900);
    await page.screenshot({ path: screenshotName("desktop-full-report"), fullPage: false });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(baseUrl + "#overview", { waitUntil: "load" });
    await page.waitForSelector("#report-integrity");
    report.desktop.wide = await page.evaluate(() => ({
      viewport: [innerWidth, innerHeight],
      overflow: document.documentElement.scrollWidth > innerWidth,
      mainWidth: document.querySelector("main").getBoundingClientRect().width
    }));
    for (const name of pages) {
      await page.locator("[data-page=\"" + name + "\"]").click();
      if (!(await page.locator("[data-page-panel=\"" + name + "\"]").isVisible())) {
        throw new Error("Hidden page at 1920: " + name);
      }
    }

    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    const mobileEvents = instrument(mobilePage);
    await mobilePage.goto(baseUrl + "#overview", { waitUntil: "load" });
    await mobilePage.waitForSelector("#report-integrity");
    report.mobile.overview390 = await mobilePage.evaluate(() => ({
      viewport: [innerWidth, innerHeight],
      overflow: document.documentElement.scrollWidth > innerWidth,
      mobileHeader: getComputedStyle(document.querySelector(".mobile-header")).display,
      sidebarTransform: getComputedStyle(document.querySelector("#sidebar")).transform
    }));
    await mobilePage.screenshot({ path: screenshotName("mobile-overview"), fullPage: false });
    await mobilePage.locator(".mobile-menu-button").click();
    report.mobile.menuOpened = await mobilePage.locator("#sidebar").evaluate(node => node.classList.contains("is-open"));
    await mobilePage.locator("[data-page=\"findings\"]").click();
    report.mobile.menuClosedAfterNav = await mobilePage.locator("#sidebar").evaluate(node => !node.classList.contains("is-open"));
    await mobilePage.locator("#filter-severity").selectOption("High");
    const mobileCards = mobilePage.locator(".finding-card");
    for (let i = 0; i < Math.min(3, await mobileCards.count()); i += 1) {
      await mobileCards.nth(i).locator("summary").first().click();
    }
    report.mobile.findings390 = await mobilePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      open: document.querySelectorAll(".finding-card[open]").length,
      count: document.querySelectorAll(".finding-card").length
    }));
    await mobilePage.evaluate(() => window.scrollTo(0, 0));
    await mobilePage.screenshot({ path: screenshotName("mobile-findings"), fullPage: false });

    await mobilePage.setViewportSize({ width: 430, height: 932 });
    await mobilePage.goto(baseUrl + "#overview", { waitUntil: "load" });
    await mobilePage.locator(".mobile-menu-button").click();
    await mobilePage.locator("[data-page=\"full-report\"]").click();
    report.mobile.full430 = await mobilePage.evaluate(() => ({
      viewport: [innerWidth, innerHeight],
      overflow: document.documentElement.scrollWidth > innerWidth,
      sections: document.querySelectorAll(".report-section").length,
      tableRegions: document.querySelectorAll(".table-scroll").length
    }));

    const fileContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const filePage = await fileContext.newPage();
    const fileEvents = instrument(filePage);
    await filePage.goto(fileUrl, { waitUntil: "load", timeout: 15000 });
    await filePage.waitForSelector("#report-integrity strong");
    await filePage.locator("[data-page=\"findings\"]").click();
    await filePage.locator("#filter-severity").selectOption("High");
    const fileHigh = await filePage.locator(".finding-card").count();
    await filePage.locator("[data-page=\"full-report\"]").click();
    report.fileMode = await filePage.evaluate(count => ({
      title: document.title,
      integrity: document.querySelector("#report-integrity strong").textContent,
      rawChars: document.querySelector("#raw-report-source").textContent.length,
      highFindings: count,
      moduleScripts: document.querySelectorAll("script[type=module]").length,
      overflow: document.documentElement.scrollWidth > innerWidth
    }), fileHigh);

    report.errors = [
      ...desktopEvents.pageErrors, ...desktopEvents.console,
      ...mobileEvents.pageErrors, ...mobileEvents.console,
      ...fileEvents.pageErrors, ...fileEvents.console
    ];
    report.externalRequests = [
      ...desktopEvents.externalRequests,
      ...mobileEvents.externalRequests,
      ...fileEvents.externalRequests
    ];

    await fileContext.close();
    await context.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  console.log(JSON.stringify(report, null, 2));
}

run().catch(error => {
  console.error(error && (error.stack || error.message) || error);
  process.exit(1);
});
