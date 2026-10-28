import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { setup, HOUR, T0 } from "./helpers.js";
import { createAuth, usernameProblem, pinProblem, easyPin } from "../auth.js";
import { migrateUp, migrateDown, openDb } from "../db.js";

const status = (fn, code, re) => assert.throws(fn, (e) => e.status === code && (!re || re.test(e.message)));
const signUp = (s, username, pin = "48213", ip = `ip:${username}`) => s.auth.createAccount({ username, pin, confirmPin: pin, ip });

test("usernames: 3-20 letters, numbers or underscores", () => {
  ["abc", "Big_Lester1", "a".repeat(20)].forEach((n) => assert.equal(usernameProblem(n), null, n));
  ["", "ab", "a".repeat(21), "has space", "dash-name", "émile", "<script>"].forEach((n) => assert.ok(usernameProblem(n), n));
});

test("PINs: exactly five digits, as text, leading zeroes kept", () => {
  ["00000", "01234", "48213", "99999"].forEach((p) => assert.equal(pinProblem(p), null, p));
  ["", "1234", "123456", "12a45", " 1234", "12 45", "１２３４５"].forEach((p) => assert.ok(pinProblem(p), JSON.stringify(p)));
  [12345, 731, null, undefined, ["12345"]].forEach((p) => assert.ok(pinProblem(p), String(p))); // a number would drop leading zeroes
  ["11111", "00000", "12345", "01234", "98765", "43210"].forEach((p) => assert.equal(easyPin(p), true, p));
  ["00731", "48213", "13579"].forEach((p) => assert.equal(easyPin(p), false, p));
});

test("create an account: signed in, starting points once, a permanent account id, no PIN stored", () => {
  const s = setup();
  const { token, user } = signUp(s, "newbie", "00731");
  assert.equal(user.username, "newbie");
  assert.equal(user.balance, 1000);
  assert.match(user.accountId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(s.auth.sessionUser(token).username, "newbie");
  const row = s.db.prepare("SELECT * FROM users WHERE username = 'newbie'").get();
  assert.match(row.pass_hash, /^argon2id\$m=19456,t=2,p=1\$/);
  assert.ok(!JSON.stringify(row).includes("00731"));
  // Signing in again doesn't add points
  s.auth.signIn({ username: "newbie", pin: "00731", ip: "x" });
  s.auth.signIn({ username: "NEWBIE", pin: "00731", ip: "x" });
  assert.equal(s.balance(user.id), 1000);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE user_id = ? AND kind = 'grant'").get(user.id).n, 1);
});

test("create an account: bad input, easy PINs, mismatched PINs, taken and reserved names", () => {
  const s = setup();
  status(() => signUp(s, "x"), 400, /3-20/);
  status(() => signUp(s, "okname", "1234"), 400, /5 digits/);
  status(() => s.auth.createAccount({ username: "okname", pin: 48213, confirmPin: 48213, ip: "a" }), 400);
  status(() => signUp(s, "okname", "11111"), 400, /easy/);
  status(() => s.auth.createAccount({ username: "okname", pin: "48213", confirmPin: "48231", ip: "a" }), 400, /don't match/);
  status(() => signUp(s, "Admin"), 409, /isn't available/);
  signUp(s, "taken");
  status(() => signUp(s, "TAKEN", "48213", "other"), 409, /taken/);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM users WHERE username = 'taken'").get().n, 1);
});

test("a second identical sign-up (double click) doesn't make a second account or second points", () => {
  const s = setup();
  signUp(s, "clicker");
  status(() => signUp(s, "clicker"), 409);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM users WHERE username = 'clicker'").get().n, 1);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE kind = 'grant'").get().n, 1);
});

test("sign in: right PIN works, leading zeroes matter, wrong PIN and unknown name get the same answer", () => {
  const s = setup();
  signUp(s, "zeroes", "04213");
  assert.equal(s.auth.signIn({ username: "zeroes", pin: "04213", ip: "a" }).user.username, "zeroes");
  let wrong, unknown;
  try { s.auth.signIn({ username: "zeroes", pin: "42130", ip: "a" }); } catch (e) { wrong = e; }
  try { s.auth.signIn({ username: "nobody_here", pin: "42130", ip: "a" }); } catch (e) { unknown = e; }
  assert.deepEqual([wrong.status, wrong.message], [unknown.status, unknown.message]);
  assert.equal(wrong.status, 401);
  status(() => s.auth.signIn({ username: "zeroes", pin: "4213", ip: "a" }), 400); // "04213" typed as a number
});

test("rate limit: 5 misses lock the username, even the right PIN waits; lock doubles, then clears", () => {
  const s = setup();
  signUp(s, "target", "27183");
  for (let i = 0; i < 5; i++) status(() => s.auth.signIn({ username: "target", pin: "00001", ip: `a${i}` }), 401);
  status(() => s.auth.signIn({ username: "target", pin: "27183", ip: "fresh" }), 429, /1 minute/);
  s.clock.t += 61 * 1000;
  status(() => s.auth.signIn({ username: "target", pin: "00002", ip: "b" }), 401); // 6th miss: 2 minutes
  status(() => s.auth.signIn({ username: "target", pin: "27183", ip: "b" }), 429, /2 minutes/);
  s.clock.t += 121 * 1000;
  assert.equal(s.auth.signIn({ username: "target", pin: "27183", ip: "b" }).user.username, "target");
  // success clears it
  for (let i = 0; i < 4; i++) status(() => s.auth.signIn({ username: "target", pin: "00003", ip: "c" }), 401);
  assert.ok(s.auth.signIn({ username: "target", pin: "27183", ip: "c" }).token);
});

test("rate limit: an unknown username locks the same way (no telling which names exist)", () => {
  const s = setup();
  for (let i = 0; i < 5; i++) status(() => s.auth.signIn({ username: "ghost_user", pin: "11223", ip: `x${i}` }), 401);
  status(() => s.auth.signIn({ username: "ghost_user", pin: "11223", ip: "y" }), 429);
});

test("rate limit: one address trying many usernames gets locked out", () => {
  const s = setup({ config: { limits: { ipMax: 8 } } });
  signUp(s, "victim", "27183");
  for (let i = 0; i < 8; i++) status(() => s.auth.signIn({ username: `name${i}`, pin: "11223", ip: "attacker" }), 401);
  status(() => s.auth.signIn({ username: "victim", pin: "27183", ip: "attacker" }), 429);
  assert.ok(s.auth.signIn({ username: "victim", pin: "27183", ip: "elsewhere" }).token);
  s.clock.t += 16 * 60 * 1000;
  assert.ok(s.auth.signIn({ username: "victim", pin: "27183", ip: "attacker" }).token);
});

test("rate limit: sign-ups per address", () => {
  const s = setup({ config: { limits: { signupMax: 3 } } });
  ["one_", "two_", "three_"].forEach((n) => signUp(s, n, "48213", "same"));
  status(() => signUp(s, "four_", "48213", "same"), 429);
  s.clock.t += HOUR + 1000;
  assert.ok(signUp(s, "four_", "48213", "same").token);
});

test("sessions: survive a reload, end after a week or a day unused, and on sign-out", () => {
  const s = setup();
  const { token } = signUp(s, "sessiony");
  assert.equal(s.auth.sessionUser(token).username, "sessiony"); // a page reload just asks again with the cookie
  s.clock.t += 23 * HOUR;
  assert.ok(s.auth.sessionUser(token));
  s.clock.t += 25 * HOUR; // idle more than a day
  assert.equal(s.auth.sessionUser(token), null);

  const t2 = s.auth.signIn({ username: "sessiony", pin: "48213", ip: "a" }).token;
  for (let d = 0; d < 8; d++) { s.clock.t += 20 * HOUR; assert.ok(s.auth.sessionUser(t2), `hour ${(d + 1) * 20}`); } // used every 20h...
  s.clock.t += 20 * HOUR; // 180h after sign-in
  assert.equal(s.auth.sessionUser(t2), null); // ...still ends a week (168h) after sign-in

  const t3 = s.auth.signIn({ username: "sessiony", pin: "48213", ip: "a" }).token;
  s.auth.logout(t3);
  assert.equal(s.auth.sessionUser(t3), null);
  assert.equal(s.auth.sessionUser("not-a-token"), null);
  assert.equal(s.auth.sessionUser(undefined), null);
});

test("each sign-in gets its own session; signing out one leaves the other", () => {
  const s = setup();
  signUp(s, "twodevices");
  const a = s.auth.signIn({ username: "twodevices", pin: "48213", ip: "a" }).token;
  const b = s.auth.signIn({ username: "twodevices", pin: "48213", ip: "b" }).token;
  assert.notEqual(a, b);
  s.auth.logout(a);
  assert.equal(s.auth.sessionUser(a), null);
  assert.ok(s.auth.sessionUser(b));
});

test("admins use a password, not a PIN; players can't use the admin sign-in", () => {
  const s = setup();
  signUp(s, "player1", "48213");
  assert.ok(s.auth.adminSignIn({ username: "boss", password: "adminpass1234", ip: "a" }).user.isAdmin);
  status(() => s.auth.adminSignIn({ username: "player1", password: "48213", ip: "a" }), 401);
  status(() => s.auth.signIn({ username: "boss", pin: "12345", ip: "a" }), 401);
  status(() => s.auth.createAdmin({ username: "weakadmin", password: "short" }), 400);
});

test("roles and account ids can't be changed, even straight in the database", () => {
  const s = setup();
  const { user } = signUp(s, "climber");
  assert.throws(() => s.db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(user.id), /is_admin never changes/);
  assert.throws(() => s.db.prepare("UPDATE users SET account_id = 'x' WHERE id = ?").run(user.id), /account_id never changes/);
  assert.equal(s.auth.sessionUser(s.auth.signIn({ username: "climber", pin: "48213", ip: "a" }).token).isAdmin, false);
});

test("the pepper is needed: the same database with another pepper can't check any PIN", () => {
  const s = setup();
  signUp(s, "peppered", "48213");
  const other = createAuth({ db: s.db, config: { ...s.cfg, pepper: randomBytes(32) }, now: () => s.clock.t });
  status(() => other.signIn({ username: "peppered", pin: "48213", ip: "a" }), 401);
  assert.throws(() => createAuth({ db: s.db, config: { ...s.cfg, pepper: undefined } }), /pepper/);
});

test("set-pin (the accounts tool): new PIN works, old one doesn't, signed out everywhere, lock cleared", () => {
  const s = setup();
  const { token } = signUp(s, "forgetful", "48213");
  for (let i = 0; i < 5; i++) status(() => s.auth.signIn({ username: "forgetful", pin: "00001", ip: `z${i}` }), 401);
  s.auth.setPin("forgetful", "70815");
  assert.equal(s.auth.sessionUser(token), null);
  status(() => s.auth.signIn({ username: "forgetful", pin: "48213", ip: "q" }), 401);
  assert.ok(s.auth.signIn({ username: "forgetful", pin: "70815", ip: "q" }).token);
  status(() => s.auth.setPin("boss", "70815"), 400);
});

test("profile: only your own account; signed out gets 401", () => {
  const s = setup();
  const me = signUp(s, "profiled").user;
  signUp(s, "someone");
  const p = s.auth.profile(me);
  assert.equal(p.user.username, "profiled");
  assert.deepEqual(p.picks, { total: 0, won: 0, lost: 0, pending: 0 });
  assert.ok(!("pass_hash" in p.user) && !JSON.stringify(p).includes("argon2"));
  status(() => s.auth.profile(null), 401);
});

test("migration 002 goes down and up again, and gives accounts made before it an id", () => {
  const db = openDb(":memory:");
  migrateDown(db);
  db.prepare("INSERT INTO users (username, pass_hash, pass_salt, is_admin, balance, created_at) VALUES ('oldtimer', 'aa', 'bb', 0, 5, 1)").run();
  assert.deepEqual(migrateUp(db), [2]);
  const row = db.prepare("SELECT account_id, credential FROM users WHERE username = 'oldtimer'").get();
  assert.match(row.account_id, /^[0-9a-f-]{36}$/);
  assert.equal(row.credential, "password");
  assert.ok(db instanceof DatabaseSync);
  void T0;
});
