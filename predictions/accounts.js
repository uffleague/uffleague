// Test accounts on the local database (this computer only). PINs are read from the keyboard or piped in, never
// from the command line, so they don't end up in shell history.
//   node predictions/accounts.js list            [--demo]
//   node predictions/accounts.js create <name>   [--demo]   then type the 5-digit PIN
//   node predictions/accounts.js set-pin <name>  [--demo]   new PIN (there's no reset by email or text yet)
// --demo = the demo-mode database (npm run predictions:demo); otherwise the live-mode one.
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
    const rows = db.prepare("SELECT username, account_id, credential, is_admin, balance, created_at FROM users ORDER BY id").all();
    rows.forEach((r) => console.log([r.username, r.account_id, r.is_admin ? "admin" : r.credential === "pin" ? "PIN" : "old password account (set-pin to use)",
      `${r.balance} pts`, new Date(r.created_at).toISOString().slice(0, 10)].join("  ")));
    if (!rows.length) console.log("No accounts yet.");
  } else if (cmd === "create" && name) {
    const pin = await readPin("5-digit PIN: ");
    const again = process.stdin.isTTY ? await readPin("Same PIN again: ") : pin;
    const { user } = auth.createAccount({ username: name, pin, confirmPin: again, ip: "accounts-tool" });
    console.log(`Made ${user.username} (${user.accountId}) with ${user.balance} virtual points.`);
  } else if (cmd === "set-pin" && name) {
    const user = auth.setPin(name, await readPin("New 5-digit PIN: "));
    console.log(`New PIN set for ${user.username}. They're signed out everywhere.`);
  } else {
    console.log("Use: node predictions/accounts.js list | create <username> | set-pin <username>   [--demo]");
    process.exitCode = 1;
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  db.close();
}
