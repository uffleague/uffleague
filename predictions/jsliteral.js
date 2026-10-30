// Reads data.js's `const LEAGUE = { ... };` without running it (Cloudflare Workers can't run fetched code).
// It understands the plain data data.js is written in: objects (keys bare or quoted), arrays, "double" and 'single'
// quoted strings, numbers, true / false / null, comments and trailing commas. Anything else (a function, a variable,
// arithmetic) is an error, so a change to data.js that isn't plain data shows up instead of being misread.
export function parseLeague(source) {
  const start = source.search(/\bconst\s+LEAGUE\s*=\s*\{/);
  if (start < 0) throw new Error("data.js has no `const LEAGUE = {`");
  const p = { s: source, i: source.indexOf("{", start) };
  return value(p);
}

function fail(p, what) {
  const line = p.s.slice(0, p.i).split("\n").length;
  throw new Error(`data.js line ${line}: ${what}`);
}

function skip(p) {
  for (;;) {
    const c = p.s[p.i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { p.i++; continue; }
    if (c === "/" && p.s[p.i + 1] === "/") { while (p.i < p.s.length && p.s[p.i] !== "\n") p.i++; continue; }
    if (c === "/" && p.s[p.i + 1] === "*") { const e = p.s.indexOf("*/", p.i + 2); if (e < 0) fail(p, "unclosed comment"); p.i = e + 2; continue; }
    return;
  }
}

function value(p) {
  skip(p);
  const c = p.s[p.i];
  if (c === "{") return object(p);
  if (c === "[") return array(p);
  if (c === '"' || c === "'") return string(p);
  if (c === "-" || (c >= "0" && c <= "9") || c === ".") return number(p);
  for (const [w, v] of [["true", true], ["false", false], ["null", null]]) {
    if (p.s.startsWith(w, p.i) && !/[\w$]/.test(p.s[p.i + w.length] || "")) { p.i += w.length; return v; }
  }
  fail(p, `can't read ${JSON.stringify(p.s.slice(p.i, p.i + 20))} as plain data`);
}

function object(p) {
  const out = {};
  p.i++; // {
  for (;;) {
    skip(p);
    if (p.s[p.i] === "}") { p.i++; return out; }
    let key;
    if (p.s[p.i] === '"' || p.s[p.i] === "'") key = string(p);
    else {
      const m = /^[A-Za-z_$][\w$]*|^\d+/.exec(p.s.slice(p.i, p.i + 200));
      if (!m) fail(p, "expected a key");
      key = m[0];
      p.i += key.length;
    }
    skip(p);
    if (p.s[p.i] !== ":") fail(p, `expected ":" after ${key}`);
    p.i++;
    out[key] = value(p);
    skip(p);
    if (p.s[p.i] === ",") { p.i++; continue; }
    if (p.s[p.i] === "}") { p.i++; return out; }
    fail(p, `expected "," or "}" after ${key}`);
  }
}

function array(p) {
  const out = [];
  p.i++; // [
  for (;;) {
    skip(p);
    if (p.s[p.i] === "]") { p.i++; return out; }
    out.push(value(p));
    skip(p);
    if (p.s[p.i] === ",") { p.i++; continue; }
    if (p.s[p.i] === "]") { p.i++; return out; }
    fail(p, `expected "," or "]"`);
  }
}

const ESCAPES = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0", "\n": "" };
function string(p) {
  const q = p.s[p.i++];
  let out = "";
  for (;;) {
    const c = p.s[p.i++];
    if (c === undefined || c === "\n") fail(p, "unclosed string");
    if (c === q) return out;
    if (c !== "\\") { out += c; continue; }
    const e = p.s[p.i++];
    if (e === "u") {
      if (p.s[p.i] === "{") { const end = p.s.indexOf("}", p.i); out += String.fromCodePoint(parseInt(p.s.slice(p.i + 1, end), 16)); p.i = end + 1; }
      else { out += String.fromCharCode(parseInt(p.s.slice(p.i, p.i + 4), 16)); p.i += 4; }
    } else if (e === "x") { out += String.fromCharCode(parseInt(p.s.slice(p.i, p.i + 2), 16)); p.i += 2; }
    else out += e in ESCAPES ? ESCAPES[e] : e;
  }
}

function number(p) {
  const m = /^-?(?:0[xX][0-9a-fA-F]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d+)?)/.exec(p.s.slice(p.i, p.i + 40));
  if (!m) fail(p, "bad number");
  p.i += m[0].length;
  return Number(m[0].replace(/_/g, ""));
}
