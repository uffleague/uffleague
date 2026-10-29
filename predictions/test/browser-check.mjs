// Browser check for accounts + predictions, in real (headless) Microsoft Edge. Not part of `npm test` because it
// needs Edge; run it with:  node predictions/test/browser-check.mjs
// It starts its own server (demo mode, port 4175, a throwaway database and pepper in a temp folder), so it never
// touches your local data, then drives the site like a visitor would and prints PASS/FAIL for each check.
// Screenshots go to the temp folder it prints.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/microsoft-edge", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"].find(existsSync);
if (!EDGE) { console.error("Microsoft Edge wasn't found, so the browser check can't run."); process.exit(2); }
const TMP = mkdtempSync(join(tmpdir(), "uff-browser-"));
const PORT = 4175, SITE = `http://127.0.0.1:${PORT}`, ADMIN_PIN = "39175";
const DB = join(TMP, "check.db"), PEPPER = randomBytes(32).toString("hex");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, [join(ROOT, "predictions", "server.js"), "--demo"], { stdio: "ignore",
  env: { ...process.env, PRED_PORT: String(PORT), PRED_DB: DB, PRED_PEPPER: PEPPER } });
// The accounts tool on the same throwaway database: test accounts, and the first Super Admin
const tool = (args, input) => spawnSync(process.execPath, [join(ROOT, "predictions", "accounts.js"), ...args, "--demo"],
  { env: { ...process.env, PRED_DB: DB, PRED_PEPPER: PEPPER }, input, encoding: "utf8" });
const edge = spawn(EDGE, ["--headless=new", "--remote-debugging-port=9334", `--user-data-dir=${join(TMP, "edge")}`, "--no-first-run", "--disable-extensions", "about:blank"], { stdio: "ignore" });

let failed = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`); if (!ok) failed++; };

try {
  for (let i = 0; i < 50; i++) { try { await fetch(SITE + "/"); break; } catch { await wait(200); } }
  let ver;
  for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch("http://127.0.0.1:9334/json/version")).json(); } catch { await wait(200); } }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let seq = 0; const pending = new Map(); const errors = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value || a.description).join(" "));
  });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const id = ++seq; pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId: S } = await send("Target.attachToTarget", { targetId, flatten: true });
  const cmd = (m, p) => send(m, p, S);
  await cmd("Page.enable"); await cmd("Runtime.enable");
  const size = (width, height) => cmd("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  const js = async (expr) => (await cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
  const settle = () => wait(900);
  const open = async (hash) => { await cmd("Page.navigate", { url: `${SITE}/${hash}` }); await wait(1800); };
  // Like clicking a link; going to the page you're already on still redraws it (a link to the same page would too)
  const go = async (hash) => { await js(`location.hash === ${JSON.stringify(hash)} ? window.dispatchEvent(new HashChangeEvent("hashchange")) : (location.hash = ${JSON.stringify(hash)})`); await settle(); };
  const reload = async () => { await cmd("Page.reload"); await wait(2000); };
  const shot = async (name) => {
    const { data } = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(TMP, `${name}.png`), Buffer.from(data, "base64"));
  };
  const noOverflow = () => js("document.documentElement.scrollWidth <= innerWidth");
  const text = (sel) => js(`(document.querySelector(${JSON.stringify(sel)}) || {}).innerText || ""`);
  const has = (sel) => js(`!!document.querySelector(${JSON.stringify(sel)})`);
  const type = (sel, value) => js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event("input", { bubbles: true })); return el.value; })()`);
  const click = (sel) => js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  // textContent: innerText would come back in the header's CSS capitals
  const raw = (sel) => js(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ""`);
  const headerUser = async () => (await raw("#acctBox .acct-name")).trim();
  const api = (path, body) => js(`fetch(${JSON.stringify(path)}, { method: "POST", headers: { "content-type": "application/json",
    "x-csrf-token": (document.cookie.match(/uffp_csrf=([0-9a-f]{32})/) || [])[1] || "" }, body: JSON.stringify(${JSON.stringify(body)}) }).then((r) => r.json())`);

  await size(1280, 900);
  // Test accounts, and the first Super Admin (an ordinary account bootstrapped with the accounts tool)
  tool(["create", "check_admin"], `${ADMIN_PIN}\n`);
  const boot = tool(["bootstrap-admin", "check_admin"]);
  check(/is now the Super Admin/.test(boot.stdout), "accounts tool makes the first Super Admin", boot.stderr || boot.stdout);
  tool(["create", "check_player"], "28461\n");
  tool(["create", "check_staff"], "37192\n");
  check(/already a Super Admin/.test(tool(["bootstrap-admin", "check_player"]).stderr), "a second bootstrap is refused");

  // Markets to pick on and build a challenge from (the admin signs in with the PIN, unlocks, then signs out)
  await open("#/");
  await api("/api/auth/login", { username: "check_admin", pin: ADMIN_PIN });
  check((await api("/api/predictions/admin/markets", {})).code === "elevate", "a PIN session can't use admin tools until unlocked");
  await api("/api/auth/elevate", { pin: ADMIN_PIN });
  const games = await js(`fetch("/api/predictions/admin/games").then((r) => r.json())`);
  const g = games.games.find((x) => x.id === "SAMPLE-1"), g2 = games.games.find((x) => x.id === "SAMPLE-2");
  const made = await api("/api/predictions/admin/markets", { kind: "game_winner", gameId: g.id, closesAt: g.at });
  const ou = await api("/api/predictions/admin/markets", { kind: "player_ou", gameId: g2.id, player: "biglester1", playerTeam: "New Orleans Raiders", statKey: "pass_yds", line: 499.5, closesAt: g2.at });
  await api("/api/auth/logout", {});
  check(Number.isInteger(made.id) && Number.isInteger(ou.id), "admin made two sample markets", JSON.stringify([made, ou]));

  // Guests: browsing never needs an account
  await open("#/");
  check(await headerUser() === "" && (await raw("#acctBox")).trim() === "Sign In", "guest sees Sign In in the header");
  for (const hash of ["#/", "#/teams", "#/schedule", "#/standings", "#/scores", "#/stats", "#/playoff", "#/records", "#/uff-predictions", `#/uff-predictions/m/${made.id}`, "#/uff-predictions/leaders"]) {
    await go(hash);
    check((await js("location.hash")) === hash && (await js("document.getElementById('app').innerText.length")) > 40, `guest can open ${hash}`);
  }
  check(await has("#topnav a[data-path='uff-predictions']"), "nav keeps its links (UFF Predictions present)");
  check((await js("[...document.querySelectorAll('#topnav a')].map((a) => a.textContent).join(',')")).startsWith("Home,Teams,Schedule"), "nav order unchanged");

  // A guest trying to pick gets a sign-in prompt, not a dead end
  await go(`#/uff-predictions/m/${made.id}`);
  await click("[data-pm-pick=a]"); await settle();
  const promptHref = await js(`(document.querySelector(".pm-modal .signin-prompt .btn-primary") || {}).getAttribute?.("href") || ""`);
  check(promptHref.startsWith("#/sign-in/") && decodeURIComponent(promptHref.slice(10)) === `#/uff-predictions/m/${made.id}`, "guest pick opens a sign-in prompt that remembers the market", promptHref);
  await shot("01-guest-pick-prompt");
  check((await js("document.querySelector('#app').innerText")).length > 0 && (await js("location.hash")) === `#/uff-predictions/m/${made.id}`, "the market page stays open behind the prompt");
  await go("#/uff-predictions/me");
  check(await has(".signin-prompt"), "My Predictions asks a guest to sign in");
  await go("#/account");
  check(await has(".signin-prompt"), "Account asks a guest to sign in");

  // Sign-in page: the design pieces
  await go("#/sign-in");
  await shot("02-sign-in-desktop");
  const card = await text(".auth-card");
  for (const s of ["UFF", "UNITED FLAG FOOTBALL", "ACCOUNT ACCESS", "Enter your details to continue.", "USERNAME", "Continue", "OR", "Create an account"]) check(card.includes(s), `sign-in card shows "${s}"`);
  check(await js(`document.getElementById("authUser").placeholder`) === "Type in user", "username placeholder");
  check(await has(".auth-input .icon.auth-ico"), "username field has its icon");
  check(await js(`document.getElementById("authSubmit").disabled`), "Continue is off until a username is typed");
  const feats = await js(`[...document.querySelectorAll(".auth-feature")].map((a) => [a.querySelector("b").textContent, a.getAttribute("href")])`);
  check(JSON.stringify(feats) === JSON.stringify([["Track Stats", "#/stats"], ["Make Predictions", "#/uff-predictions"], ["Compete", "#/uff-predictions/leaders"], ["Be Part of UFF", "#/teams"]]), "four feature links", JSON.stringify(feats));
  check(await js(`getComputedStyle(document.querySelector(".auth-features")).gridTemplateColumns.split(" ").length`) === 4, "features in one row on desktop");
  for (const [label, href] of feats) {
    await go("#/sign-in");
    await click(`.auth-feature[href="${href}"]`); await settle();
    check((await js("location.hash")) === href && (await js("document.getElementById('app').innerText.length")) > 40, `feature link "${label}" opens ${href}`);
  }

  // Create an account (leading-zero PIN), from a remembered destination
  await go(`#/create-account/${encodeURIComponent("#/uff-predictions/me")}`);
  check((await text(".auth-card")).includes("CREATE ACCOUNT"), "Create an account opens its own page");
  await shot("03-create-account-desktop");
  await type("#authUser", "zeroes_fan");
  await type("#newPin", "04213");
  await type("#newPin2", "04231");
  await click("#authSubmit"); await settle();
  check((await text("#authError")).includes("don't match"), "mismatched PINs are caught");
  await type("#newPin2", "04213");
  await type("#newPin", "04a2b13c");
  check(await js(`document.getElementById("newPin").value`) === "04213", "PIN box keeps only digits and keeps the leading zero");
  await click("#authSubmit"); await wait(2000);
  check(await headerUser() === "zeroes_fan", "new account is signed in (name in the header)");
  check((await js("location.hash")) === "#/uff-predictions/me", "and lands where they were headed");
  check((await text(".pm-chips")).includes("1,000"), "new account starts with 1,000 virtual points");

  // Refresh keeps you signed in
  await reload();
  check(await headerUser() === "zeroes_fan", "still signed in after a page refresh");
  // Signed in, the header still fits: every top-bar link on one line, none running into the buttons
  for (const w of [1200, 1280, 1440]) {
    await size(w, 900); await settle();
    check(await js(`(() => { const links = [...document.querySelectorAll("#topnav a")], acts = document.querySelector(".head-actions").getBoundingClientRect();
      return links.every((a) => a.getBoundingClientRect().height < 40 && a.getBoundingClientRect().right <= acts.left + 1); })()`), `${w}px: header fits with the account button`);
  }
  await size(1280, 900);
  await click("#acctBtn"); await wait(300);
  const menu = await text("#acctMenu");
  check(menu.includes("Profile") && menu.includes("Sign Out"), "account menu has Profile and Sign Out");
  await shot("04-account-menu");
  await click("#acctMenu a[href='#/account']"); await settle();
  check((await raw(".acct-profile h2")) === "zeroes_fan" && (await raw(".acct-profile")).includes("reset"), "profile shows the account and says PIN reset isn't available", (await text("#app")).slice(0, 300));

  // Sign out: public pages stay, the server session is gone
  await click("#acctBtn"); await wait(200);
  await click("#acctMenu [data-acct=signout]"); await wait(1500);
  check((await raw("#acctBox")).trim() === "Sign In", "signed out: header shows Sign In again");
  check(await has(".signin-prompt"), "account page now asks to sign in (page still open)");
  const after = await js(`fetch("/api/auth/session").then((r) => r.json())`);
  check(after.user === null, "server session ended");

  // Two-step sign in: username, then PIN; a wrong PIN gets a generic message
  await go(`#/sign-in/${encodeURIComponent(`#/uff-predictions/m/${made.id}`)}`);
  check(!(await has("#authPin")), "step 1 asks only for the username");
  const cardWidth = () => js(`document.querySelector(".auth-card").getBoundingClientRect().width`);
  const width1 = await cardWidth();
  await type("#authUser", "zeroes_fan");
  await click("#authSubmit"); await settle();
  check(await has("#authPin") && (await text(".auth-who")).includes("zeroes_fan"), "step 2 asks for the PIN");
  check(width1 === 440 && (await cardWidth()) === 440, "the card stays the same width in both steps", `${width1} / ${await cardWidth()}`);
  check(await js(`document.getElementById("authPin").placeholder`) === "Enter your 5 digit pin" && (await text(".auth-card")).includes("5-DIGIT PIN"), "PIN label and placeholder");
  await type("#authPin", "04214");
  await click("[data-show-pin=authPin]");
  check(await js(`document.getElementById("authPin").type`) === "text" && await js(`document.querySelector("[data-show-pin]").getAttribute("aria-pressed")`) === "true", "show/hide PIN works");
  await click("#authSubmit"); await wait(1500);
  check((await text("#authError")).includes("don't match an account"), "wrong PIN: generic error", await text("#authError"));
  await shot("05-sign-in-wrong-pin");
  await type("#authPin", "04213");
  await click("#authSubmit"); await wait(2000);
  check(await headerUser() === "zeroes_fan" && (await js("location.hash")) === `#/uff-predictions/m/${made.id}`, "right PIN signs in and returns to the market");
  await click("[data-pm-pick=a]"); await settle();
  await click("[data-pm=confirm]"); await wait(1500);
  check((await raw(".pm-choices")).includes("Your pick"), "signed-in user can make the pick", (await text("#app")).slice(0, 600).replace(/\n+/g, " | "));

  // Unknown username gets the same message as a wrong PIN
  await click("#acctBtn"); await wait(200); await click("#acctMenu [data-acct=signout]"); await wait(1200);
  await go("#/sign-in");
  await type("#authUser", "nobody_here"); await click("#authSubmit"); await settle();
  await type("#authPin", "04213"); await click("#authSubmit"); await wait(1500);
  check((await text("#authError")).includes("don't match an account"), "unknown username: same generic error");

  /* ---------- Admin expansion: guests, UFF Admin, challenges, credits, roles, rewards ---------- */
  const flash = () => text(".admin-flash");
  const select = (sel, value) => js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return el.value; })()`);
  const confirmYes = async (reason) => { if (reason != null) await type("#uaReason", reason); await click("[data-ua='confirm-yes']"); await wait(1600); };

  // Guests: the shop and challenges are open to browse; admin and redeeming ask for an account
  await go("#/rewards");
  check((await js(`document.querySelectorAll(".rw-card").length`)) === 4 && (await raw(".rw-grid")).includes("Demo"), "guest sees the (labeled demo) rewards catalog");
  await click("[data-rw-redeem]"); await settle();
  check(await has(".pm-modal .signin-prompt"), "guest redeeming gets a sign-in prompt");
  await shot("09-rewards-guest");
  await js(`document.querySelector(".pm-modal").click()`); await settle();
  await go("#/uff-admin");
  check(await has(".signin-prompt") && !(await has(".ua-tabs")), "guest at UFF Admin is asked to sign in (no admin pages)");

  // A player has no admin access, page or API
  await api("/api/auth/login", { username: "check_player", pin: "28461" });
  await go("#/uff-admin"); await settle();
  check((await raw("#app")).includes("No admin access"), "a player at UFF Admin sees 'No admin access'");
  check((await js(`fetch("/api/admin/overview").then((r) => r.status)`)) === 403, "a player calling the admin API gets 403");
  await api("/api/auth/logout", {});

  // The Super Admin: signed in with the PIN, then the PIN again on the unlock card
  await api("/api/auth/login", { username: "check_admin", pin: ADMIN_PIN });
  await go("#/uff-admin"); await settle();
  check(await has("#staffForm") && !(await has(".ua-tabs")), "UFF Admin asks a signed-in Super Admin to unlock with their PIN first");
  await shot("10-admin-unlock");
  await type("#staffPass", "11223"); await click("#staffForm .auth-submit"); await wait(1400);
  check((await raw("#authError")).includes("isn't right"), "a wrong PIN at the unlock step is refused");
  await type("#staffPass", ADMIN_PIN); await click("#staffForm .auth-submit"); await wait(2000);
  const tabs = await js(`[...document.querySelectorAll(".ua-tabs a")].map((a) => a.textContent).join("|")`);
  check(tabs === "Overview|Prediction Challenges|User Management|Credits Management|Rewards Catalog|Redemption Requests|Admin Permissions|Audit Logs", "the right PIN opens all eight sections", tabs);
  check((await raw(".stat-chips")).includes("every balance matches"), "overview shows the ledger check");
  await shot("11-admin-overview");

  // Build a challenge: details, two legs (reordered), draft, preview, publish
  await go("#/uff-admin/challenges");
  await click("[data-ua='new-challenge']"); await settle();
  await type("#uaChallengeForm [name=title]", "UFF Weekly Challenge");
  await type("#uaChallengeForm [name=description]", "Two picks, one entry. Free to enter.");
  const deadline = await js(`(() => { const d = new Date(Date.now() + 2 * 3600e3); d.setSeconds(0, 0); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); })()`);
  await select("#uaChallengeForm [name=deadline]", deadline); await settle();
  await select("#uaAddLeg", String(made.id)); await settle();
  await select("#uaAddLeg", String(ou.id)); await settle();
  check((await js(`document.querySelectorAll(".ua-leg").length`)) === 2, "builder: two legs added from real markets");
  await click("[data-ua-leg='down'][data-i='0']"); await settle();
  check((await raw(".ua-preview-legs li")).includes("biglester1"), "builder: reordering moves the leg (preview follows)");
  check((await raw(".ua-preview")).includes("Up to 150 pts"), "builder: preview shows the award before publishing", await raw(".ua-preview"));
  await shot("12-admin-builder");
  await click("#uaChallengeForm .btn:not([type=button])"); await wait(1600);
  check((await flash()).includes("Draft created"), "builder: draft saved", await flash());
  await click("#uaChallengeForm [data-ua-ch='publish']"); await settle();
  check((await raw(".pm-modal")).includes("can't be edited"), "publishing asks for confirmation first");
  await confirmYes();
  check((await flash()).includes("is live"), "confirming publishes the challenge", await flash());
  const challengeId = (await js(`fetch("/api/challenges").then((r) => r.json())`)).challenges[0].id;

  // Credits: find a username, see the account, add points with a reason, confirm
  await go("#/uff-admin/credits");
  await type("#uaQ-credits", "check_pl"); await click("[data-ua-search='credits'] button"); await wait(1200);
  await click("[data-ua-pick='credits']"); await wait(1500);
  check((await raw(".ua-balance")).includes("1,000") && (await raw(".acct-facts")).includes("check_player"), "credits: search finds the account and shows balance and account id");
  await type("#uaAdjustForm [name=amount]", "250");
  await select("#uaAdjustForm [name=reasonCode]", "event");
  await type("#uaAdjustForm [name=note]", "Week 1 watch party");
  await click("#uaAdjustForm .btn-primary"); await settle();
  check((await raw(".pm-modal")).includes("1,000 → 1,250"), "credits: confirmation shows before and after", await raw(".pm-modal"));
  await shot("13-admin-credit-confirm");
  await confirmYes();
  check((await flash()).includes("now has 1,250"), "credits: added, with the new balance", await flash());
  check((await raw(".ua-table")).includes("Admin: added") && (await raw(".ua-table")).includes("check_admin"), "credits: the ledger shows the change and who made it");

  // Permissions: give check_staff the Staff role (confirmed, with a reason)
  await go("#/uff-admin/permissions");
  await type("#uaQ-permissions", "check_staff"); await click("[data-ua-search='permissions'] button"); await wait(1200);
  await click(".ua-results [data-ua-pick='permissions']"); await wait(1500);
  await select("#uaRoleForm [name=role]", "staff");
  await click("#uaRoleForm .btn-primary"); await settle();
  check((await raw(".pm-modal")).includes("Player → Staff"), "role change asks for confirmation, showing old and new role");
  await confirmYes("Helps run weekly challenges");
  check((await flash()).includes("is now Staff"), "role granted", await flash());
  check((await raw(".table-card")).includes("check_staff"), "Accounts with a role lists them, with who gave it");
  await api("/api/auth/logout", {});

  // A player enters the challenge (free) and redeems a reward (points taken once)
  await api("/api/auth/login", { username: "check_player", pin: "28461" });
  await go(`#/uff-predictions/c/${challengeId}`);
  check((await raw(".pm-rules")).includes("Free to enter"), "challenge page shows the scoring rules");
  await click("#chForm .ch-submit"); await settle();
  check((await raw(".pm-err")).includes("Answer every leg"), "submitting needs every leg answered");
  await js(`document.querySelectorAll("#chForm .ch-leg").forEach((leg) => leg.querySelector("input[type=radio]").click())`);
  await click("#chForm .ch-submit"); await wait(1600);
  check((await raw(".admin-flash")).includes("Entry submitted"), "the entry is saved", await raw(".admin-flash"));
  check((await raw("#chForm .ch-submit")).includes("Update entry"), "answers can still change before the deadline");
  await shot("14-challenge-entered");
  await go("#/rewards");
  const sharp = await js(`[...document.querySelectorAll(".rw-card")].find((c) => c.textContent.includes("Sharpshooter")).querySelector("[data-rw-redeem]").dataset.rwRedeem`);
  await click(`[data-rw-redeem="${sharp}"]`); await settle();
  check((await raw(".pm-modal")).includes("1,250 to 750"), "redeem confirmation shows the balance before and after", await raw(".pm-modal"));
  await shot("15-redeem-confirm");
  await js(`(() => { const b = document.querySelector("[data-rw='confirm']"); b.click(); b.click(); b.click(); })()`); await wait(1800);
  check((await raw(".admin-flash")).includes("waiting for staff approval"), "redeemed: pending staff approval", await raw(".admin-flash"));
  const mine = await js(`fetch("/api/rewards/mine").then((r) => r.json())`);
  check(mine.redemptions.length === 1, "three quick clicks made one redemption", JSON.stringify(mine.redemptions.length));
  check((await raw(".pm-account .pill")).includes("750"), "balance shows 750 after redeeming");
  await go("#/rewards/mine");
  check((await raw(".rd-row")).includes("Pending"), "My Redemptions lists it as pending");
  await api("/api/auth/logout", {});

  // Staff side (as the Super Admin): approve, then fulfill; the audit log has everything
  await api("/api/auth/login", { username: "check_admin", pin: ADMIN_PIN });
  await api("/api/auth/elevate", { pin: ADMIN_PIN });
  await go("#/uff-admin/redemptions");
  check((await raw(".ua-rd")).includes("check_player"), "the request shows in Redemption Requests");
  await click("[data-ua-rd='approve']"); await settle(); await confirmYes();
  check((await flash()).includes("Approved"), "approved", await flash());
  await click("[data-ua-rdf='approved']"); await settle();
  await click("[data-ua-rd='fulfill']"); await settle(); await confirmYes("Badge added in game");
  check((await flash()).includes("Fulfilled"), "fulfilled", await flash());
  await go("#/uff-admin/audit");
  const log = await raw(".ua-audit");
  check(["redemption.fulfill", "redemption.approve", "role.grant", "credits.add", "challenge.publish", "challenge.create", "role.bootstrap"].every((a) => log.includes(a)), "audit log has every sensitive action");
  check(!log.includes(ADMIN_PIN), "audit log holds no PINs");
  await shot("16-admin-audit");

  // Phone and tablet widths
  for (const [w, h, cols] of [[390, 844, 1], [768, 1024, 2]]) {
    await size(w, h);
    for (const hash of ["#/sign-in", "#/create-account", `#/uff-predictions/m/${made.id}`, "#/rewards", `#/uff-predictions/c/${challengeId}`, "#/uff-admin/credits", "#/uff-admin/challenges", "#/uff-admin/audit", "#/"]) {
      await go(hash);
      check(await noOverflow(), `${w}px ${hash}: no sideways scrolling`);
      if (hash !== "#/") await shot(`06-${w}-${hash.replace(/[^a-z0-9]+/gi, "-")}`);
    }
    await go("#/sign-in");
    check(await js(`getComputedStyle(document.querySelector(".auth-features")).gridTemplateColumns.split(" ").length`) === cols, `${w}px: features in ${cols} column(s)`);
  }
  check(errors.length === 0, "no errors in the browser console", errors.join(" | "));
  ws.close();
} catch (e) {
  check(false, "browser check ran to the end", e.message);
} finally {
  edge.kill();
  server.kill();
  console.log(`\n${failed ? `${failed} check(s) FAILED` : "All browser checks passed"}. Screenshots: ${TMP}`);
  process.exitCode = failed ? 1 : 0;
}
