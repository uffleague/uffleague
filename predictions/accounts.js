// Test accounts on the local database (this computer only). PINs are read from the keyboard or piped in, never
// from the command line, so they don't end up in shell history.
//   node predictions/accounts.js list            [--demo]
//   node predictions/accounts.js create <name>   [--demo]   then type the 5-digit PIN
//   node predictions/accounts.js set-pin <name>  [--demo]   new PIN (there's no reset by email or text yet)
//   node predictions/accounts.js bootstrap-admin <name>     [--demo]   make an existing site account the FIRST Super Admin
//                                                                       (only while there is none), and set its admin password
//   node predictions/accounts.js set-admin-password <name>  [--demo]   the password staff/admins type to unlock admin tools
//   node predictions/accounts.js revoke-role <name>         [--demo]   back to an ordinary user (recovery; normally done on
//                                                                       UFF Admin -> Admin Permissions)
// --demo = the demo-mode database (npm run predictions:demo); otherwise the live-mode one.
// The admin commands refuse to run with production settings (NODE_ENV=production or PRED_SECURE_COOKIES=1):
// they're for setting up a development copy on this computer, not a live site.
import { createInterface } from "node:readline";
import { openDb } from "./db.js";
import { createAuth } from "./auth.js";
import { CONFIG, dbPath, loadPepper } from "./config.js";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [cmd, name] = args;
const db = openDb(dbPath(process.argv.includes("--demo")));
const auth = createAuth({ db, config: { ...CONFIG, pepper: loadPepper() } });

function readPin(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdin.isTTY ? process.stdout : undefined, terminal: !!process.stdin.isTTY });
    if (process.stdin.isTTY) {
      process.stdout.write(prompt);
      rl._writeToOutput = () => {}; // don't echo the PIN
    }
    // resolve before close(): close() fires the "close" handler right away
    rl.once("line", (line) => { resolve(line.trim()); rl.close(); if (process.stdin.isTTY) process.stdout.write("\n"); });
    rl.once("close", () => resolve(""));
  });
}

try {
  if (cmd === "list") {
    const rows = db.prepare("SELECT username, account_id, credential, role, status, staff_secret, balance, created_at FROM users ORDER BY id").all();
    rows.forEach((r) => console.log([r.username, r.account_id, r.role + (r.role !== "user" ? (r.staff_secret ? " (admin password set)" : " (no admin password)") : ""),
      r.status, r.credential === "pin" ? "PIN" : "old password account (retired)", `${r.balance} pts`, new Date(r.created_at).toISOString().slice(0, 10)].join("  ")));
    if (!rows.length) console.log("No accounts yet.");
  } else if (cmd === "create" && name) {
    const pin = await readPin("5-digit PIN: ");
    const again = process.stdin.isTTY ? await readPin("Same PIN again: ") : pin;
    const { user } = auth.createAccount({ username: name, pin, confirmPin: again, ip: "accounts-tool" });
    console.log(`Made ${user.username} (${user.accountId}) with ${user.balance} virtual points.`);
  } else if (cmd === "set-pin" && name) {
    const user = auth.setPin(name, await readPin("New 5-digit PIN: "));
    console.log(`New PIN set for ${user.username}. They're signed out everywhere.`);
  } else if (["bootstrap-admin", "set-admin-password", "revoke-role"].includes(cmd) && name) {
    if (process.env.NODE_ENV === "production" || process.env.PRED_SECURE_COOKIES === "1") {
      throw new Error("This is for a development copy on this computer. It won't run with production settings.");
    }
    if (cmd === "revoke-role") {
      const user = auth.revokeRoleLocally(name);
      console.log(`${user.username} is an ordinary user again (logged in the audit log).`);
    } else {
      const pw = await readPin("Admin password (12+ characters, not just digits): ");
      const again = process.stdin.isTTY ? await readPin("Same password again: ") : pw;
      if (pw !== again) throw new Error("The two passwords don't match.");
      const user = cmd === "bootstrap-admin" ? auth.bootstrapSuperAdmin(name, pw) : auth.setAdminPassword(name, pw);
      console.log(cmd === "bootstrap-admin"
        ? `${user.username} (${user.accountId}) is now the Super Admin. Sign in on the site with their PIN, open UFF Admin, and unlock it with this admin password.`
        : `Admin password set for ${user.username}.${user.role === "user" ? " (They have no role yet; a Super Admin can give one on Admin Permissions.)" : ""}`);
    }
  } else {
    console.log("Use: node predictions/accounts.js list | create <username> | set-pin <username> | bootstrap-admin <username> | set-admin-password <username> | revoke-role <username>   [--demo]");
    process.exitCode = 1;
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  db.close();
}
