import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { parseLeague } from "../jsliteral.js";
import { readDataJs } from "../league.js";
import { splitStatements } from "../txn.js";

test("the Worker's data.js reader gives exactly what running data.js gives, and refuses anything that isn't plain data", () => {
  const parsed = parseLeague(readFileSync(new URL("../../data.js", import.meta.url), "utf8"));
  assert.ok(isDeepStrictEqual(parsed, JSON.parse(JSON.stringify(readDataJs()))));
  for (const bad of ["const LEAGUE = { a: foo };", "const LEAGUE = { a: 1 + 2 };", "const LEAGUE = { a: () => 1 };", "let X = {};"]) {
    assert.throws(() => parseLeague(bad), undefined, bad);
  }
  assert.deepEqual(parseLeague(`const LEAGUE = { 'a': "x\\"y", b: [1, -2.5, .5,], /* c */ c: { d: null, }, // e
    e: true };`), { a: 'x"y', b: [1, -2.5, 0.5], c: { d: null }, e: true });
});

test("migration SQL splits into single statements without breaking triggers, quotes or comments", () => {
  const parts = splitStatements(`CREATE TABLE a (x TEXT DEFAULT ';'); -- a; comment
    CREATE TRIGGER t BEFORE UPDATE ON a BEGIN SELECT RAISE(ABORT, 'no; never'); END;
    /* block; */ INSERT INTO a VALUES ('it''s;');`);
  assert.deepEqual(parts, ["CREATE TABLE a (x TEXT DEFAULT ';')", "CREATE TRIGGER t BEFORE UPDATE ON a BEGIN SELECT RAISE(ABORT, 'no; never'); END",
    "INSERT INTO a VALUES ('it''s;')"]);
  // every real migration splits into pieces that each end cleanly
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql"))) {
    const pieces = splitStatements(readFileSync(new URL(f, dir), "utf8"));
    assert.ok(pieces.length > 0 && pieces.every((s) => !s.endsWith(";")), f);
  }
});
