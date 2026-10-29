// Records a walkthrough of prototype/index.html as an MP4.
// Usage: node scripts/record-demo.mjs <out-dir>
// Needs the playwright module, the Chromium in PLAYWRIGHT_BROWSERS_PATH, and ffmpeg.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "demo-out");
mkdirSync(out, { recursive: true });
const W = 1280, H = 800;
const page_url = "file://" + path.resolve("prototype/index.html");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: out, size: { width: W, height: H } }, colorScheme: "light" });
const page = await ctx.newPage();
await page.goto(page_url);
await page.waitForTimeout(600);

// Caption bar + cursor dot injected into the page.
await page.addStyleTag({ content: `
  #cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#16313A;color:#fff;font:700 22px/1.3 Nunito,system-ui,sans-serif;
       padding:12px 22px;border-radius:14px;max-width:80%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25);z-index:50;opacity:0;transition:opacity .3s}
  #cap.on{opacity:1}
  #dot{position:fixed;width:22px;height:22px;border-radius:50%;background:rgba(228,112,47,.85);border:3px solid #fff;z-index:60;pointer-events:none;
       transform:translate(-50%,-50%);transition:left .35s ease,top .35s ease,transform .15s}
  #dot.down{transform:translate(-50%,-50%) scale(.7)}
  .wobble svg{animation-iteration-count:infinite !important}
`});
await page.evaluate(() => { const c = document.createElement("div"); c.id = "cap"; document.body.appendChild(c); const d = document.createElement("div"); d.id = "dot"; d.style.left = "640px"; d.style.top = "400px"; document.body.appendChild(d); });

const sleep = (ms) => page.waitForTimeout(ms);
async function caption(t, hold = 900) { await page.evaluate((t) => { const c = document.getElementById("cap"); c.textContent = t; c.classList.toggle("on", !!t); }, t); await sleep(hold); }
async function tap(selector, holdAfter = 700) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.evaluate(([x, y]) => { const d = document.getElementById("dot"); d.style.left = x + "px"; d.style.top = y + "px"; }, [x, y]);
  await sleep(420);
  await page.evaluate(() => document.getElementById("dot").classList.add("down"));
  await el.click();
  await sleep(140);
  await page.evaluate(() => document.getElementById("dot").classList.remove("down"));
  await sleep(holdAfter);
}
const btn = (text) => `button:has-text("${text}")`;

// ---- script ----
await caption("A creature you can only raise together.", 1800);
await tap(btn("Continue with Apple"));
await caption("Pick who you're raising it with.", 700);
await tap(btn("Crew"), 900);
await caption("The egg waits until your partner joins.", 1500);
await tap(btn("Send invite"), 900);

await caption("Each of you logs one small habit a day.", 600);
await tap(btn("You feed"), 500);
await tap(btn("Maya feeds"), 1200);
await caption("Both fed. It grows tonight.", 600);
await tap(btn("End the day"), 700);
for (let i = 0; i < 2; i++) { await tap(btn("You feed"), 300); await tap(btn("Maya feeds"), 500); await tap(btn("End the day"), 600); }
await caption("Day 3. You both see the hatch at the same moment.", 3200);
await tap(btn("Keep going"), 800);

await caption("Seven clean days earn a shield.", 400);
await tap(btn("7 good days"), 1600);
await caption("Miss a day and the shield takes the hit.", 400);
await tap(btn("A day only you feed"), 1800);
await caption("No shield left? You get 48 hours to restore.", 400);
await tap(btn("A day only you feed"), 1600);
await tap("#banner button", 1600);

await caption("Both answer a question. It reveals when you both have.", 400);
await tap(btn("You answer"), 500);
await tap(btn("Maya answers"), 2000);

await caption("The widget shows who has fed, all day.", 2200);

await caption("Day 100: the adult form depends on how you raised it.", 400);
await tap(btn("Jump to day 100"), 1200);
await page.evaluate(() => showAdult());
await sleep(3200);
await tap(btn("Keep going"), 600);
await caption("It moves into your habitat. A new egg appears.", 2400);
await caption("Kelp. Working title.", 2200);
await caption("", 300);

await ctx.close();
await browser.close();
const webm = readdirSync(out).find((f) => f.endsWith(".webm"));
renameSync(path.join(out, webm), path.join(out, "demo.webm"));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(out, "demo.webm"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", path.join(out, "kelp-demo.mp4")]);
console.log("wrote", path.join(out, "kelp-demo.mp4"));
