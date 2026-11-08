// Admin -> Stats Adder (Pictures): reads the in-game stat boards (Passing / Rushing / Receiving / Defense) from
// screenshots with Tesseract.js, right in the browser (no server, no cost). Loaded only when that tab is used.
//
// How a board is read:
//  1. The picture is turned black-on-white: only near-white pixels (the names and numbers) stay, so the blurred
//     field, the gray boxes and the teal name tags floating over the field drop out.
//  2. One pass finds every word and where it is: the title (Passing / Receiving ...) says which board it is, the
//     names on the left are the player rows, and the columns are where the numbers' ink lines up across the rows
//     (so a screenshot scrolled past the column headers still reads).
//  3. Every number is read by matching each digit against the game's own number font (GLYPHS). A digit that isn't
//     clearly one shape leaves its cell empty, never guessed, and the admin page won't save until it's filled in
//     or the screenshot is retaken.
(function () {
  const TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

  // Each board: the header labels left to right and the stat each column is
  const BOARDS = {
    passing: { title: "Passing", cols: [["RTG", "rtg"], ["CMP", "comp"], ["ATT", "att"], ["YDS", "yds"], ["CMP%", "cmpPct"], ["TD", "td"], ["INT", "int"], ["AVG", "avg"], ["LNG", "lng"]] },
    rushing: { title: "Rushing", cols: [["ATT", "att"], ["YDS", "yds"], ["YPC", "ypc"], ["TD", "td"], ["FUM", "fum"], ["20+", "plus20"], ["LNG", "lng"]] },
    receiving: { title: "Receiving", cols: [["T", "tgt"], ["REC", "rec"], ["YDS", "yds"], ["TD", "td"], ["DROP", "drop"], ["LNG", "lng"]] },
    defense: { title: "Defense", cols: [["TKL", "tak"], ["TFL", "tfl"], ["SCK", "sck"], ["INT", "int"], ["PBU", "pbu"], ["PRE", "pre"], ["SFTY", "saf"], ["YDA", "yda"], ["TDA", "tda"]] }
  };
  // Header words only one board has
  const MARKS = { passing: ["RTG", "CMP%", "AVG"], rushing: ["YPC", "FUM", "20+"], receiving: ["REC", "DROP"], defense: ["TKL", "TFL", "SCK", "PBU", "SFTY", "YDA", "TDA"] };
  const ALL_LABELS = new Set(Object.values(BOARDS).flatMap((b) => b.cols.map(([h]) => h)));

  let libLoading = null, worker = null;
  function loadLib() {
    if (window.Tesseract) return Promise.resolve();
    return (libLoading = libLoading || new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = TESSERACT;
      s.onload = ok;
      s.onerror = () => { libLoading = null; fail(new Error("Couldn't load the text reader. Check your internet and try again.")); };
      document.head.appendChild(s);
    }));
  }
  async function getWorker() {
    await loadLib();
    if (!worker) worker = await window.Tesseract.createWorker("eng");
    return worker;
  }
  const mode = (w, psm, whitelist = "") => w.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: whitelist });

  const loadImage = (src) => new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error("That file isn't a picture the browser can open."));
    img.src = src;
  });

  // Black text on white, scaled up so small letters read well
  function clean(img) {
    const scale = Math.min(3, Math.max(1, 2400 / img.naturalWidth));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const px = ctx.getImageData(0, 0, c.width, c.height);
    const d = px.data;
    c.tag = new Uint8Array(c.width * c.height); // where a teal player name tag floats over the board
    for (let i = 0; i < d.length; i += 4) {
      const lo = Math.min(d[i], d[i + 1], d[i + 2]), hi = Math.max(d[i], d[i + 1], d[i + 2]);
      const ink = lo > 175 && hi - lo < 55; // near-white, not teal
      if (d[i + 2] > 185 && d[i + 1] > 185 && d[i] < 140) c.tag[i / 4] = 1;
      d[i] = d[i + 1] = d[i + 2] = ink ? 0 : 255;
      d[i + 3] = 255;
    }
    ctx.putImageData(px, 0, 0);
    return c;
  }

  // A piece of the page on a white margin (Tesseract reads a lone number better with room around it)
  const crop = (src, x, y, w, h, scale = 1) => {
    x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
    w = Math.max(1, Math.min(src.width - x, Math.round(w))); h = Math.max(1, Math.min(src.height - y, Math.round(h)));
    const pad = Math.round(h * 0.4 * scale);
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale) + pad * 2;
    c.height = Math.round(h * scale) + pad * 2;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, x, y, w, h, pad, pad, Math.round(w * scale), Math.round(h * scale));
    return c;
  };
  // Is there any ink in this piece of the page? (an empty spot vs. a number the reader couldn't make out)
  const inked = (src, x, y, w, h) => {
    const d = src.getContext("2d").getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) n++;
    return n > 6;
  };
  // Does a name tag cover part of this spot?
  const tagged = (src, x, y, w, h) => {
    let n = 0;
    for (let yy = Math.max(0, Math.round(y)); yy < Math.min(src.height, Math.round(y + h)); yy++)
      for (let xx = Math.max(0, Math.round(x)); xx < Math.min(src.width, Math.round(x + w)); xx++) n += src.tag[yy * src.width + xx];
    return n > 4;
  };

  // Every word with its box, from Tesseract's blocks
  function wordsOf(data) {
    const out = [];
    (data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => (l.words || []).forEach((w) => {
      if (w.text && w.text.trim()) out.push({ text: w.text.trim(), conf: w.confidence, ...w.bbox });
    }))));
    return out;
  }
  const cy = (w) => (w.y0 + w.y1) / 2;
  const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9%+]/g, "");
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

  // Words into lines by height on the page
  function lines(words) {
    const out = [];
    [...words].sort((a, b) => cy(a) - cy(b)).forEach((w) => {
      const line = out.find((l) => Math.abs((l.y0 + l.y1) / 2 - cy(w)) < Math.max(w.y1 - w.y0, l.y1 - l.y0) * 0.55);
      if (line) { line.words.push(w); line.y0 = Math.min(line.y0, w.y0); line.y1 = Math.max(line.y1, w.y1); }
      else out.push({ words: [w], y0: w.y0, y1: w.y1 });
    });
    out.forEach((l) => l.words.sort((a, b) => a.x0 - b.x0));
    return out;
  }

  // ---- Digits: the game draws every number in the same font, so each digit is matched against that font's shapes
  // (GLYPHS, made from real stat boards).
  const GW = 8, GH = 12;
  // Ink blobs in a cell, left to right (8-connected), each scaled to a GW x GH grid of ink amounts
  function glyphs(src, x, y, w, h) {
    x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
    w = Math.max(1, Math.min(src.width - x, Math.round(w))); h = Math.max(1, Math.min(src.height - y, Math.round(h)));
    const d = src.getContext("2d").getImageData(x, y, w, h).data;
    const ink = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) ink[i] = d[i * 4] < 128 ? 1 : 0;
    const seen = new Uint8Array(w * h), blobs = [];
    for (let s = 0; s < w * h; s++) {
      if (!ink[s] || seen[s]) continue;
      const stack = [s], px = [];
      seen[s] = 1;
      while (stack.length) {
        const p = stack.pop(), px0 = p % w, py0 = (p - px0) / w;
        px.push(p);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = px0 + dx, ny = py0 + dy, q = ny * w + nx;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && ink[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
      }
      if (px.length < 4) continue; // specks
      let x0 = w, x1 = 0, y0 = h, y1 = 0;
      px.forEach((p) => { const a = p % w, b = (p - a) / w; x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); });
      blobs.push({ x0, x1, y0, y1, px });
    }
    blobs.sort((a, b) => a.x0 - b.x0);
    return blobs.map((b) => {
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1, grid = new Array(GW * GH).fill(0), cnt = new Array(GW * GH).fill(0);
      const set = new Set(b.px);
      for (let yy = b.y0; yy <= b.y1; yy++) for (let xx = b.x0; xx <= b.x1; xx++) {
        const gi = Math.min(GH - 1, Math.floor(((yy - b.y0) / bh) * GH)) * GW + Math.min(GW - 1, Math.floor(((xx - b.x0) / bw) * GW));
        cnt[gi]++;
        if (set.has(yy * w + xx)) grid[gi]++;
      }
      return { x0: x + b.x0, x1: x + b.x1, y0: y + b.y0, y1: y + b.y1, aspect: bw / bh, h: bh, grid: grid.map((g, i) => (cnt[i] ? g / cnt[i] : 0)) };
    });
  }
  // Each digit's average shape (aspect = width / height; grid = ink amount per cell, row by row), from game W5-1
  const GLYPHS = {
    "0": { aspect: 0.594, grid: [0.06,0.75,0.95,0.91,0.91,0.93,0.53,0.01,0.78,0.87,0.12,0.02,0.03,0.27,0.96,0.34,0.98,0.35,0.01,0.01,0.01,0.04,0.84,0.78,1,0.29,0.01,0.01,0.01,0.02,0.78,0.96,1,0.28,0.01,0.01,0.01,0.02,0.77,0.98,1,0.28,0.01,0.01,0.01,0.02,0.77,0.98,1,0.28,0.01,0.01,0.01,0.02,0.78,0.99,0.99,0.28,0.01,0.01,0.01,0.02,0.77,0.99,0.99,0.29,0.01,0.01,0.01,0.02,0.79,0.95,0.94,0.45,0.01,0.01,0.01,0.06,0.9,0.66,0.62,0.95,0.4,0.22,0.23,0.5,0.95,0.2,0,0.65,0.94,0.99,0.99,0.91,0.39,0] },
    "1": { aspect: 0.283, grid: [0.05,0.23,0.45,0.71,0.96,0.96,0.88,0.14,0.7,0.93,0.83,0.66,0.97,0.96,0.96,0.18,0.03,0.04,0.01,0.03,0.46,0.96,0.98,0.18,0.02,0.02,0,0.02,0.35,0.96,0.98,0.18,0.02,0.02,0,0.02,0.35,0.96,0.98,0.18,0.02,0.02,0,0.02,0.35,0.96,0.96,0.18,0.02,0.02,0,0.02,0.35,0.95,0.96,0.18,0.02,0.02,0,0.02,0.36,0.96,0.96,0.18,0.02,0.02,0,0.02,0.37,0.96,0.96,0.18,0.01,0.02,0,0.02,0.38,0.96,0.96,0.18,0,0.01,0,0.02,0.36,0.96,0.94,0.18,0,0,0,0.01,0.18,0.8,0.84,0.11] },
    "2": { aspect: 0.546, grid: [0.17,0.81,0.88,0.82,0.84,0.91,0.48,0.05,0.88,0.65,0.07,0.03,0.06,0.34,0.98,0.63,0.9,0.18,0,0,0,0.03,0.8,0.93,0.23,0.01,0,0,0,0.03,0.83,0.9,0,0,0,0,0,0.47,0.99,0.47,0,0,0,0,0.5,0.98,0.42,0,0,0,0.24,0.7,0.8,0.29,0.02,0,0,0.45,0.94,0.52,0.06,0.02,0.02,0,0.37,0.95,0.33,0,0,0.02,0.02,0,0.9,0.54,0,0,0,0.02,0.02,0,0.95,0.71,0.32,0.27,0.27,0.28,0.24,0.02,0.79,0.97,0.98,0.98,0.98,1,0.99,0.59] },
    "3": { aspect: 0.561, grid: [0.11,0.73,0.85,0.85,0.86,0.87,0.47,0.06,0.78,0.77,0.06,0.04,0.04,0.18,0.96,0.69,0.93,0.31,0,0,0,0,0.72,0.92,0.23,0.01,0,0,0,0,0.7,0.98,0,0,0,0,0,0.01,0.82,0.81,0,0,0,0.2,0.54,0.78,0.85,0.23,0,0,0,0.17,0.47,0.8,0.92,0.29,0,0,0,0,0,0.02,0.84,0.81,0.38,0.07,0,0,0,0,0.69,0.96,0.93,0.38,0,0,0,0.01,0.77,0.88,0.72,0.87,0.24,0.06,0.11,0.38,0.96,0.63,0.04,0.74,0.98,1,0.99,0.94,0.38,0] },
    "4": { aspect: 0.671, grid: [0,0,0,0.08,0.75,0.98,0.42,0,0,0,0,0.6,1,1,0.5,0,0,0,0.09,0.85,0.66,0.75,0.5,0,0,0,0.68,0.56,0.06,0.59,0.5,0,0,0.1,0.93,0.15,0,0.59,0.5,0,0,0.71,0.51,0,0,0.59,0.5,0,0.14,0.93,0.09,0,0,0.59,0.5,0,0.6,0.44,0,0,0,0.59,0.5,0,0.97,0.46,0.16,0.12,0.38,0.85,0.79,0.09,0.86,0.91,0.91,0.91,0.97,1,1,0.75,0.02,0.03,0.03,0.03,0.22,0.96,0.66,0.03,0,0,0,0,0,0.57,0.47,0] },
    "5": { aspect: 0.54, grid: [0.86,0.97,0.89,0.88,0.88,0.88,0.83,0.49,0.97,0.53,0.03,0,0,0,0,0,0.97,0.27,0,0,0,0,0,0,0.97,0.3,0,0,0,0,0,0,0.97,0.89,0.66,0.66,0.69,0.64,0.25,0,0.95,0.89,0.34,0.31,0.34,0.56,0.95,0.5,0.08,0.11,0,0,0,0,0.72,1,0,0,0,0,0,0,0.59,1,0.33,0.02,0,0,0,0,0.59,1,0.97,0.41,0,0,0,0,0.7,0.97,0.56,0.94,0.33,0.16,0.2,0.36,0.95,0.69,0,0.63,0.88,0.97,0.98,0.88,0.45,0] },
    "6": { aspect: 0.579, grid: [0.11,0.76,0.9,0.9,0.9,0.9,0.54,0.04,0.77,0.75,0.18,0.11,0.11,0.11,0.04,0,0.98,0.36,0,0,0,0,0,0,1,0.29,0,0,0,0,0,0,1,0.88,0.7,0.68,0.68,0.59,0.04,0,1,0.8,0.5,0.5,0.54,0.84,0.86,0.07,1,0.33,0,0,0,0.12,0.93,0.56,1,0.25,0,0,0,0,0.79,0.93,1,0.25,0,0,0,0,0.79,1,1,0.39,0,0,0,0.04,0.84,0.75,0.73,0.88,0.2,0.18,0.18,0.48,0.96,0.25,0.02,0.79,1,1,1,0.95,0.3,0] },
    "7": { aspect: 0.531, grid: [0.79,0.92,0.92,0.92,0.94,0.99,1,0.79,0.02,0.08,0.08,0.08,0.13,0.42,1,0.79,0,0,0,0,0,0.6,0.99,0.46,0,0,0,0,0.1,0.98,0.66,0.02,0,0,0,0,0.4,1,0.34,0,0,0,0,0,0.82,0.9,0.1,0,0,0,0,0.31,0.95,0.31,0,0,0,0,0.01,0.79,0.82,0,0,0,0,0,0.27,0.98,0.48,0,0,0,0,0.01,0.9,0.91,0.11,0,0,0,0,0.13,0.99,0.51,0,0,0,0,0,0.49,0.96,0.13,0,0,0,0] },
    "8": { aspect: 0.603, grid: [0.12,0.76,0.94,0.89,0.89,0.91,0.55,0.05,0.75,0.84,0.09,0.03,0.03,0.34,0.96,0.54,0.97,0.35,0,0,0,0,0.78,1,0.99,0.29,0,0,0,0,0.71,1,0.82,0.68,0,0,0,0.1,0.91,0.68,0.23,0.99,0.76,0.6,0.64,0.82,0.84,0.13,0.41,0.98,0.58,0.45,0.46,0.7,0.86,0.18,0.84,0.53,0,0,0,0.1,0.89,0.74,0.97,0.26,0,0,0,0,0.7,1,0.89,0.47,0,0,0,0.05,0.86,0.94,0.6,0.93,0.42,0.28,0.31,0.6,0.97,0.35,0.03,0.65,0.95,0.97,0.99,0.93,0.41,0] },
    "9": { aspect: 0.58, grid: [0.1,0.72,0.92,0.87,0.88,0.85,0.39,0,0.77,0.83,0.13,0.12,0.12,0.35,0.98,0.5,0.96,0.33,0,0,0,0.02,0.92,0.85,1,0.37,0,0,0,0,0.85,0.88,0.93,0.55,0,0,0,0.02,0.85,0.92,0.37,0.96,0.71,0.65,0.65,0.71,0.98,1,0.02,0.34,0.56,0.56,0.56,0.66,1,1,0,0,0,0,0,0.04,0.94,0.92,0,0,0,0,0,0,0.85,0.88,0,0,0,0,0,0.08,0.92,0.77,0,0.15,0.23,0.23,0.23,0.62,0.96,0.31,0.17,0.9,1,1,0.98,0.87,0.33,0] }
  };
  // The digit string a cell's blobs spell, or null if any blob isn't clearly one digit
  function matchDigits(blobs) {
    if (!blobs.length) return null;
    const tall = Math.max(...blobs.map((b) => b.h));
    let out = "";
    for (const b of blobs) {
      if (b.h < tall * 0.45) { // short and wide: a minus sign; anything else that short is a stray mark
        if (b.aspect > 1.3 && !out) { out += "-"; continue; }
        return null;
      }
      const score = (g) => {
        let e = 0;
        for (let i = 0; i < g.grid.length; i++) e += (b.grid[i] - g.grid[i]) ** 2;
        return e / g.grid.length + 0.6 * (b.aspect - g.aspect) ** 2;
      };
      // The game's 1 is a plain full-height bar, thin enough that its shape varies more than other digits
      if (b.aspect < 0.36) {
        if (b.h >= tall * 0.9 && score(GLYPHS["1"]) < 0.16) { out += "1"; continue; }
        return null;
      }
      const scored = Object.entries(GLYPHS).map(([digit, g]) => [digit, score(g)]).sort((a, z) => a[1] - z[1]);
      const [best, second] = scored;
      if (best[1] > 0.1 || second[1] - best[1] < 0.005) return null; // not like any digit, or like two
      out += best[0];
    }
    return out;
  }

  // Read one screenshot -> { kind, rows: [{ name, values, missing: [stat], top, bottom }], notes }
  async function readShot(src, onStep) {
    const w = await getWorker();
    const page = clean(await loadImage(src));
    const W = page.width;
    await mode(w, "11"); // sparse text: find every word
    const words = wordsOf((await w.recognize(page, {}, { blocks: true })).data);

    // Which board: the title, otherwise the header labels
    const titleWord = words.find((x) => /^(passing|rushing|receiving|defense)$/i.test(x.text.replace(/[^a-z]/gi, "")));
    let kind = titleWord ? titleWord.text.replace(/[^a-z]/gi, "").toLowerCase() : null;
    if (!kind) {
      const score = Object.entries(MARKS).map(([k, m]) => [k, words.filter((x) => m.includes(norm(x.text))).length]).sort((a, b) => b[1] - a[1])[0];
      if (score[1]) kind = score[0];
    }
    if (!kind) return { kind: null, rows: [], notes: ["Couldn't tell which stat board this is. Include the board's title (Passing, Rushing, Receiving or Defense) in the screenshot."] };
    const board = BOARDS[kind], N = board.cols.length;

    // Player rows: lines with a name on the left (not the title, a team heading or a header row)
    const titleY = titleWord ? titleWord.y1 : 0;
    const isHeaderLine = (l) => l.words.filter((x) => ALL_LABELS.has(norm(x.text))).length >= 2;
    const headerYs = lines(words).filter(isHeaderLine).map((l) => [l.y0, l.y1]);
    const rowLines = lines(words.filter((x) => x.x0 < W * 0.4)).filter((l) => {
      if (cy(l) <= titleY || headerYs.some(([y0, y1]) => cy(l) >= y0 - 3 && cy(l) <= y1 + 3)) return false;
      const text = l.words.map((x) => x.text).join(" ");
      if (/[A-Z]{3,}\s+[A-Z]{3,}/.test(text) && text === text.toUpperCase()) return false; // a team name heading
      return !/^(passing|rushing|receiving|defense)$/i.test(text.replace(/[^a-z]/gi, ""));
    });
    if (!rowLines.length) return { kind, rows: [], notes: [`No player rows found on this ${board.title} screenshot.`] };

    // Columns: where the ink sits across all the rows (each number is centered in its column's box)
    const ctx = page.getContext("2d");
    const colInk = new Float32Array(W);
    rowLines.forEach((l) => {
      const d = ctx.getImageData(0, Math.round(l.y0), W, Math.max(1, Math.round(l.y1 - l.y0))).data;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 128) colInk[(i / 4) % W]++;
    });
    const h0 = median(rowLines.map((l) => l.y1 - l.y0));
    const runs = [];
    for (let x = 0; x < W; x++) {
      if (!colInk[x]) continue;
      const last = runs[runs.length - 1];
      if (last && x - last.x1 <= h0 * 0.9) last.x1 = x; // the digits of one number sit closer than this
      else runs.push({ x0: x, x1: x });
    }
    if (runs.length < N + 1) return { kind, rows: [], notes: [`Couldn't find the ${board.title} columns on this screenshot.`] };
    const xs = runs.slice(-N).map((r) => (r.x0 + r.x1) / 2);
    const gap = median(xs.slice(1).map((x, i) => x - xs[i]));
    const left = xs[0] - gap * 0.5;

    const out = { kind, rows: [], notes: [] };
    for (let i = 0; i < rowLines.length; i++) {
      const l = rowLines[i], h = l.y1 - l.y0;
      if (onStep) onStep(i + 1, rowLines.length);
      const nameWords = l.words.filter((x) => x.x1 < left);
      if (!nameWords.length) continue;
      const nx0 = Math.min(...nameWords.map((x) => x.x0)), nx1 = Math.max(...nameWords.map((x) => x.x1));
      await mode(w, "7");
      const nr = await w.recognize(crop(page, nx0 - h * 0.3, l.y0 - h * 0.35, nx1 - nx0 + h * 0.6, h * 1.7));
      const name = (nr.data.text || "").replace(/\s+/g, "") || nameWords.map((x) => x.text).join("");
      const values = {}, missing = [];
      for (let c = 0; c < N; c++) {
        const f = board.cols[c][1];
        const box = [xs[c] - gap * 0.45, l.y0 - h * 0.3, gap * 0.9, h * 1.6];
        const blobs = inked(page, ...box) ? glyphs(page, ...box) : [];
        // A name tag over the digits themselves: they may be missing strokes, so the cell is left for the admin
        const covered = blobs.length && tagged(page, Math.min(...blobs.map((b) => b.x0)) - 3, Math.min(...blobs.map((b) => b.y0)) - 3,
          Math.max(...blobs.map((b) => b.x1)) - Math.min(...blobs.map((b) => b.x0)) + 6, Math.max(...blobs.map((b) => b.y1)) - Math.min(...blobs.map((b) => b.y0)) + 6);
        const digits = blobs.length && !covered ? matchDigits(blobs) : null;
        // Only yards can go below zero (a sack or a lateral); a minus anywhere else is a stray mark
        if (digits != null && (f === "yds" ? /^-?\d+$/ : /^\d+$/).test(digits)) values[f] = Number(digits);
        else missing.push(f);
      }
      out.rows.push({ name, values, missing, top: l.y0 / page.height, bottom: l.y1 / page.height });
    }
    return out;
  }

  window.UFF_STATSHOTS = { BOARDS, readShot, ready: () => getWorker().then(() => true) };
})();
