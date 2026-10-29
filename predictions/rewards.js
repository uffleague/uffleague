// The rewards shop: league-approved, non-monetary awards (badges, titles, profile decorations, recognition, in-game
// cosmetics) people spend earned virtual points on. Points have no cash value and nothing here sells, transfers or
// cashes them out. Redeeming checks the balance and stock and takes the points in one transaction, exactly once per
// request (a refresh, double click or retry sends the same idempotency key and gets the same redemption back).
//
// Statuses: pending (waiting for staff) -> approved -> fulfilled; pending/approved -> rejected (points back);
// pending -> cancelled by the person (points back); approved/fulfilled -> refunded by an admin (points back).
import { randomUUID } from "node:crypto";
import { tx } from "./db.js";
import { HttpError } from "./errors.js";
import { need, plays } from "./roles.js";

const fail = (status, message) => { throw new HttpError(status, message); };
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const CATEGORIES = { badge: "Profile badge", title: "Achievement title", decoration: "Profile decoration", recognition: "Community recognition",
  cosmetic: "In-game cosmetic", other: "Other league award" };
export const REWARD_ICONS = ["star", "awards", "shield", "flame", "football", "trend", "bowl", "image"];
const ACTIVE = ["pending", "approved", "fulfilled"];
const IDEMPOTENCY = /^[A-Za-z0-9_-]{8,64}$/;

// Shown on the Rewards page
export const REWARD_POLICY = [
  "Virtual points have no cash value. Rewards can't be bought with money, exchanged for money, transferred or resold.",
  "Points come off your balance when you ask for a reward.",
  "You can cancel a request while it's still pending and get your points back.",
  "If staff reject a request, your points come back.",
  "Rewards marked \"needs approval\" are checked by UFF staff first. Staff hand out in-game rewards by hand, so it can take a while."
];

export function createRewards({ db, ledger, audit, limiter, now = Date.now }) {
  const get = (sql, ...a) => db.prepare(sql).get(...a);
  const all = (sql, ...a) => db.prepare(sql).all(...a);
  const run = (sql, ...a) => db.prepare(sql).run(...a);

  const active = (rewardId) => get(`SELECT COUNT(*) AS n FROM redemptions WHERE reward_id = ? AND status IN ('pending', 'approved', 'fulfilled')`, rewardId).n;
  const mineActive = (rewardId, userId) => get(`SELECT COUNT(*) AS n FROM redemptions WHERE reward_id = ? AND user_id = ? AND status IN ('pending', 'approved', 'fulfilled')`, rewardId, userId).n;
  const rewardView = (r, userId = null) => {
    const left = r.inventory == null ? null : Math.max(0, r.inventory - active(r.id));
    const mine = userId ? mineActive(r.id, userId) : 0;
    return { id: r.id, name: r.name, description: r.description, category: r.category, categoryLabel: CATEGORIES[r.category], icon: r.icon,
      image: r.image, cost: r.cost, inventory: r.inventory, left, perUserLimit: r.per_user_limit, mine,
      requiresApproval: !!r.requires_approval, requirements: r.requirements, enabled: !!r.enabled, demo: !!r.demo,
      available: !!r.enabled && left !== 0 && !(r.per_user_limit && mine >= r.per_user_limit) };
  };
  const rewardFor = (id) => {
    const r = get("SELECT * FROM rewards WHERE id = ?", Number(id));
    if (!r) fail(404, "That reward doesn't exist.");
    return r;
  };

  /* ---------- Catalog ---------- */

  const catalog = (user) => ({ policy: REWARD_POLICY, categories: CATEGORIES,
    rewards: all("SELECT * FROM rewards WHERE enabled = 1 ORDER BY cost, id").map((r) => rewardView(r, user && user.id)) });

  function adminCatalog(user) {
    need(user, "rewards.manage");
    return { categories: CATEGORIES, icons: REWARD_ICONS, rewards: all("SELECT * FROM rewards ORDER BY enabled DESC, id DESC").map((r) => rewardView(r)) };
  }

  function checkReward(input) {
    const name = text(input.name, 60);
    if (name.length < 3) fail(400, "Give the reward a name (3-60 characters).");
    const description = text(input.description, 500);
    if (!CATEGORIES[input.category]) fail(400, "Pick a category.");
    const icon = REWARD_ICONS.includes(input.icon) ? input.icon : "star";
    // Pictures come from this site's own folders or an https address (never a script or data URL)
    const image = text(input.image, 300) || null;
    if (image && !/^(gfx|logos)\/[A-Za-z0-9_\-./]+\.(png|jpe?g|webp)$/.test(image) && !/^https:\/\/[^\s"'<>]+\.(png|jpe?g|webp)(\?[^\s"'<>]*)?$/i.test(image)) {
      fail(400, "A picture is a .png, .jpg or .webp from the site's gfx/ or logos/ folder, or an https:// address.");
    }
    const cost = Number(input.cost);
    if (!Number.isInteger(cost) || cost < 1 || cost > 1000000) fail(400, "Cost is 1 to 1,000,000 points.");
    const inventory = input.inventory === "" || input.inventory == null ? null : Number(input.inventory);
    if (inventory !== null && (!Number.isInteger(inventory) || inventory < 0 || inventory > 100000)) fail(400, "Stock is a whole number (blank = no limit).");
    const perUser = input.perUserLimit === "" || input.perUserLimit == null ? null : Number(input.perUserLimit);
    if (perUser !== null && (!Number.isInteger(perUser) || perUser < 1 || perUser > 1000)) fail(400, "The per-person limit is 1 or more (blank = no limit).");
    return { name, description, category: input.category, icon, image, cost, inventory, perUser,
      requiresApproval: input.requiresApproval === false ? 0 : 1, requirements: text(input.requirements, 300), enabled: input.enabled ? 1 : 0 };
  }
  const rewardSnap = (r) => ({ name: r.name, category: r.category, cost: r.cost, inventory: r.inventory, perUserLimit: r.per_user_limit,
    requiresApproval: !!r.requires_approval, enabled: !!r.enabled, description: r.description, requirements: r.requirements, image: r.image, icon: r.icon });

  function createReward(user, input = {}, { demo = false } = {}) {
    need(user, "rewards.manage");
    limiter(`admin:${user.id}`, 60, 60000);
    const f = checkReward(input);
    return tx(db, () => {
      const { lastInsertRowid } = run(`INSERT INTO rewards (name, description, category, icon, image, cost, inventory, per_user_limit, requires_approval, requirements,
        enabled, demo, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        f.name, f.description, f.category, f.icon, f.image, f.cost, f.inventory, f.perUser, f.requiresApproval, f.requirements, f.enabled, demo ? 1 : 0, user.id, now(), now());
      const id = Number(lastInsertRowid);
      audit.log({ actorId: user.id, action: "reward.create", targetType: "reward", targetId: id, detail: { after: rewardSnap(rewardFor(id)) } });
      return { id };
    });
  }

  function updateReward(user, id, input = {}) {
    need(user, "rewards.manage");
    limiter(`admin:${user.id}`, 60, 60000);
    const before = rewardFor(id);
    const f = checkReward(input);
    if (f.inventory !== null && f.inventory < active(before.id)) fail(400, `${active(before.id)} of these are already redeemed or waiting, so stock can't go below that.`);
    return tx(db, () => {
      run(`UPDATE rewards SET name = ?, description = ?, category = ?, icon = ?, image = ?, cost = ?, inventory = ?, per_user_limit = ?, requires_approval = ?,
        requirements = ?, enabled = ?, updated_at = ? WHERE id = ?`, f.name, f.description, f.category, f.icon, f.image, f.cost, f.inventory, f.perUser,
        f.requiresApproval, f.requirements, f.enabled, now(), before.id);
      audit.log({ actorId: user.id, action: "reward.edit", targetType: "reward", targetId: before.id, detail: { before: rewardSnap(before), after: rewardSnap(rewardFor(before.id)) } });
      return { id: before.id };
    });
  }

  /* ---------- Redeeming ---------- */

  const redemptionView = (r, { staff = false } = {}) => {
    const names = (id) => (id ? (get("SELECT username FROM users WHERE id = ?", id) || {}).username : null);
    return { id: r.id, rewardId: r.reward_id, rewardName: r.reward_name, cost: r.cost, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
      decision: r.decided_at ? { by: names(r.decided_by), at: r.decided_at, note: r.decision_note } : null,
      fulfillment: r.fulfilled_at ? { by: names(r.fulfilled_by), at: r.fulfilled_at, note: r.fulfillment_note } : null,
      refund: r.refunded_at ? { at: r.refunded_at, note: r.refund_note } : null,
      ...(staff ? { user: (get("SELECT username, account_id FROM users WHERE id = ?", r.user_id) || {}) } : {}) };
  };

  function redeem(user, { rewardId, idempotencyKey } = {}) {
    if (!user) fail(401, "Sign in to redeem rewards.");
    if (!plays(user)) fail(403, "Staff and admin accounts handle redemptions, so they can't redeem rewards themselves.");
    const key = String(idempotencyKey || "");
    if (!IDEMPOTENCY.test(key)) fail(400, "Missing request id. Reload the page and try again.");
    limiter(`redeem:${user.id}`, 10, 60000);
    return tx(db, () => {
      // The same request again (refresh, double click, retry): the first result, nothing taken twice
      const same = get("SELECT * FROM redemptions WHERE user_id = ? AND idempotency_key = ?", user.id, key);
      if (same) return { redemption: redemptionView(same), repeated: true };
      const r = rewardFor(rewardId);
      if (!r.enabled) fail(409, "That reward isn't available right now.");
      if (r.inventory != null && active(r.id) >= r.inventory) fail(409, "That reward is out of stock.");
      if (r.per_user_limit && mineActive(r.id, user.id) >= r.per_user_limit) fail(409, `You can have ${r.per_user_limit} of this reward at most.`);
      const u = get("SELECT balance, status FROM users WHERE id = ?", user.id);
      if (u.status !== "active") fail(403, "This account is suspended.");
      if (u.balance < r.cost) fail(409, `This reward needs ${r.cost.toLocaleString("en-US")} points and you have ${u.balance.toLocaleString("en-US")}.`);
      const status = r.requires_approval ? "pending" : "approved";
      const { lastInsertRowid } = run(`INSERT INTO redemptions (user_id, reward_id, reward_name, cost, status, idempotency_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, user.id, r.id, r.name, r.cost, status, key, now(), now());
      const id = Number(lastInsertRowid);
      ledger.post({ userId: user.id, delta: -r.cost, kind: "redeem", redemptionId: id, actorId: user.id, note: `Redeemed: ${r.name}`, idempotencyKey: `redeem:${id}` });
      audit.log({ actorId: user.id, action: "redemption.request", targetType: "redemption", targetId: id, detail: { reward: r.name, cost: r.cost, status } });
      return { redemption: redemptionView(get("SELECT * FROM redemptions WHERE id = ?", id)) };
    });
  }

  const redemptionFor = (id) => {
    const r = get("SELECT * FROM redemptions WHERE id = ?", Number(id));
    if (!r) fail(404, "That redemption doesn't exist.");
    return r;
  };
  // Points back, once: the refund's idempotency key is the redemption's own
  const refundPoints = (r, actorId, note) => ledger.post({ userId: r.user_id, delta: r.cost, kind: "redeem_refund", redemptionId: r.id, actorId,
    note, idempotencyKey: `redemption:${r.id}:refund` });

  // Your own requests only
  function mine(user) {
    if (!user) fail(401, "Sign in to see your redemptions.");
    return all("SELECT * FROM redemptions WHERE user_id = ? ORDER BY id DESC", user.id).map((r) => redemptionView(r));
  }

  function cancelOwn(user, id) {
    if (!user) fail(401, "Sign in first.");
    return tx(db, () => {
      const r = redemptionFor(id);
      if (r.user_id !== user.id) fail(404, "That redemption doesn't exist."); // someone else's is never confirmed to exist
      if (r.status === "cancelled") return { redemption: redemptionView(r), already: true };
      if (r.status !== "pending") fail(409, "Only a pending request can be cancelled.");
      run("UPDATE redemptions SET status = 'cancelled', updated_at = ?, refunded_at = ?, refund_note = ? WHERE id = ?", now(), now(), "Cancelled by you", r.id);
      refundPoints(r, user.id, `Cancelled: ${r.reward_name}`);
      audit.log({ actorId: user.id, action: "redemption.cancel", targetType: "redemption", targetId: r.id, detail: { before: { status: r.status }, after: { status: "cancelled" }, refunded: r.cost } });
      return { redemption: redemptionView(redemptionFor(r.id)) };
    });
  }

  /* ---------- Staff ---------- */

  function requests(user, { status = "" } = {}) {
    need(user, "redemptions.review");
    const rows = status
      ? all("SELECT * FROM redemptions WHERE status = ? ORDER BY id DESC LIMIT 200", String(status))
      : all("SELECT * FROM redemptions ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, id DESC LIMIT 200");
    return rows.map((r) => redemptionView(r, { staff: true }));
  }

  // approve | reject | fulfill (staff), refund (admin). Repeating a finished step changes nothing.
  function act(user, id, { action, note } = {}) {
    need(user, action === "refund" ? "redemptions.refund" : "redemptions.review");
    limiter(`admin:${user.id}`, 60, 60000);
    const why = text(note, 500);
    return tx(db, () => {
      const r = redemptionFor(id);
      if (r.user_id === user.id) fail(403, "You can't review your own request.");
      const done = (to) => ({ redemption: redemptionView(r, { staff: true }), already: true, status: to });
      const log = (to, extra = {}) => audit.log({ actorId: user.id, action: `redemption.${action}`, targetType: "redemption", targetId: r.id,
        detail: { reward: r.reward_name, user: get("SELECT username FROM users WHERE id = ?", r.user_id).username, before: { status: r.status }, after: { status: to }, note: why || undefined, ...extra } });
      if (action === "approve") {
        if (r.status === "approved") return done("approved");
        if (r.status !== "pending") fail(409, `A ${r.status} request can't be approved.`);
        run("UPDATE redemptions SET status = 'approved', decided_by = ?, decided_at = ?, decision_note = ?, updated_at = ? WHERE id = ?", user.id, now(), why || null, now(), r.id);
        log("approved");
      } else if (action === "reject") {
        if (r.status === "rejected") return done("rejected");
        if (!["pending", "approved"].includes(r.status)) fail(409, `A ${r.status} request can't be rejected.`);
        if (why.length < 3) fail(400, "Say why the request is rejected (the person sees this).");
        run("UPDATE redemptions SET status = 'rejected', decided_by = ?, decided_at = ?, decision_note = ?, refunded_at = ?, refund_note = ?, updated_at = ? WHERE id = ?",
          user.id, now(), why, now(), "Rejected: points returned", now(), r.id);
        refundPoints(r, user.id, `Rejected: ${r.reward_name}`);
        log("rejected", { refunded: r.cost });
      } else if (action === "fulfill") {
        if (r.status === "fulfilled") return done("fulfilled");
        if (r.status !== "approved") fail(409, r.status === "pending" ? "Approve the request before marking it fulfilled." : `A ${r.status} request can't be fulfilled.`);
        run("UPDATE redemptions SET status = 'fulfilled', fulfilled_by = ?, fulfilled_at = ?, fulfillment_note = ?, updated_at = ? WHERE id = ?", user.id, now(), why || null, now(), r.id);
        log("fulfilled");
      } else if (action === "refund") {
        if (r.status === "refunded") return done("refunded");
        if (!["approved", "fulfilled"].includes(r.status)) fail(409, r.status === "pending" ? "Reject a pending request instead (that returns the points)." : `A ${r.status} request has nothing to refund.`);
        if (why.length < 3) fail(400, "Say why the points are refunded.");
        run("UPDATE redemptions SET status = 'refunded', refunded_at = ?, refund_note = ?, updated_at = ? WHERE id = ?", now(), why, now(), r.id);
        refundPoints(r, user.id, `Refund: ${r.reward_name}`);
        log("refunded", { refunded: r.cost });
      } else {
        fail(400, "Unknown action.");
      }
      return { redemption: redemptionView(redemptionFor(r.id), { staff: true }) };
    });
  }

  // Demo mode only: a few clearly labeled sample rewards, so the shop can be tried. Never in live mode.
  function seedDemo(systemUserId = null) {
    if (get("SELECT id FROM rewards LIMIT 1")) return 0;
    const note = " (Demo reward for local testing, not a real UFF prize.)";
    const demo = [
      ["Sharpshooter badge", "badge", "awards", 500, null, null, 1, "A profile badge for sharp predictors." + note, "Have at least one correct pick."],
      ["Prediction Pro title", "title", "star", 1500, null, 1, 1, "\"Prediction Pro\" shown by your name on the site." + note, ""],
      ["Gold name trim", "decoration", "flame", 2500, 5, 1, 1, "A gold trim on your profile card. Only five made." + note, ""],
      ["Community shout-out", "recognition", "trend", 300, null, null, 0, "A shout-out in the weekly league post." + note, "Staff pick the wording."]
    ];
    demo.forEach(([name, category, icon, cost, inventory, perUser, approval, description, requirements]) => run(`INSERT INTO rewards (name, description, category, icon, cost,
      inventory, per_user_limit, requires_approval, requirements, enabled, demo, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`,
      name, description, category, icon, cost, inventory, perUser, approval, requirements, systemUserId, now(), now()));
    audit.log({ actorId: null, action: "reward.seed_demo", targetType: "reward", targetId: null, detail: { count: demo.length } });
    return demo.length;
  }

  return { catalog, adminCatalog, createReward, updateReward, redeem, mine, cancelOwn, requests, act, seedDemo, newKey: () => randomUUID() };
}
