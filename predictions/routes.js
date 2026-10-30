// Every /api/ route for accounts, predictions, parlays (challenges), rewards and UFF Admin, shared by the local server
// (server.js) and Cloudflare (worker/src/predictions.js). Each side does its own sign-in transport (cookies locally,
// a bearer token on Cloudflare) and hands this the signed-in user. Returns { body } or { body, session } where
// session is a new session token to hand back (sign in / sign up) or "" to clear it (sign out).
import { HttpError } from "./errors.js";

export function createRoutes({ service, auth, challenges, rewards, admin, league, config, leagueSignIn, saveLeagueLogin }) {
  return async function route({ method, url, body = {}, user, token, ip }) {
    let m;
    const p = url.pathname.replace(/\/+$/, "");
    const q = url.searchParams;

    // Accounts: /api/auth/* and /api/account
    if (p.startsWith("/api/auth/") || p === "/api/account") {
      const signedIn = (s) => ({ body: { user: s.user, token: s.token }, session: s.token });
      if (method === "GET" && p === "/api/auth/session") return { body: { user } };
      if (method === "POST" && p === "/api/auth/login") return signedIn(auth.signIn({ username: body.username, pin: body.pin, ip }));
      if (method === "POST" && p === "/api/auth/signup") return signedIn(auth.createAccount({ username: body.username, pin: body.pin, confirmPin: body.confirmPin, ip }));
      if (method === "POST" && p === "/api/auth/logout") {
        auth.logout(token);
        return { body: { ok: true }, session: "" };
      }
      if (method === "GET" && p === "/api/account") return { body: auth.profile(user) };
      if (method === "POST" && p === "/api/auth/league-login" && leagueSignIn) return { body: await leagueSignIn(user) };
      // An Admin saves the league login for everyone's auto-login; it's only kept if the live League Admin accepts it
      if (method === "POST" && p === "/api/auth/league-login/save" && saveLeagueLogin) return { body: await saveLeagueLogin(user, body) };
      throw new HttpError(404, "Not found.");
    }

    // Challenges (public; entering needs an account)
    if (p.startsWith("/api/challenges")) {
      if (method === "GET" && p === "/api/challenges") return { body: { challenges: challenges.list(user) } };
      if (method === "GET" && p === "/api/challenges/mine") return { body: { entries: challenges.myEntries(user) } };
      if (method === "GET" && (m = p.match(/^\/api\/challenges\/(\d+)$/))) return { body: await challenges.detail(user, m[1]) };
      if (method === "POST" && (m = p.match(/^\/api\/challenges\/(\d+)\/enter$/))) {
        const out = challenges.enter(user, m[1], body.picks || {});
        return { body: { ...out, ...(await challenges.detail(user, m[1])) } };
      }
      throw new HttpError(404, "Not found.");
    }
    // Rewards (the catalog is public; redeeming and your history need an account)
    if (p.startsWith("/api/rewards")) {
      if (method === "GET" && p === "/api/rewards") return { body: rewards.catalog(user) };
      if (method === "GET" && p === "/api/rewards/mine") return { body: { redemptions: rewards.mine(user) } };
      if (method === "POST" && p === "/api/rewards/redeem") return { body: rewards.redeem(user, { rewardId: body.rewardId, idempotencyKey: body.idempotencyKey }) };
      if (method === "POST" && (m = p.match(/^\/api\/rewards\/redemptions\/(\d+)\/cancel$/))) return { body: rewards.cancelOwn(user, m[1]) };
      throw new HttpError(404, "Not found.");
    }
    // UFF Admin: every function checks the permission itself
    if (p.startsWith("/api/admin")) {
      if (!user) throw new HttpError(401, "Sign in first.");
      if (method === "GET" && p === "/api/admin/overview") return { body: admin.overview(user) };
      if (method === "GET" && p === "/api/admin/users") return { body: { users: admin.search(user, q.get("q") || "") } };
      if (method === "GET" && (m = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})$/))) return { body: admin.detail(user, m[1]) };
      if (method === "GET" && (m = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/ledger$/))) return { body: admin.history(user, m[1], q.get("before")) };
      if (method === "POST" && p === "/api/admin/users/status") return { body: admin.setStatus(user, body) };
      if (method === "POST" && p === "/api/admin/credits") return { body: admin.adjust(user, body) };
      if (method === "GET" && p === "/api/admin/credit-reasons") return { body: { reasons: admin.reasons } };
      if (method === "GET" && p === "/api/admin/staff") return { body: { staff: admin.staffList(user) } };
      if (method === "POST" && p === "/api/admin/roles") return { body: admin.setRole(user, body) };
      if (method === "GET" && p === "/api/admin/audit") {
        return { body: admin.auditLog(user, { action: q.get("action") || "", actor: q.get("actor") || "", targetType: q.get("targetType") || "",
          targetId: q.get("targetId") || "", beforeId: q.get("before") }) };
      }
      if (method === "GET" && p === "/api/admin/challenges") return { body: { challenges: challenges.adminList(user) } };
      if (method === "GET" && p === "/api/admin/challenges/leg-options") return { body: { markets: await challenges.legOptions(user) } };
      if (method === "POST" && p === "/api/admin/challenges") return { body: challenges.create(user, body) };
      if (method === "GET" && (m = p.match(/^\/api\/admin\/challenges\/(\d+)\/settle-preview$/))) return { body: challenges.settlePreview(user, m[1]) };
      if (method === "POST" && (m = p.match(/^\/api\/admin\/challenges\/(\d+)$/))) {
        const a = body.action;
        const out = a === "update" ? challenges.update(user, m[1], body.challenge || {}) : a === "publish" ? challenges.publish(user, m[1])
          : a === "extend" ? challenges.extend(user, m[1], body.entryDeadline) : a === "cancel" ? challenges.cancel(user, m[1], body.note) : a === "settle" ? challenges.settle(user, m[1]) : null;
        if (!out) throw new HttpError(400, "Unknown action.");
        return { body: out };
      }
      if (method === "GET" && p === "/api/admin/rewards") return { body: rewards.adminCatalog(user) };
      if (method === "POST" && p === "/api/admin/rewards") return { body: rewards.createReward(user, body) };
      if (method === "POST" && (m = p.match(/^\/api\/admin\/rewards\/(\d+)$/))) return { body: rewards.updateReward(user, m[1], body) };
      if (method === "GET" && p === "/api/admin/redemptions") return { body: { redemptions: rewards.requests(user, { status: q.get("status") || "" }) } };
      if (method === "POST" && (m = p.match(/^\/api\/admin\/redemptions\/(\d+)$/))) return { body: rewards.act(user, m[1], body) };
      throw new HttpError(404, "Not found.");
    }

    if (!/^\/api\/predictions(\/|$)/.test(p)) throw new HttpError(404, "Not found.");
    const path = p.replace(/^\/api\/predictions/, "") || "/";
    if (method === "GET" && path === "/config") {
      const l = await league.get();
      return { body: { mode: league.mode, label: league.label || "", league: { ok: l.ok, error: l.error, fetchedAt: l.fetchedAt },
        startBalance: config.startBalance, minLeaderboard: config.minLeaderboard, user } };
    }
    if (method === "GET" && path === "/markets") {
      return { body: await service.listMarkets({ userId: user && user.id, kind: q.get("kind") || "", status: q.get("status") || "", q: q.get("q") || "", sort: q.get("sort") || "closing" }) };
    }
    if (method === "GET" && (m = path.match(/^\/markets\/(\d+)$/))) return { body: await service.getMarket(m[1], user && user.id) };
    if (method === "POST" && (m = path.match(/^\/markets\/(\d+)\/predict$/))) {
      const out = service.predict(user, m[1], String(body.selection || ""));
      return { body: { ...out, ...(await service.getMarket(m[1], user.id)) } };
    }
    if (method === "GET" && path === "/me") return { body: await service.dashboard(user) };
    if (method === "GET" && path === "/leaderboard") return { body: service.leaderboard() };

    // Admin only (service checks too)
    if (!path.startsWith("/admin/")) throw new HttpError(404, "Not found.");
    if (!user) throw new HttpError(401, "Sign in first.");
    if (method === "GET" && path === "/admin/games") return { body: await service.games(user) };
    if (method === "GET" && path === "/admin/audit") return { body: { audit: service.auditLog(user, { marketId: q.get("market") }) } };
    if (method === "POST" && path === "/admin/markets") return { body: await service.createMarket(user, body) };
    if (method === "POST" && path === "/admin/demo-result") return { body: await service.postDemoResult(user, body) };
    if (method === "GET" && (m = path.match(/^\/admin\/markets\/(\d+)\/preview$/))) return { body: await service.preview(user, m[1]) };
    if (method === "POST" && (m = path.match(/^\/admin\/markets\/(\d+)$/))) {
      const id = m[1], a = body.action;
      const out = a === "edit" ? service.editMarket(user, id, body.changes || {})
        : a === "resolve" ? await service.resolve(user, id, body)
        : a === "void" ? service.voidMarket(user, id, body.note)
        : service.setState(user, id, a, body.note);
      return { body: out };
    }
    throw new HttpError(404, "Not found.");
  };
}
