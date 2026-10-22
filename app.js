(async function () {
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    teams: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.5 14.8c1.7.8 2.7 2.5 3 5.2"/>',
    schedule: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    standings: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    scores: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/><path d="M12 14v3.5M8.5 20.5h7M10 17.5h4"/>',
    stats: '<path d="M4 4v16h16"/><path d="M8.5 16v-4M12.5 16V8M16.5 16v-6"/>',
    compare: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5V14a4 4 0 0 0 4 4h5.5"/><path d="M18 15.5V10a4 4 0 0 0-4-4H8.5"/>',
    awards: '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7"/>',
    playoff: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
    legacy: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/>',
    records: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 7.5h6M9 11h4"/>',
    arrow: '<path d="m9 6 6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    updates: '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1Z"/><path d="M16 9a3.5 3.5 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    predict: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    bowl: '<path d="M4 9h16l-1.5 7.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 9Z"/><path d="M8 9V6.5a4 4 0 0 1 8 0V9"/><path d="M9 21h6"/>',
    play: '<circle cx="12" cy="12" r="8.5"/><path d="m10 8.5 5.5 3.5-5.5 3.5Z"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="15" r="1.2"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
    live: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>'
  };
  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  const NAV = [
    { path: "", label: "Home", icon: "home", top: true },
    { path: "teams", label: "Teams", icon: "teams", top: true },
    { path: "schedule", label: "Schedule", icon: "schedule", top: true },
    { path: "standings", label: "Standings", icon: "standings", top: true },
    { path: "scores", label: "Scores", icon: "scores", top: true },
    { path: "vods", label: "VODs", icon: "play" },
    { path: "stats", label: "Stats", icon: "stats", top: true },
    { path: "updates", label: "Updates", icon: "updates" },
    { path: "compare", label: "Compare", icon: "compare" },
    { path: "awards", label: "Awards", icon: "awards" },
    { path: "allflag", label: "All-Flag", icon: "star" },
    { path: "playoff", label: "Playoff", icon: "playoff", top: true },
    { path: "predictions", label: "Predictions", icon: "predict" },
    { path: "bowls", label: "Past Bowls", icon: "bowl" },
    { path: "build", label: "Build a Team", icon: "dice" },
    { path: "legacy", label: "Legacy", icon: "legacy" },
    { path: "records", label: "Records", icon: "records" }
  ];

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // All-time stat sheets (stats-alltime-*.js) -> LEAGUE.stats.allTime; every sheet's rows add together.
  // A sheet's `rename` applies only to that sheet (one account name can be different people in different seasons),
  // `teams` is its own team abbreviation list, and `recalcFpts` re-scores it with the All-Time FPTS formulas.
  if (typeof ALL_TIME_SHEETS !== "undefined") {
    const allTime = (LEAGUE.stats.allTime = {});
    ALL_TIME_SHEETS.forEach((sheet) =>
      Object.entries(sheet.tables).forEach(([cat, { cols, rows }]) =>
        rows.forEach((r) => {
          const row = {};
          const teams = sheet.teams || ALL_TIME_TEAMS;
          cols.forEach((c, i) => {
            if (c !== "abbr") row[c] = r[i];
            else if (r[i]) row.team = teams[r[i]] || r[i];
          });
          const renamed = Object.keys(sheet.rename || {}).find((n) => n.toLowerCase() === row.player.toLowerCase());
          if (renamed) row.player = sheet.rename[renamed];
          // Some old sheet rows have TGT and REC swapped (more catches than targets can't happen)
          if (typeof row.rec === "number" && typeof row.tgt === "number" && row.rec > row.tgt) [row.tgt, row.rec] = [row.rec, row.tgt];
          const conf = LEAGUE.stats.categories.find((c) => c.key === cat);
          const weights = sheet.recalcFpts && conf && conf.allTime && conf.allTime.fpts;
          if (weights) row.fpts = Object.entries(weights).reduce((sum, [k, w]) => sum + (row[k] || 0) * w, 0);
          (allTime[cat] = allTime[cat] || []).push(row);
        })
      )
    );
  }

  // Game results, transactions and position changes entered on the Admin page live on the server
  // (worker/src/index.js, a Cloudflare Worker) and are mixed into data.js when the page loads.
  const API = "https://uff-admin.uffleague.workers.dev";
  const updateKey = (u) => [u.date, u.time, u.type, u.player, u.team].join("|").toLowerCase();
  let SAVED = { results: [], updates: [], positions: {}, streams: [], playoffs: null, bowls: {}, teams: {}, statEdits: {}, vods: [], allFlag: {}, schedule: [] };
  try {
    const res = await fetch(API, { cache: "no-store" });
    if (res.ok) SAVED = { ...SAVED, ...(await res.json()) };
  } catch (e) {}
  (function mergeSaved() {
    // Position changes replace whatever data.js lists for that player
    const posMap = (LEAGUE.stats.positions = LEAGUE.stats.positions || {});
    Object.entries(SAVED.positions).forEach(([name, list]) => {
      Object.keys(posMap).filter((n) => n.toLowerCase() === name.toLowerCase()).forEach((n) => delete posMap[n]);
      posMap[name] = list;
    });

    // Things sent straight from the Discord bot name teams by name or code, sometimes with :emoji: or @
    const teamLookup = new Map();
    LEAGUE.conferences.forEach((c) => c.divisions.forEach((d) => d.teams.forEach((t) => {
      teamLookup.set(t.name.toLowerCase(), t.name);
      if (t.code) teamLookup.set(t.code.toLowerCase(), t.name);
    })));
    // A nickname the bot has differently ("Baltimore Bluebirds") still matches by its city when only one team has it
    const city = (n) => n.toLowerCase().split(/\s+/).slice(0, -1).join(" ");
    const botTeam = (name) => {
      const team = String(name).replace(/:[^:\s]+:/g, "").replace(/@/g, "").replace(/\s+/g, " ").trim();
      if (teamLookup.has(team.toLowerCase())) return teamLookup.get(team.toLowerCase());
      const sameCity = city(team) ? [...new Set(teamLookup.values())].filter((n) => city(n) === city(team)) : [];
      return sameCity.length === 1 ? sameCity[0] : team;
    };

    // The schedule the bot posts replaces the weeks with the same number in data.js
    if ((SAVED.schedule || []).length) {
      const sent = new Set(SAVED.schedule.map((w) => w.week));
      LEAGUE.schedule = [
        ...LEAGUE.schedule.filter((w) => !sent.has(w.week)),
        ...SAVED.schedule.map((w) => ({ ...w, games: w.games.map((g) => ({ ...g, teams: g.teams.map(botTeam) })) }))
      ].sort((a, b) => a.week - b.week);
    }

    const games = LEAGUE.schedule.flatMap((w) => w.games);
    SAVED.results.forEach((r) => {
      const g = games.find((x) => x.id === r.id);
      if (g) Object.assign(g, { score: r.score, date: r.date, potg: r.potg, box: r.box });
    });

    // Transactions sent straight from the Discord bot use Discord names: match players to their site names
    // (nicknames in data.js) and teams by name or code, like the paste box does
    SAVED.updates.forEach((u) => {
      if (u.source !== "bot") {
        // Names merged after a transaction was saved still match up (aliases in data.js)
        u.player = rawAlias(/<@/.test(u.player) ? mentionName(String(u.player)) : u.player);
        if (/\(@[^)]*$/.test(u.by || "")) u.by = mentionName(String(u.by));
        return;
      }
      u.player = rawAlias(mentionName(String(u.player)));
      if (u.by) u.by = rawAlias(mentionName(String(u.by)));
      u.team = botTeam(u.team);
    });

    const have = new Set((LEAGUE.updates = LEAGUE.updates || []).map(updateKey));
    SAVED.updates.forEach((u) => {
      if (!have.has(updateKey(u))) { LEAGUE.updates.push(u); have.add(updateKey(u)); }
    });

    // Team edits from Admin -> Teams. Each team remembers its original name as `key` (that's what edits are saved under).
    const allDivs = () => LEAGUE.conferences.flatMap((c) => c.divisions.map((d) => ({ c, d })));
    allDivs().forEach(({ d }) => d.teams.forEach((t) => { t.key = t.name; }));
    const renames = {};
    Object.entries(SAVED.teams || {}).forEach(([key, e]) => {
      let spot = allDivs().find(({ d }) => d.teams.some((t) => t.key === key));
      let t = spot && spot.d.teams.find((x) => x.key === key);
      if (!t) {
        if (!key.startsWith("+")) return; // edit for a team that's no longer in data.js
        t = { key, w: 0, l: 0, pf: 0, pa: 0, streak: "-" };
      } else if (e.name && e.name !== t.name) renames[t.name] = e.name;
      ["name", "code", "coach", "logo", "color", "color2"].forEach((f) => { if (e[f]) t[f] = e[f]; });
      // Move it if its conference or division changed (or place a new team)
      const target = allDivs().find(({ c, d }) => c.name === e.conference && d.name === e.division);
      if (target && (!spot || target.d !== spot.d)) {
        if (spot) spot.d.teams.splice(spot.d.teams.indexOf(t), 1);
        target.d.teams.push(t);
      }
    });
    // A renamed team keeps its transactions, games and playoff spots
    const rn = (n) => renames[n] || n;
    LEAGUE.updates.forEach((u) => { u.team = rn(u.team); });
    LEAGUE.schedule.forEach((wk) => wk.games.forEach((g) => { g.teams = g.teams.map(rn); }));
    [SAVED.playoffs, LEAGUE.playoffs].forEach((po) => po && po.rounds && po.rounds.forEach((r) => r.games.forEach((g) => { g.a = rn(g.a); g.b = rn(g.b); })));
  })();

  // Add final scores from the schedule onto each team's record (on top of the numbers in data.js)
  (function applyResults() {
    const byName = {};
    LEAGUE.conferences.forEach((c) => c.divisions.forEach((d) => d.teams.forEach((t) => (byName[t.name] = t))));
    const results = {};
    LEAGUE.schedule.forEach((wk) =>
      wk.games.forEach((g) => {
        if (!Array.isArray(g.score)) return;
        const [a, b] = g.teams.map((n) => byName[n]);
        [[a, g.score[0], g.score[1]], [b, g.score[1], g.score[0]]].forEach(([t, mine, theirs]) => {
          if (!t) return;
          t.pf += mine;
          t.pa += theirs;
          if (mine === theirs) return;
          const r = mine > theirs ? "W" : "L";
          r === "W" ? t.w++ : t.l++;
          (results[t.name] = results[t.name] || []).push(r);
        });
      })
    );
    Object.entries(results).forEach(([name, rs]) => {
      const last = rs[rs.length - 1];
      let n = 0;
      for (let i = rs.length - 1; i >= 0 && rs[i] === last; i--) n++;
      byName[name].streak = `${last}${n}`;
    });
  })();

  // Flatten teams with their conference/division attached
  const TEAMS = [];
  LEAGUE.conferences.forEach((conf) =>
    conf.divisions.forEach((div) =>
      div.teams.forEach((t) =>
        TEAMS.push({ ...t, slug: slug(t.name), conference: conf.name, division: div.name })
      )
    )
  );
  // Signings / demands / releases, oldest first, so rosters can be built in order
  const UPDATE_TYPES = {
    sign: { label: "Signing", verb: "signed with" },
    demand: { label: "Demand", verb: "demanded from" },
    release: { label: "Release", verb: "was released by" },
    promotion: { label: "Promotion", verb: "was promoted" }
  };
  const byTime = (a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`) || a.i - b.i;
  const UPDATES = (LEAGUE.updates || [])
    .map((u, i) => ({ ...u, i, t: TEAMS.find((x) => x.name === u.team) }))
    .sort(byTime);
  // What the Updates page and home panels list: transactions plus a "Disbanded" row per disbanded team
  const FEED = UPDATES.concat(TEAMS.filter((t) => t.disbanded).map((t) =>
    ({ ...t.disbanded, type: "disband", team: t.name, t, i: Infinity }))).sort(byTime);
  const disbandedTag = (t) => (t && t.disbanded ? ` <span class="pill pill-disbanded">Disbanded</span>` : "");

  const ROSTERS = {};
  UPDATES.forEach((u) => {
    if (!u.t) return;
    const key = u.player.toLowerCase();
    if (u.type === "sign") {
      Object.values(ROSTERS).forEach((r) => r.delete(key));
      (ROSTERS[u.t.slug] = ROSTERS[u.t.slug] || new Map()).set(key, u.player);
    } else if ((u.type === "demand" || u.type === "release") && ROSTERS[u.t.slug]) {
      ROSTERS[u.t.slug].delete(key);
    } else if (u.type === "promotion") {
      // Joining another team's staff (owner, coach...) takes them off their old team's roster
      Object.entries(ROSTERS).forEach(([s, r]) => { if (s !== u.t.slug) r.delete(key); });
    }
  });
  // A disbanded team's players are free agents
  TEAMS.filter((t) => t.disbanded).forEach((t) => delete ROSTERS[t.slug]);

  const confCount = LEAGUE.conferences.length;
  const divCount = LEAGUE.conferences.reduce((n, c) => n + c.divisions.length, 0);

  const pct = (t) => {
    const g = t.w + t.l;
    return g ? (t.w / g).toFixed(3).replace(/^0/, "") : ".000";
  };
  const diff = (t) => {
    const d = t.pf - t.pa;
    return d > 0 ? `+${d}` : `${d}`;
  };

  const teamLogo = (t, size = "") =>
    t.logo
      ? `<img class="team-logo custom ${size}" src="${t.logo}${LEAGUE.logoVersion ? `?v=${LEAGUE.logoVersion}` : ""}" alt="${t.name} logo">`
      : `<img class="team-logo ${size}" src="logo.png" alt="">`;

  const pageHead = (title, sub) => `
    <div class="page-head">
      <h1>${title}</h1>
      ${sub ? `<p class="muted">${sub}</p>` : ""}
    </div>`;

  const empty = (title, text) => `
    <div class="empty">
      <img src="${LEAGUE.brandLogo}" alt="">
      <h3>${title}</h3>
      <p>${text}</p>
    </div>`;

  /* ---------- Pages ---------- */

  /* ---------- Home ---------- */

  const HOME = LEAGUE.home || {};
  const gfxSrc = (src) => `${src}${LEAGUE.logoVersion ? `?v=${LEAGUE.logoVersion}` : ""}`;
  const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const teamByName = (name) => TEAMS.find((t) => t.name === name);
  const logoOr = (t, size = "") => (t ? teamLogo(t, size) : `<img class="team-logo ${size}" src="${LEAGUE.brandLogo}" alt="">`);

  // Banner slides: graphics from data.js (home.slides), otherwise the built-in league and bowl slides
  let heroAt = 0;
  function heroSlides() {
    const list = (HOME.slides || []).filter((s) => s.image || s.title);
    if (list.length) return list;
    const bowl = (LEAGUE.bowlLogos || {})[LEAGUE.season];
    return [{ kind: "brand" }, ...(bowl ? [{ kind: "bowl", logo: bowl }] : []), { kind: "awards" }];
  }

  function heroSlide(s, i) {
    const on = i === heroAt ? "on" : "";
    if (s.kind === "brand") return `
      <div class="hx-slide hx-slide--brand ${on}">
        <div class="hx-slide-text">
          <span class="hx-kicker">Season ${LEAGUE.season} &middot; ${LEAGUE.year}</span>
          <h1 class="hx-title">United Flag<br>Football</h1>
          <p class="hx-sub">The premier Roblox flag football league. ${TEAMS.length} teams. ${confCount} conferences. One champion.</p>
          <div class="hx-actions">
            <a class="btn hx-btn" href="#/standings">View Standings ${icon("arrow", "sm")}</a>
            <a class="btn hx-btn-ghost" href="#/stats">Stat Leaders</a>
          </div>
        </div>
        <img class="hx-slide-art hx-slide-art--round" src="${LEAGUE.brandLogo}" alt="">
      </div>`;
    if (s.kind === "bowl") return `
      <div class="hx-slide hx-slide--bowl ${on}">
        <div class="hx-slide-text">
          <span class="hx-kicker">Road to the Bowl</span>
          <h1 class="hx-title">United Flag<br>Bowl ${roman(LEAGUE.season)}</h1>
          <p class="hx-sub">Season ${LEAGUE.season} ends with one game for the title. Who's lifting the trophy?</p>
          <div class="hx-actions">
            <a class="btn hx-btn" href="#/playoff">Playoff Bracket ${icon("arrow", "sm")}</a>
            <a class="btn hx-btn-ghost" href="#/predictions">Make Predictions</a>
          </div>
        </div>
        <img class="hx-slide-art" src="${gfxSrc(s.logo)}" alt="United Flag Bowl ${roman(LEAGUE.season)} logo">
      </div>`;
    // Award race: the current leader for the three big awards (from Award Candidates)
    if (s.kind === "awards") {
      const race = awardCandidates().filter((c) => ["MVP", "OPOTY", "DPOTY"].includes(c.code));
      return `
      <div class="hx-slide hx-slide--awards ${on}">
        <div class="hx-slide-text">
          <span class="hx-kicker">Season ${LEAGUE.season} Award Race</span>
          <h1 class="hx-title">Award<br>Candidates</h1>
          <p class="hx-sub">Who's leading the MVP, OPOTY and DPOTY races? Updated after every game by fantasy points.</p>
          <div class="hx-actions">
            <a class="btn hx-btn" href="#/awards">See Candidates ${icon("arrow", "sm")}</a>
            <a class="btn hx-btn-ghost" href="#/awards/${LEAGUE.season - 1}">Past Winners</a>
          </div>
        </div>
        <div class="hx-race">
          ${race.map((c) => {
            const p = c.top[0];
            const t = p && currentTeam(p.player);
            return `
              <a class="hx-race-card" href="#/awards">
                <span class="hx-race-code">${c.code}</span>
                ${p ? logoOr(t, "md") : `<span class="hx-race-icon">${icon("awards")}</span>`}
                <span class="hx-race-who">
                  <span class="hx-race-name">${p ? esc(p.player) : "Up for grabs"}</span>
                  <span class="hx-race-sub">${p ? `${t ? esc(t.name) : "Free agent"} &middot; ${fmtPts(p.pts)} pts` : "Race starts Week 1"}</span>
                </span>
              </a>`;
          }).join("")}
        </div>
      </div>`;
    }
    // A graphic. Text on top is optional (leave it out when it's already in the picture).
    const hasText = s.kicker || s.title || s.sub;
    const tag = s.link ? "a" : "div";
    return `
      <${tag} class="hx-slide hx-slide--gfx ${hasText ? "has-text" : ""} ${on}" ${s.link ? `href="${esc(s.link)}"` : ""}>
        <img class="hx-slide-bg" src="${esc(gfxSrc(s.image))}" alt="${esc(s.title || "")}" ${i ? `loading="lazy"` : ""}>
        ${hasText ? `
          <div class="hx-slide-text">
            ${s.kicker ? `<span class="hx-kicker">${esc(s.kicker)}</span>` : ""}
            ${s.title ? `<h1 class="hx-title">${esc(s.title)}</h1>` : ""}
            ${s.sub ? `<p class="hx-sub">${esc(s.sub)}</p>` : ""}
            ${s.link && s.button ? `<div class="hx-actions"><span class="btn hx-btn">${esc(s.button)} ${icon("arrow", "sm")}</span></div>` : ""}
          </div>` : ""}
      </${tag}>`;
  }

  function heroSection() {
    const slides = heroSlides();
    heroAt %= slides.length;
    heroMoved = Date.now();
    const many = slides.length > 1;
    return `
      <section class="hx-hero" aria-roledescription="carousel">
        ${slides.map(heroSlide).join("")}
        ${many ? `
          <button type="button" class="hx-arrow hx-arrow--prev" data-hero="prev" aria-label="Previous">${icon("arrow")}</button>
          <button type="button" class="hx-arrow hx-arrow--next" data-hero="next" aria-label="Next">${icon("arrow")}</button>
          <div class="hx-dots">${slides.map((_, i) => `<button type="button" class="hx-dot ${i === heroAt ? "on" : ""}" data-hero="${i}" aria-label="Slide ${i + 1}"></button>`).join("")}</div>` : ""}
      </section>`;
  }

  let heroMoved = 0;
  function heroGo(n) {
    const hero = document.querySelector(".hx-hero");
    if (!hero) return;
    heroMoved = Date.now();
    const slides = hero.querySelectorAll(".hx-slide");
    heroAt = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle("on", i === heroAt));
    hero.querySelectorAll(".hx-dot").forEach((d, i) => d.classList.toggle("on", i === heroAt));
  }
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(() => {
      const hero = document.querySelector(".hx-hero");
      // A full 7 seconds on each slide, counted from the last change (arrows and dots too)
      if (hero && !document.hidden && Date.now() - heroMoved > 6900 && !hero.matches(":hover, :focus-within")) heroGo(heroAt + 1);
    }, 1000);
  }

  const panelHead = (title, link, linkText, extra = "") => `
    <div class="hx-head">
      <h2>${title}</h2>${extra}
      ${link ? `<a class="hx-more" href="${link}">${linkText} ${icon("arrow", "sm")}</a>` : ""}
    </div>`;

  // Power rankings: the order in data.js (home.powerRankings) if there is one, otherwise by record
  function powerRankingOrder() {
    const find = (n) => TEAMS.find((t) => [t.name, t.code].some((x) => x && x.toLowerCase() === String(n).toLowerCase()));
    const manual = [...new Set((HOME.powerRankings || []).map(find).filter(Boolean))];
    const byRecord = [...TEAMS].sort((a, b) =>
      (b.w - b.l) - (a.w - a.l) || b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa) || a.name.localeCompare(b.name));
    return { list: [...manual, ...byRecord.filter((t) => !manual.includes(t))], ranked: manual.length || TEAMS.some((t) => t.w + t.l) };
  }
  let rankAll = false;
  function powerRankingsPanel() {
    const { list, ranked } = powerRankingOrder();
    const hex = (c, fallback) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : fallback);
    // Hover fills the row with the team color, fading into the secondary color; light secondaries get dark text on that side
    const rowStyle = (t) => {
      const c2 = hex(t.color2, hex(t.color, "#2f3f96"));
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c2.slice(i, i + 2), 16));
      const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
      return `--team:${hex(t.color, "#2f3f96")};--team2:${c2};--team2-ink:${light ? "#0b1020" : "#fff"};--team2-shadow:${light ? "none" : "0 1px 3px rgba(0, 0, 0, .7)"}`;
    };
    return `
      <div class="hx-panel hx-rank-panel">
        ${panelHead("Power Rankings", "#/standings", "Standings")}
        <div class="hx-rows ${rankAll ? "all" : ""}" id="rankRows">
          ${list.map((t, i) => `
            <a class="hx-row ${i >= 10 ? "hx-row--more" : ""}" href="#/teams/${t.slug}" style="${rowStyle(t)}">
              <span class="hx-rank">${ranked ? i + 1 : "&ndash;"}</span>
              ${teamLogo(t)}
              <span class="hx-row-name">${t.name}${disbandedTag(t)}</span>
              <span class="hx-rec">${t.w}-${t.l}</span>
            </a>`).join("")}
        </div>
        ${list.length > 10 ? `<button type="button" class="hx-rank-more" data-rank-all aria-expanded="${rankAll}">${rankAll ? "Show top 10" : `Show all ${list.length}`}</button>` : ""}
      </div>`;
  }

  // Latest News: the first story in data.js (home.news), otherwise the newest signing in that team's colors
  function newsPanel() {
    const n = (HOME.news || [])[0];
    if (n) {
      const tag = n.link ? "a" : "div";
      return `
        <${tag} class="hx-panel hx-news" ${n.link ? `href="${esc(n.link)}"` : ""}>
          ${n.image ? `<img class="hx-news-bg" src="${esc(gfxSrc(n.image))}" alt="">` : ""}
          <span class="hx-label">Latest News${n.date ? ` &middot; ${shortDate(n.date)}` : ""}</span>
          <div class="hx-news-body">
            <h2 class="hx-news-title">${esc(n.title)}</h2>
            ${n.sub ? `<p class="hx-news-sub">${esc(n.sub)}</p>` : ""}
            ${n.link ? `<span class="btn hx-btn">${esc(n.button || "Read More")}</span>` : ""}
          </div>
        </${tag}>`;
    }
    const u = FEED[FEED.length - 1];
    if (!u) return `<div class="hx-panel hx-news hx-news--empty"><span class="hx-label">Latest News</span><div class="hx-news-body"><h2 class="hx-news-title">Season ${LEAGUE.season} is coming</h2></div></div>`;
    const t = u.t;
    const tint = t ? teamTint(t.name) : { style: "" };
    const what = u.type === "disband" ? "Team disbanded"
      : u.type === "promotion" ? `Promoted to ${esc(u.role || "staff")} of the ${esc(u.team)}`
      : `${{ sign: "Signs with", demand: "Demands out of", release: "Released by" }[u.type] || ""} the ${esc(u.team)}`;
    return `
      <a class="hx-panel hx-news hx-news--move" href="#/updates" style="${tint.style}">
        ${t ? `<img class="hx-news-logo" src="${gfxSrc(t.logo || "logo.png")}" alt="">` : ""}
        <span class="hx-label">Latest Move &middot; ${shortDate(u.date)}</span>
        <div class="hx-news-body">
          <h2 class="hx-news-title">${esc(u.type === "disband" ? u.team : u.player)}</h2>
          <p class="hx-news-sub">${what}</p>
          <span class="btn hx-btn">All Updates</span>
        </div>
      </a>`;
  }

  // Stat leaders: this season's box scores, or the All-Time sheets until the first game is played
  const HOME_LEADERS = [
    { label: "Passing", group: "passing", f: "yds", unit: "YDS", cats: ["QB"] },
    { label: "Receiving", group: "receiving", f: "yds", unit: "YDS", cats: ["WR", "TE"] },
    { label: "Rushing", group: "rushing", f: "yds", unit: "YDS", cats: ["RB"] },
    { label: "Defense", group: "defense", f: "tak", unit: "TAK", cats: ["Tackles"] }
  ];
  let leadTab = 0;
  let leadScope = "alltime"; // All-Time first; the switch in the panel shows this season
  function leadersPanel() {
    const season = leadScope === "season";
    const tabs = HOME_LEADERS.map((l) => {
      let rows;
      if (season) rows = Object.values(BOX_TOTALS[l.group]);
      else {
        const sum = new Map();
        l.cats.forEach((c) => statRowsFor(allTimeCat(c), "alltime").forEach((r) => {
          const key = r.player.toLowerCase();
          const cur = sum.get(key) || { player: r.player, [l.f]: 0 };
          cur[l.f] += r[l.f] || 0;
          sum.set(key, cur);
        }));
        rows = [...sum.values()];
      }
      return rows.filter((r) => r[l.f] > 0).sort((a, b) => b[l.f] - a[l.f] || a.player.localeCompare(b.player)).slice(0, 7);
    });
    return `
      <div class="hx-panel">
        ${panelHead("Stat Leaders", `#/stats/${leadScope}`, "View All")}
        <div class="hx-scope" role="group" aria-label="Stat leaders season">
          ${[["alltime", "All-Time"], ["season", `Season ${LEAGUE.season}`]].map(([k, label]) =>
            `<button type="button" class="${k === leadScope ? "on" : ""}" data-lead-scope="${k}" aria-pressed="${k === leadScope}">${label}</button>`).join("")}
        </div>
        <div class="hx-tabs" role="tablist">
          ${HOME_LEADERS.map((l, i) => `<button type="button" class="hx-tab ${i === leadTab ? "on" : ""}" data-lead-tab="${i}" role="tab">${l.label}</button>`).join("")}
        </div>
        ${tabs.map((rows, i) => `
          <div class="hx-lead-pane" data-lead-pane="${i}" ${i === leadTab ? "" : "hidden"}>
            ${rows.length ? rows.map((r, n) => {
              const t = currentTeam(r.player);
              return `
                <div class="hx-lead">
                  <span class="hx-lead-rank ${n ? "" : "top"}">${n + 1}</span>
                  <span class="hx-lead-logo">${logoOr(t, "md")}</span>
                  <span class="hx-lead-who">${playerLink(r.player, "hx-lead-name")}<span class="hx-lead-team">${t ? t.name : "Free agent"}</span></span>
                  <span class="hx-lead-val">${Math.round(r[HOME_LEADERS[i].f]).toLocaleString()}<small>${HOME_LEADERS[i].unit}</small></span>
                </div>`;
            }).join("") : `<p class="hx-empty">No ${season ? `Season ${LEAGUE.season} ` : ""}${HOME_LEADERS[i].label.toLowerCase()} stats yet.</p>`}
          </div>`).join("")}
      </div>`;
  }

  // Compact team label: the code ("KCJ"), or the nickname for a team outside the league ("Nightmares")
  const shortName = (name) => { const t = teamByName(name); return t ? t.code || teamShort(name) : String(name).split(" ").pop(); };

  const gameSide = (name, score, won) => {
    const t = teamByName(name);
    return `<span class="hx-game-team ${won === false ? "lost" : ""}">${logoOr(t)}<span>${esc(shortName(name))}</span>${score != null ? `<b>${score}</b>` : ""}</span>`;
  };

  // Next games on the schedule, or the latest finals once nothing is left to play
  function gamesPanel() {
    const upcoming = allGames().filter(({ g }) => !Array.isArray(g.score)).slice(0, 5);
    if (upcoming.length || !finalWeeks().length) return `
      <div class="hx-panel">
        ${panelHead("Upcoming Games", "#/schedule", "Schedule")}
        ${upcoming.length ? upcoming.map(({ g, wk }) => `
          <a class="hx-game" href="#/schedule/${wk.week}">
            ${gameSide(g.teams[0])}<span class="hx-game-vs">vs</span>${gameSide(g.teams[1])}
            <span class="hx-game-time">${esc(g.time || `Week ${wk.week}`)}</span>
          </a>`).join("") : `<p class="hx-empty">The Season ${LEAGUE.season} schedule will be posted soon.</p>`}
      </div>`;
    const finals = finalWeeks().flatMap((w) => w.games.map((g) => ({ g, wk: w }))).slice(0, 5);
    return `
      <div class="hx-panel">
        ${panelHead("Latest Scores", "#/scores", "All Scores")}
        ${finals.map(({ g, wk }) => `
          <a class="hx-game" href="#/scores">
            ${gameSide(g.teams[0], g.score[0], g.score[0] >= g.score[1])}<span class="hx-game-vs">&ndash;</span>${gameSide(g.teams[1], g.score[1], g.score[1] >= g.score[0])}
            <span class="hx-game-time">Final &middot; W${wk.week}</span>
          </a>`).join("")}
      </div>`;
  }

  // Final scores strip under the banner (only once games have been played)
  function scoreTicker() {
    const finals = finalWeeks().flatMap((w) => w.games.map((g) => ({ g, wk: w }))).slice(0, 12);
    if (!finals.length) return "";
    return `
      <div class="hx-ticker">
        ${finals.map(({ g, wk }) => `
          <a class="hx-tick" href="#/scores">
            <span class="hx-tick-head">Final &middot; Week ${wk.week}</span>
            ${[0, 1].map((i) => `<span class="hx-tick-team ${g.score[i] < g.score[1 - i] ? "lost" : ""}">${logoOr(teamByName(g.teams[i]))}<span>${esc(shortName(g.teams[i]))}</span><b>${g.score[i]}</b></span>`).join("")}
          </a>`).join("")}
      </div>`;
  }

  function mediaPanel() {
    // VODs listed in home.hideMedia (by link) stay on the VODs page but not here
    const hidden = (HOME.hideMedia || []).map((u) => String(u).toLowerCase());
    const list = (SAVED.vods || []).filter((v) => !hidden.some((h) => h && String(v.url).toLowerCase().includes(h))).slice(0, 3);
    return `
      <div class="hx-panel">
        ${panelHead("Featured Media", "#/vods", "View All")}
        ${list.length ? `<div class="hx-media-grid">${list.map((v) => {
          const yt = ytId(v.url);
          return `
            <a class="hx-media" href="${esc(v.url)}" target="_blank" rel="noopener">
              <span class="hx-media-thumb">${yt ? `<img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy">` : ""}<span class="hx-media-play">&#9654;</span></span>
              <span class="hx-media-title">${esc(v.title)}</span>
              <span class="hx-media-date">${v.at ? shortDate(new Date(v.at).toLocaleDateString("en-CA")) : esc(v.note || "")}</span>
            </a>`;
        }).join("")}</div>` : `<p class="hx-empty">Game replays and highlights will show up here.</p>`}
      </div>`;
  }

  const SOCIAL_ICONS = {
    discord: '<path d="M8 7.5a14 14 0 0 1 8 0M7 16.5c3 1.4 7 1.4 10 0"/><path d="M8.5 6 7 4.5C5 5 3.8 5.8 3.5 6.5 2.3 9.3 2 12.4 2.5 16c1.4 1.5 3 2.4 4.5 2.8L8 17M15.5 6 17 4.5c2 .5 3.2 1.3 3.5 2 1.2 2.8 1.5 5.9 1 9.5-1.4 1.5-3 2.4-4.5 2.8L16 17"/><circle cx="9" cy="12.5" r="1.2"/><circle cx="15" cy="12.5" r="1.2"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.2 5 2.8-5 2.8Z"/>',
    x: '<path d="M4 4l16 16M20 4 4 20"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2 4.2 5 4.5"/>'
  };

  // Newest signings, demands, releases and promotions
  function movesPanel() {
    const list = FEED.slice(-6).reverse();
    const social = Object.entries(HOME.social || {}).filter(([k, url]) => url && SOCIAL_ICONS[k]);
    const links = social.length ? `<span class="hx-social">${social.map(([k, url]) =>
      `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${k}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${SOCIAL_ICONS[k]}</svg></a>`).join("")}</span>` : "";
    return `
      <div class="hx-panel">
        ${panelHead("Latest Moves", social.length ? "" : "#/updates", "Updates", links)}
        ${list.length ? list.map((u) => {
          const type = UPDATE_TYPES[u.type] || { verb: "" };
          const what = u.type === "promotion" ? `promoted to ${esc(u.role || "staff")}` : type.verb;
          const team = u.t ? `<a href="#/teams/${u.t.slug}">${esc(u.t.code || u.team)}</a>` : esc(u.team);
          return `
            <div class="hx-move">
              ${logoOr(u.t)}
              <span class="hx-move-text">${u.type === "disband" ? `<span class="hx-move-name">${team}</span> disbanded` : `${playerLink(u.player, "hx-move-name")} ${what} ${team}`}</span>
              <span class="hx-move-date">${shortDate(u.date)}</span>
            </div>`;
        }).join("") : `<p class="hx-empty">Signings will show up here as they happen.</p>`}
      </div>`;
  }

  function home() {
    const cands = awardCandidates().some((c) => c.top.length);
    return `
      <div class="home">
        ${heroSection()}
        ${liveSection()}
        <div class="wrap">
          ${scoreTicker()}
          <div class="hx-grid hx-grid--top">
            <div class="hx-area-rank">${powerRankingsPanel()}</div>
            <div class="hx-area-news">${newsPanel()}</div>
            <div class="hx-area-lead">${leadersPanel()}</div>
          </div>
          <div class="hx-grid hx-grid--bottom">
            <div class="hx-area-games">${gamesPanel()}</div>
            <div class="hx-area-media">${mediaPanel()}</div>
            <div class="hx-area-moves">${movesPanel()}</div>
          </div>
          ${cands ? candidatesSection() : ""}
        </div>
      </div>`;
  }

  function teams() {
    return `
      <div class="wrap">
        ${pageHead("Teams", `${TEAMS.length} teams across ${confCount} conferences and ${divCount} divisions.`)}
        ${LEAGUE.conferences.map((c) => `
          <section class="conf-block">
            <h2 class="conf-title">${c.name}</h2>
            ${c.divisions.map((d) => `
              <h3 class="div-title">${d.name}</h3>
              <div class="team-grid">
                ${d.teams.map((t) => `
                  <a class="card team-card" href="#/teams/${slug(t.name)}">
                    ${teamLogo(t, "lg")}
                    <div>
                      <div class="team-name">${t.name}${disbandedTag(t)}</div>
                      <div class="muted small">${t.w}-${t.l}${(() => {
                        const r = ROSTERS[slug(t.name)];
                        return r && r.size ? ` &middot; ${r.size} player${r.size === 1 ? "" : "s"}` : "";
                      })()}</div>
                      ${t.coach && !t.disbanded ? `<div class="muted small">HC ${t.coach}</div>` : ""}
                    </div>
                  </a>`).join("")}
              </div>`).join("")}
          </section>`).join("")}
      </div>`;
  }

  /* ---------- Players ---------- */

  // Old names (aliases in data.js) show and link as the name the player goes by now
  const playerLink = (name, cls = "") => {
    const n = aliasName(name);
    return `<a class="plink ${cls}" href="#/players/${encodeURIComponent(n)}">${n}</a>`;
  };

  // Every final game a player has a box score line in
  function playerGames(name) {
    const key = name.toLowerCase();
    const out = [];
    [...LEAGUE.schedule].sort((a, b) => a.week - b.week).forEach((wk) =>
      wk.games.forEach((g) => {
        if (!Array.isArray(g.score) || !g.box) return;
        g.box.forEach((side, i) => {
          if (!side) return;
          const lines = {};
          Object.keys(BOX).forEach((k) => {
            const l = (side[k] || []).find((r) => r.player.toLowerCase() === key);
            if (l) lines[k] = l;
          });
          if (Object.keys(lines).length) out.push({ g, wk, i, lines });
        });
      })
    );
    return out;
  }

  // Team a player is on: their roster from Updates, otherwise the team from their latest box score,
  // otherwise the team they're head coach of, otherwise their latest staff promotion
  function currentTeam(name) {
    const key = name.toLowerCase();
    const slugOn = Object.keys(ROSTERS).find((s) => ROSTERS[s].has(key));
    if (slugOn) return TEAMS.find((t) => t.slug === slugOn);
    const games = playerGames(name);
    const last = games[games.length - 1];
    const played = last && TEAMS.find((t) => t.name === last.g.teams[last.i]);
    const staff = UPDATES.filter((u) => u.type === "promotion" && u.t && aliasName(u.player).toLowerCase() === key).pop();
    return played || TEAMS.find((t) => !t.disbanded && t.coach && t.coach.toLowerCase() === key) || (staff && !staff.t.disbanded && staff.t) || null;
  }

  const POS_ORDER = ["QB", "WR", "TE", "DE", "DB", "LB"];
  function positionsFor(name) {
    const set = new Set();
    const map = LEAGUE.stats.positions || {};
    const found = Object.keys(map).find((n) => n.toLowerCase() === name.toLowerCase());
    [].concat(found ? map[found] : []).forEach((p) => set.add(p.toUpperCase()));
    playerGames(name).forEach(({ lines }) => {
      if (lines.passing) set.add("QB");
      if (lines.rushing) set.add("DE");
      if (lines.receiving) set.add(positionOf(name, "receiving"));
      if (lines.defense) set.add(positionOf(name, "defense"));
    });
    return POS_ORDER.filter((p) => set.has(p));
  }

  function teamSchedule(t) {
    return [...LEAGUE.schedule]
      .sort((a, b) => a.week - b.week)
      .flatMap((wk) => wk.games.filter((g) => g.teams.includes(t.name)).map((g) => ({ g, wk })));
  }

  function team(s) {
    const t = TEAMS.find((x) => x.slug === s);
    if (!t) return notFound();

    // Roster: signings from Updates, plus anyone whose latest box score was for this team
    const roster = new Map(ROSTERS[t.slug] || []);
    Object.values(BOX_TOTALS).forEach((group) =>
      Object.values(group).forEach((r) => {
        const key = r.player.toLowerCase();
        if (!roster.has(key) && r.team === t.name && currentTeam(r.player) === t) roster.set(key, r.player);
      })
    );

    // Staff from promotions on the Updates page (latest role per person)
    const staffBy = new Map();
    UPDATES.filter((u) => u.type === "promotion" && u.t && u.t.slug === t.slug && u.role)
      .forEach((u) => staffBy.set(aliasName(u.player).toLowerCase(), u));
    // Someone whose latest move is to another team (or off this one) isn't on this staff anymore
    const lastMove = new Map(UPDATES.filter((u) => u.t).map((u) => [aliasName(u.player).toLowerCase(), u]));
    const staff = [...staffBy.entries()]
      .filter(([key]) => { const m = lastMove.get(key); return m && m.t.slug === t.slug && m.type !== "demand" && m.type !== "release"; })
      .map(([, u]) => u);

    const games = teamSchedule(t);
    const short =`${t.conference.replace(/ Conference$/, "")} ${t.division.replace(/ Division$/, "")}`;
    return `
      <div class="wrap">
        <a href="#/teams" class="link back">&larr; All Teams</a>
        <div class="team-head">
          ${teamLogo(t, "xl")}
          <div>
            <h1>${t.name}${disbandedTag(t)}</h1>
            ${t.disbanded
              ? `<p class="muted">${short} &middot; Disbanded ${fmtDate(t.disbanded.date)}. Their players are now free agents.</p>`
              : `<p class="muted">${short}${t.coach ? ` &middot; Head Coach ${playerLink(t.coach, "link-strong")}` : ""}</p>
            ${staff.length ? `<p class="muted">${staff.map((u) => `${u.role} ${playerLink(u.player, "link-strong")}`).join(" &middot; ")}</p>` : ""}`}
            <div class="stat-chips">
              <div class="card stat-chip"><span class="eyebrow">Record</span><span class="num">${t.w}-${t.l}</span></div>
              <div class="card stat-chip"><span class="eyebrow">Win %</span><span class="num">${pct(t)}</span></div>
              <div class="card stat-chip"><span class="eyebrow">PF / PA</span><span class="num">${t.pf} / ${t.pa}</span></div>
            </div>
          </div>
        </div>
        <div class="team-cols">
          <section>
            <div class="section-head"><h2>Roster</h2><span class="muted small">${roster.size} player${roster.size === 1 ? "" : "s"}</span></div>
            ${roster.size
              ? `<div class="card list-card">${[...roster.values()].map((p) => `
                  <div class="list-row">${playerLink(p)}<span class="muted small">${positionsFor(p).join(", ")}</span></div>`).join("")}
                </div>`
              : t.disbanded ? empty("Team disbanded", "Everyone on this roster is a free agent now.")
              : empty("Roster coming soon", "Players show up here once they sign.")}
          </section>
          <section>
            <div class="section-head"><h2>Schedule</h2><span class="muted small">${games.length} game${games.length === 1 ? "" : "s"}</span></div>
            ${games.length
              ? `<div class="card list-card">${games.map(({ g, wk }) => {
                  const i = g.teams.indexOf(t.name);
                  const opp = g.teams[1 - i];
                  const oppT = TEAMS.find((x) => x.name === opp);
                  const final = Array.isArray(g.score);
                  const res = final ? (g.score[i] > g.score[1 - i] ? "W" : g.score[i] < g.score[1 - i] ? "L" : "T") : "";
                  return `
                    <div class="list-row sched-row">
                      <span class="sched-res sched-res--${res || "none"}">${res || "&ndash;"}</span>
                      <span class="sched-wk">W${wk.week}</span>
                      <span class="sched-opp">${i === 0 ? "vs" : "@"} ${oppT ? `<a class="plink" href="#/teams/${oppT.slug}">${opp}</a>` : opp}</span>
                      <span class="sched-score">${final ? `${g.score[i]}-${g.score[1 - i]}` : `<span class="muted small">${g.time || "Not played"}</span>`}</span>
                    </div>`;
                }).join("")}</div>`
              : empty("No games scheduled", "This team's games will show up here.")}
          </section>
        </div>
      </div>`;
  }

  const PLAYER_CARDS = [
    ["passing", "Passing", [["GP", "gp"], ["CMP", "comp"], ["ATT", "att"], ["YDS", "yds"], ["TD", "td"], ["INT", "int"]]],
    ["rushing", "Rushing", [["ATT", "att"], ["YDS", "yds"], ["TD", "td"], ["FUM", "fum"], ["PRE", "pre"]]],
    ["receiving", "Receiving", [["TGT", "tgt"], ["REC", "rec"], ["YDS", "yds"], ["TD", "td"], ["DROP", "drop"]]],
    ["defense", "Defense", [["TAK", "tak"], ["TFL", "tfl"], ["SCK", "sck"], ["SAF", "saf"], ["INT", "int"], ["PBU", "pbu"], ["SWAT", "swat"], ["TD", "td"]]]
  ];

  // Where a player ranks in each All-Time stat tab (same order as the Stats page), best ranks first
  // Where a player ranks in each stat tab ("alltime" or this "season"), best ranks first
  const rankOrder = {};
  function statRanks(name, scope) {
    if (!rankOrder[scope]) {
      rankOrder[scope] = LEAGUE.stats.categories.map((c) => {
        const cat = scope === "alltime" ? allTimeCat(c.key) : c;
        const rows = statRowsFor(cat, scope)
          .filter((r) => scope === "alltime" || (r[cat.sort] || 0) > 0) // this season: only players with that stat
          .sort((a, b) => (b[cat.sort] || 0) - (a[cat.sort] || 0) || a.player.localeCompare(b.player));
        return { key: c.key, of: rows.length, rank: new Map(rows.map((r, i) => [r.player.toLowerCase(), i + 1])) };
      });
    }
    const key = aliasName(name).toLowerCase();
    return rankOrder[scope].filter((c) => c.rank.has(key)).map((c) => ({ key: c.key, rank: c.rank.get(key), of: c.of }))
      .sort((a, b) => a.rank - b.rank);
  }
  const allTimeRanks = (name) => statRanks(name, "alltime");

  // Awards a player won, straight from the Awards page history: { code: [seasons...] }
  const AWARD_TO_LEGACY = { EOTY: "EXEOTY" }; // same award, different code in the legacy list
  function awardWins(name) {
    const key = aliasName(name).toLowerCase();
    const wins = {};
    Object.entries(LEAGUE.awardWinners || {}).forEach(([season, list]) =>
      Object.entries(list).forEach(([code, v]) => {
        const names = Array.isArray(v) ? v : typeof v === "string" ? [v] : v && v.player ? [v.player] : [];
        names.forEach((n) => {
          if (n === "N/A" || aliasName(n).toLowerCase() !== key) return;
          const c = AWARD_TO_LEGACY[code] || code;
          (wins[c] = wins[c] || []).push(Number(season));
        });
      })
    );
    return wins;
  }

  // Legacy-list honors and Awards-page wins together; when both count an award, the higher count is used
  function playerHonors(name, leg) {
    const wins = { ...awardWins(name), ...allFlagSeasons(name) };
    const byCode = new Map((leg ? leg.honors.filter((h) => h.scored) : []).map((h) => [h.code, { code: h.code, n: h.n }]));
    Object.entries(wins).forEach(([code, seasons]) => {
      const cur = byCode.get(code) || { code, n: 0 };
      byCode.set(code, { code, n: Math.max(cur.n, seasons.length), seasons });
    });
    const order = [...LEAGUE.legacy.points.flatMap((g) => g.codes), ...LEAGUE.awards.map((a) => a.code)];
    const rank = (c) => (order.includes(c) ? order.indexOf(c) : order.length);
    return [...byCode.values()].sort((a, b) => rank(a.code) - rank(b.code));
  }

  function player(enc) {
    const raw = aliasName(decodeURIComponent(enc));
    const key = raw.toLowerCase();
    const games = playerGames(raw);
    const legacyAll = computeLegacy();
    const leg = legacyAll.find((p) => p.name.toLowerCase() === key);
    const rosterName = Object.values(ROSTERS).map((r) => r.get(key)).find(Boolean);
    const name = rosterName || (leg && leg.name) || (games[0] && Object.values(games[0].lines)[0].player) || raw;
    const t = currentTeam(name);
    const pos = positionsFor(name);

    const totals = {};
    games.forEach(({ lines }) => Object.entries(lines).forEach(([k, l]) => addLine((totals[k] = totals[k] || {}), l)));
    totals.passing = { ...(totals.passing || {}), gp: games.length };
    // Hand-edited stats (Admin -> Player Stats) win over the box scores
    const edit = statEditFor(name);
    if (edit) {
      Object.keys(BOX).forEach((k) => { if (edit[k]) totals[k] = { ...edit[k] }; });
      totals.passing = { ...(totals.passing || {}), gp: edit.gp != null ? edit.gp : games.length };
    }

    const honors = playerHonors(name, leg);
    const honorCount = honors.reduce((n, h) => n + h.n, 0) + (leg && leg.hof ? 1 : 0);

    return `
      <div class="wrap">
        <a href="javascript:history.back()" class="link back">&larr; Back</a>
        <div class="team-head">
          ${t ? teamLogo(t, "xl") : `<img class="team-logo xl" src="logo.png" alt="">`}
          <div>
            <h1 class="player-title">${name}
              ${leg ? `<span class="legacy-rank-badge" title="Legacy ranking">${icon("legacy")}Legacy #${leg.rank} &middot; ${leg.score} pts</span>` : ""}
              ${leg && leg.hof ? hofBadge : leg && leg.tier ? tierBadge(leg.tier) : ""}
            </h1>
            <p class="muted">${t ? `<a class="plink" href="#/teams/${t.slug}">${t.name}</a>` : "Free agent"}</p>
            <div class="pos-row">${pos.map((p) => `<span class="pill">${p}</span>`).join("")}</div>
            ${(() => {
              // Once this season has stats, its ranks go on top and both rows shrink to fit
              const season = statRanks(name, "season").slice(0, 4);
              const all = allTimeRanks(name).filter((r) => r.rank <= 50).slice(0, season.length ? 3 : 5); // only ranks worth showing off
              const row = (label, scope, ranks, topCut, of) => `
                <div class="alltime-ranks">
                  <span class="eyebrow rank-label">${label}</span>
                  ${ranks.map((r) => `<a class="rank-pill ${r.rank <= topCut ? "top" : ""}" href="#/stats/${scope}/${r.key}" title="#${r.rank} of ${r.of} in ${of} ${r.key}">${r.key} <b>#${r.rank}</b></a>`).join("")}
                </div>`;
              return season.length || all.length ? `
                <div class="rank-rows ${season.length ? "compact" : ""}">
                  ${season.length ? row(`S${LEAGUE.season}`, "season", season, 3, `Season ${LEAGUE.season}`) : ""}
                  ${all.length ? row("All-Time", "alltime", all, 10, "All-Time") : ""}
                </div>` : "";
            })()}
          </div>
        </div>

        <div class="season-row">
          <span class="muted">Season:</span>
          <select class="select" aria-label="Season"><option>Season ${LEAGUE.season}</option></select>
        </div>

        <div class="player-cards">
          ${PLAYER_CARDS.map(([k, label, cols]) => `
            <div class="card player-card">
              <div class="table-title">${label}</div>
              <div class="player-stats">
                ${cols.map(([h, f]) => `<div><span class="eyebrow">${h}</span><span class="num">${(totals[k] && totals[k][f]) || 0}</span></div>`).join("")}
              </div>
            </div>`).join("")}
        </div>

        <div class="card player-section">
          <div class="table-title player-section-head">${icon("schedule", "sm")}Per-Game Stat Log<span class="muted small">${games.length} game${games.length === 1 ? "" : "s"}</span></div>
          <div class="player-section-body">
            ${games.length ? games.map(({ g, wk, i, lines }) => {
              const opp = g.teams[1 - i];
              const res = g.score[i] > g.score[1 - i] ? "W" : g.score[i] < g.score[1 - i] ? "L" : "T";
              const chips = Object.entries(lines).map(([k, l]) =>
                `<span class="log-group">${BOX[k].label}</span>` +
                BOX[k].cols
                  .map(([h, f]) => [h, typeof f === "function" ? f(l) : l[f]])
                  .filter(([, v]) => v != null && v !== 0 && v !== "0" && v !== "0.0" && v !== "0.00")
                  .map(([h, v]) => `<span class="honor">${h} ${v}</span>`)
                  .join("")
              );
              return `
                <div class="log-row">
                  <span class="log-wk"><span>WK</span>${wk.week}</span>
                  <div class="log-main">
                    <div><strong>${i === 0 ? "vs" : "@"} ${opp}</strong> <span class="muted small">${res} ${g.score[i]}-${g.score[1 - i]}</span></div>
                    <div class="legacy-honors">${chips.join("")}</div>
                  </div>
                </div>`;
            }).join("") : `<p class="muted">No games recorded yet.</p>`}
          </div>
        </div>

        <div class="card player-section">
          <div class="table-title player-section-head">${icon("scores", "sm")}Achievements<span class="muted small">${honorCount} honor${honorCount === 1 ? "" : "s"}</span></div>
          <div class="player-section-body">
            ${honorCount
              ? `<div class="legacy-honors">${leg && leg.hof ? hofBadge : ""}${honors.map((h) => `
                  <span class="honor">${LEAGUE.legacy.labels[h.code] || h.code.replace(/_/g, " ")}${h.n > 1 ? ` <b>&times;${h.n}</b>` : ""}${h.seasons ? ` <span class="honor-seasons">${[...new Set(h.seasons)].map((s) => `S${s}`).join(", ")}</span>` : ""}</span>`).join("")}</div>`
              : `<p class="muted">No honors yet.</p>`}
          </div>
        </div>

        ${(() => {
          const held = playerRecords(name);
          return `
        <div class="card player-section">
          <div class="table-title player-section-head">${icon("records", "sm")}Records<span class="muted small">${held.length} record${held.length === 1 ? "" : "s"}</span></div>
          <div class="player-section-body">
            ${held.length
              ? `<div class="legacy-honors">${held.map((r) => `
                  <a class="honor honor-link" href="#/records">${esc(r.label)} <b>${esc(r.value)}</b>${r.season ? ` <span class="honor-seasons">S${r.season}</span>` : ""}${r.shared ? ` <span class="honor-seasons">(shared)</span>` : ""}</a>`).join("")}</div>`
              : `<p class="muted">No records yet.</p>`}
          </div>
        </div>`;
        })()}
      </div>`;
  }

  // Every record on the Records page this player holds (or shares), using the same live values as that page
  function playerRecords(name) {
    const key = aliasName(name).toLowerCase();
    const out = [];
    (LEAGUE.records || []).forEach((g) => g.sections.forEach((s) => s.items.forEach((item) => {
      const r = item.career ? careerRecord(item) : seasonRecord(item);
      const holders = (r.holders || []).map((h) => aliasName(h).toLowerCase());
      if (holders.includes(key)) out.push({ label: r.label, value: r.value, season: r.season, shared: holders.length > 1 });
    })));
    return out;
  }

  /* ---------- Stats ---------- */

  let statsScope = "season";
  let statsPos = LEAGUE.stats.categories[0].key;
  let statsRows = [];
  let statsCat = null;

  // Add one stat line into a running total (yards etc. add up, LNG keeps the biggest)
  function addLine(acc, line) {
    Object.entries(line).forEach(([f, v]) => {
      if (typeof v !== "number") return;
      acc[f] = f === "lng" ? Math.max(acc[f] || 0, v) : (acc[f] || 0) + v;
    });
    return acc;
  }

  // Season totals from every final game's box score: { passing: { player: totals }, ... }
  const BOX_TOTALS = { passing: {}, rushing: {}, receiving: {}, defense: {} };
  LEAGUE.schedule.forEach((wk) =>
    wk.games.forEach((g) => {
      if (!Array.isArray(g.score) || !g.box) return;
      g.box.forEach((side, i) =>
        Object.keys(BOX_TOTALS).forEach((k) =>
          ((side && side[k]) || []).forEach((line) => {
            const key = line.player.toLowerCase();
            const acc = (BOX_TOTALS[k][key] = BOX_TOTALS[k][key] || { player: line.player });
            acc.team = g.teams[i];
            addLine(acc, { ...line, gp: 1 });
          })
        )
      );
    })
  );

  // Stats edited by hand (Admin -> Player Stats) replace that player's box score totals
  const statEditFor = (name) => {
    const edits = SAVED.statEdits || {};
    const k = Object.keys(edits).find((n) => n.toLowerCase() === String(name).toLowerCase());
    return k ? edits[k] : null;
  };
  Object.entries(SAVED.statEdits || {}).forEach(([name, edit]) => {
    const key = name.toLowerCase();
    Object.keys(BOX_TOTALS).forEach((g) => {
      const vals = edit[g];
      if (!vals) return;
      const row = BOX_TOTALS[g][key];
      const hasAny = Object.values(vals).some((v) => v);
      if (!row && !hasAny) return;
      const out = { player: (row && row.player) || name, team: row && row.team, ...vals, gp: edit.gp != null ? edit.gp : (row && row.gp) || 0 };
      if (!hasAny && row) delete BOX_TOTALS[g][key];
      else BOX_TOTALS[g][key] = out;
    });
  });

  function positionOf(player, from) {
    const map = LEAGUE.stats.positions || {};
    const found = Object.keys(map).find((n) => n.toLowerCase() === player.toLowerCase());
    const list = [].concat(found ? map[found] : []).map((p) => p.toUpperCase());
    if (from === "receiving") return list.find((p) => p === "WR" || p === "TE") || "WR";
    if (from === "defense") return list.find((p) => p === "DB" || p === "LB") || "DB";
    return null;
  }

  // ---- Season leaders & award candidates (from this season's box scores) ----

  const fmtPts = (n) => String(Math.round(n * 10) / 10);

  function fantasyPoints(group, row) {
    const w = (LEAGUE.fantasy || {})[group] || {};
    return Object.entries(w).reduce((sum, [k, v]) => sum + (row[k] || 0) * v, 0);
  }

  function awardCandidates() {
    return (LEAGUE.candidates || []).map((c) => {
      const pts = new Map();
      c.groups.forEach((g) =>
        Object.values(BOX_TOTALS[g]).forEach((r) => {
          if (c.pos && positionOf(r.player, g) !== c.pos) return;
          const key = r.player.toLowerCase();
          const cur = pts.get(key) || { player: r.player, pts: 0 };
          cur.pts += fantasyPoints(g, r);
          pts.set(key, cur);
        })
      );
      const top = [...pts.values()].sort((a, b) => b.pts - a.pts || a.player.localeCompare(b.player)).slice(0, 3);
      return { ...c, top };
    });
  }

  function candidatesSection() {
    const list = awardCandidates();
    return `
      <div class="section-head section-head--left">
        <h2>${icon("scores", "accent")} Award Candidates</h2>
        <span class="muted small">Season ${LEAGUE.season} &middot; by Fantasy Points</span>
      </div>
      <div class="cand-grid">
        ${list.map((c) => `
          <div class="card cand-card">
            <div class="cand-head"><span>${c.name}</span><span class="cand-code">${c.code}</span></div>
            ${c.top.length ? c.top.map((p, i) => {
              const t = currentTeam(p.player);
              return `
                <div class="cand-row">
                  <span class="cand-rank">${i + 1}</span>
                  ${t ? teamLogo(t) : `<img class="team-logo" src="logo.png" alt="">`}
                  <span class="cand-name">${playerLink(p.player)}</span>
                  <span class="cand-pts">${fmtPts(p.pts)}</span><span class="muted small">fpts</span>
                </div>`;
            }).join("") : `<p class="cand-empty">No stats yet</p>`}
          </div>`).join("")}
      </div>`;
  }

  const LEADER_CARDS = [
    ["Passing Yards", "passing", "yds", "yds"],
    ["Receiving Yards", "receiving", "yds", "yds"],
    ["Rushing Yards", "rushing", "yds", "yds"],
    ["Tackles", "defense", "tak", "tak"],
    ["Sacks", "defense", "sck", "sacks"],
    ["Interceptions", "defense", "int", "int"]
  ];

  function seasonLeaders() {
    const cards = LEADER_CARDS.map(([label, group, key, unit]) => {
      const best = Object.values(BOX_TOTALS[group])
        .filter((r) => (r[key] || 0) > 0)
        .sort((a, b) => b[key] - a[key] || a.player.localeCompare(b.player))[0];
      if (!best) return "";
      const t = currentTeam(best.player);
      return `
        <div class="card leader-card">
          <span class="eyebrow">${label}</span>
          <div class="leader-name">${playerLink(best.player)}</div>
          <div><span class="leader-num">${best[key].toLocaleString()}</span>
            <span class="muted small">${unit}${t ? ` &middot; ${t.name}` : ""}</span></div>
        </div>`;
    }).join("");
    return cards ? `<div class="leader-list">${cards}</div>` : "";
  }

  // Old sheet names -> site names (aliases in data.js), so one player's rows add up together
  function rawAlias(name) {
    const aliases = LEAGUE.aliases || {};
    if (name in aliases) return aliases[name];
    const hit = Object.keys(aliases).find((k) => k.toLowerCase() === String(name).toLowerCase());
    return hit ? aliases[hit] : name;
  }
  // Capital letters never matter: "N4W" and "n4w" are one player. They're always shown with one spelling,
  // taken from (in order) the Legacy list, rosters, head coaches, then the All-Time stat sheets.
  let nameSpelling = null;
  function preferredSpellings() {
    if (nameSpelling) return nameSpelling;
    nameSpelling = new Map();
    const add = (n) => {
      if (typeof n !== "string" || !n || n === "N/A") return;
      const a = rawAlias(n);
      if (!nameSpelling.has(a.toLowerCase())) nameSpelling.set(a.toLowerCase(), a);
    };
    LEAGUE.legacy.players.forEach((p) => add(p.name));
    (LEAGUE.updates || []).forEach((u) => add(u.player));
    LEAGUE.conferences.forEach((c) => c.divisions.forEach((d) => d.teams.forEach((t) => add(t.coach))));
    Object.values(LEAGUE.stats.allTime || {}).forEach((rows) => rows.forEach((r) => add(r.player)));
    return nameSpelling;
  }
  function aliasName(name) {
    const a = rawAlias(name);
    return preferredSpellings().get(String(a).toLowerCase()) || a;
  }

  function statRowsFor(cat, scope) {
    const shown = cat.columns.map(([k]) => k).filter((k) => k !== "gp" && k !== "fpts");
    const fromBox = (cat.from ? Object.values(BOX_TOTALS[cat.from]) : [])
      .filter((r) => !cat.pos || positionOf(r.player, cat.from) === cat.pos)
      // `addFrom` pulls a stat in from another box score section (a DE's pressures can be on their defense line)
      .map((r) => Object.entries(cat.addFrom || {}).reduce((row, [f, g]) => {
        const other = g !== cat.from && BOX_TOTALS[g][row.player.toLowerCase()];
        return other && other[f] ? { ...row, [f]: (row[f] || 0) + other[f] } : row;
      }, r))
      // All-Time tabs only list players who have something in that tab's columns
      .filter((r) => scope === "season" || shown.some((k) => typeof r[k] === "number" && r[k] !== 0))
      .map((r) => (cat.fpts
        ? { ...r, fpts: Object.entries(cat.fpts).reduce((sum, [k, w]) => sum + (r[k] || 0) * w, 0) }
        : r));
    const manual = ((scope === "season" ? LEAGUE.stats.season : LEAGUE.stats.allTime) || {})[cat.key] || [];
    const merged = new Map();
    [...manual, ...fromBox].forEach((r) => {
      const name = aliasName(r.player);
      const key = name.toLowerCase();
      if (!merged.has(key)) merged.set(key, { player: name, team: r.team });
      const acc = merged.get(key);
      if (r.team) acc.team = r.team;
      addLine(acc, r);
    });
    return [...merged.values()]
      .map((r) => {
        if (typeof r.fpts === "number") r.fpts = Math.round(r.fpts * 10) / 10;
        if (cat.from === "passing" && r.att) r.cmpPct = ((r.comp / r.att) * 100).toFixed(1);
        if (cat.from === "rushing" && r.att) r.ypc = (r.yds / r.att).toFixed(2);
        return r;
      });
  }

  function statsTable(rows) {
    if (!rows.length) {
      return empty(`No ${statsCat.key} stats yet`,
        statsScope === "season" ? `Season ${LEAGUE.season} stat leaders will show up here.` : "All-time leaders will show up here.");
    }
    return `
      <div class="card table-card">
        <div class="table-scroll">
          <table class="standings">
            <thead><tr>
              <th class="rank">#</th><th class="team-col">Player</th><th class="team-col">Team</th>
              ${statsCat.columns.map(([k, h]) => `<th class="${k === statsCat.sort ? "sorted" : ""}">${h}</th>`).join("")}
            </tr></thead>
            <tbody>
              ${rows.map((r) => `
                <tr>
                  <td class="rank">${r.rank}</td>
                  <td class="team-col"><strong class="stat-player">${playerLink(r.player)}</strong></td>
                  <td class="team-col">${r.t
                    ? `<a href="#/teams/${r.t.slug}" class="team-cell">${teamLogo(r.t)}<span>${r.team}</span></a>`
                    : `<span class="team-cell"><img class="team-logo" src="${LEAGUE.brandLogo}" alt=""><span>UFF</span></span>`}</td>
                  ${statsCat.columns.map(([k]) => `<td class="${k === statsCat.sort ? "sorted" : ""}">${
                    r[k] == null ? "&mdash;" : typeof r[k] === "number" ? r[k].toLocaleString() : r[k]}</td>`).join("")}
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function stats() {
    const baseCat = LEAGUE.stats.categories.find((c) => c.key === statsPos) || LEAGUE.stats.categories[0];
    statsCat = statsScope === "alltime" && baseCat.allTime ? { ...baseCat, ...baseCat.allTime } : baseCat;
    // Show the team each player is on now (old sheet teams aren't current, so they show as UFF)
    statsRows = statRowsFor(statsCat, statsScope)
      .map((r) => {
        const t = currentTeam(r.player);
        return { ...r, t, team: t ? t.name : "" };
      })
      .sort((a, b) => (b[statsCat.sort] || 0) - (a[statsCat.sort] || 0) || a.player.localeCompare(b.player))
      .map((r, i) => ({ ...r, rank: i + 1 }));
    const scopes = [["season", `Season ${LEAGUE.season}`], ["alltime", "All-Time"]];
    return `
      <div class="wrap">
        <div class="page-head page-head--row">
          <h1>Stat Leaders</h1>
          <div class="segmented" role="tablist">
            ${scopes.map(([k, label]) => `<a href="#/stats/${k}/${statsCat.key}" class="${k === statsScope ? "active" : ""}">${label}</a>`).join("")}
          </div>
        </div>
        <label class="search search--wide">
          ${icon("search")}
          <input id="statsSearch" type="search" placeholder="Search player or team..." autocomplete="off">
        </label>
        <div class="filter-row">
          ${LEAGUE.stats.categories.map((c) => `<a href="#/stats/${statsScope}/${c.key}" class="filter ${c.key === statsCat.key ? "active" : ""}">${c.key}</a>`).join("")}
        </div>
        <div id="statsList">${statsTable(statsRows)}</div>
      </div>`;
  }

  /* ---------- Compare (head to head) ---------- */

  // Picked players and scope live in the address: #/compare/season/<a>/<b>
  const cmp = { scope: "season", a: "", b: "" };
  const cmpRows = {};
  // Every stat tab scored with the All-Time FPTS formulas, for this season or all time: [{ key, rows: Map(name -> row) }]
  function compareTabs(scope) {
    return (cmpRows[scope] = cmpRows[scope] || LEAGUE.stats.categories.map((c) => ({
      key: c.key,
      rows: new Map(statRowsFor(allTimeCat(c.key), scope).map((r) => [r.player.toLowerCase(), r]))
    })));
  }
  const round1 = (n) => Math.round(n * 10) / 10;

  // Every player for the dropdowns: teams A-Z (players A-Z inside each), then free agents A-Z
  let comboCache = null;
  function comboPlayers() {
    if (comboCache) return comboCache;
    const abc = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });
    comboCache = allPlayerNames().map((name) => ({ name, team: currentTeam(name) }))
      .sort((a, b) => (a.team ? 0 : 1) - (b.team ? 0 : 1) || (a.team && b.team ? abc(a.team.name, b.team.name) : 0) || abc(a.name, b.name));
    return comboCache;
  }
  const COMBO_MAX = 250;
  // The rows of a dropdown: everyone while the box still shows the chosen player, otherwise matches for what's typed
  function comboOptions(input) {
    const selected = input.dataset.selected || "";
    const q = input.value.trim() === selected ? "" : input.value.trim().toLowerCase();
    const hits = comboPlayers().filter((p) => !q || p.name.toLowerCase().includes(q) || (p.team && p.team.name.toLowerCase().includes(q)));
    if (!hits.length) return `<div class="combo-empty">No player matches "${esc(input.value.trim())}"</div>`;
    return hits.slice(0, COMBO_MAX).map((p) => `
      <div class="combo-opt ${p.name === selected ? "selected" : ""}" role="option" aria-selected="${p.name === selected}" data-combo-opt="${esc(p.name)}">
        ${p.team ? teamLogo(p.team) : `<img class="team-logo" src="${LEAGUE.brandLogo}" alt="">`}
        <span class="combo-name">${esc(p.name)}</span>
        <span class="combo-team">${p.team ? esc(p.team.name) : "Free agent"}</span>
        <span class="combo-check">${p.name === selected ? "&#10003;" : ""}</span>
      </div>`).join("") + (hits.length > COMBO_MAX ? `<div class="combo-empty">${hits.length - COMBO_MAX} more &middot; keep typing to narrow it down</div>` : "");
  }

  function comparePage() {
    const names = allPlayerNames();
    const find = (typed) => {
      const key = aliasName(String(typed).trim()).toLowerCase();
      return key ? names.find((n) => n.toLowerCase() === key) || null : null;
    };
    const A = find(cmp.a), B = find(cmp.b);
    const scopeLabel = cmp.scope === "season" ? `Season ${LEAGUE.season}` : "All-Time";
    // Player dropdown (see comboOptions): the chosen name is kept in data-selected
    const picker = (id, label, value, selected, side) => `
      <div class="cmp-pick">
        <label class="eyebrow" for="${id}">${label}</label>
        <div class="combo" data-combo="${side}">
          <span class="search">${icon("search")}<input id="${id}" class="combo-input" value="${esc(value)}" data-selected="${esc(selected || "")}"
            placeholder="Search any player or team..." autocomplete="off" spellcheck="false"
            role="combobox" aria-expanded="false" aria-controls="${id}List" aria-autocomplete="list"></span>
          <div class="combo-list" id="${id}List" role="listbox" hidden></div>
        </div>
      </div>`;
    const top = `
      <div class="wrap">
        <div class="page-head">
          <h1 class="title-icon">${icon("compare")}Head to Head</h1>
          <p class="muted">Pick any two players to compare their fantasy points by stat category and their awards.</p>
        </div>
        <div class="cmp-pickers">
          ${picker("cmpA", "Player A", A || cmp.a, A, "a")}
          <button type="button" class="cmp-swap" id="cmpSwap" title="Swap players" aria-label="Swap players">&#8646;</button>
          ${picker("cmpB", "Player B", B || cmp.b, B, "b")}
          <label class="cmp-pick cmp-pick--scope">
            <span class="eyebrow">Stats</span>
            <select id="cmpScope" class="select">
              <option value="season" ${cmp.scope === "season" ? "selected" : ""}>Season ${LEAGUE.season}</option>
              <option value="alltime" ${cmp.scope === "alltime" ? "selected" : ""}>All-Time</option>
            </select>
          </label>
        </div>
      `;
    if (!A || !B) {
      const missing = [[cmp.a, A], [cmp.b, B]].filter(([typed, hit]) => typed && !hit).map(([typed]) => `"${esc(typed)}"`);
      return `${top}
        ${missing.length ? `<p class="login-error cmp-missing">Couldn't find ${missing.join(" or ")}. Pick a name from the list.</p>` : ""}
        ${empty("Pick two players", "Search for a player in each box to see them head to head.")}
      </div>`;
    }

    const tabs = compareTabs(cmp.scope);
    const scores = [A, B].map((name) => {
      const cats = tabs.map((t) => {
        const r = t.rows.get(name.toLowerCase());
        return { key: t.key, v: r && typeof r.fpts === "number" ? round1(r.fpts) : 0 };
      });
      return { name, cats, total: round1(cats.reduce((s, c) => s + c.v, 0)), team: currentTeam(name) };
    });
    const [a, b] = scores;
    const winner = a.total === b.total ? null : a.total > b.total ? a : b;
    const verdict = !a.total && !b.total
      ? `No ${scopeLabel} stats yet for either player${cmp.scope === "season" ? ` &middot; <a class="link" href="#/compare/alltime/${encodeURIComponent(A)}/${encodeURIComponent(B)}">see All-Time</a>` : ""}`
      : winner ? `<strong>${esc(winner.name)} has the better ${cmp.scope === "season" ? "season" : "all-time"} rating</strong> &mdash; ${a.total} vs ${b.total} FPTS`
      : `<strong>Dead even</strong> &mdash; ${a.total} FPTS each`;
    const legacy = computeLegacy();
    const legOf = (name) => legacy.find((p) => p.name.toLowerCase() === name.toLowerCase());

    return `${top}
        <div class="cmp-verdict">${verdict}</div>
        <div class="cmp-cards">
          ${scores.map((s) => `
            <div class="card cmp-card ${winner === s ? "win" : ""}">
              <a class="cmp-who" href="#/players/${encodeURIComponent(s.name)}">
                ${s.team ? teamLogo(s.team, "lg") : `<img class="team-logo lg" src="${LEAGUE.brandLogo}" alt="">`}
                <span><span class="cmp-name">${esc(s.name)}</span><span class="muted small">${s.team ? s.team.name : "Free agent"}</span></span>
              </a>
              <div class="cmp-rating">
                <span class="eyebrow">${scopeLabel} rating (FPTS)</span>
                <span class="cmp-num">${s.total}</span>
                ${winner === s ? `<span class="cmp-badge">&#9733; Higher rating</span>` : ""}
              </div>
            </div>`).join("")}
        </div>
        <div class="card table-card cmp-table-card">
          <div class="table-scroll">
            <table class="standings cmp-table">
              <thead><tr><th class="team-col">Category (FPTS)</th><th>${esc(A)}</th><th>${esc(B)}</th></tr></thead>
              <tbody>
                ${tabs.map((t, i) => {
                  const va = a.cats[i].v, vb = b.cats[i].v;
                  return `<tr>
                    <td class="team-col"><a class="plink" href="#/stats/${cmp.scope}/${t.key}">${t.key}</a></td>
                    <td class="${va > vb ? "cmp-hi" : ""}">${va.toLocaleString()}</td>
                    <td class="${vb > va ? "cmp-hi" : ""}">${vb.toLocaleString()}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card player-section cmp-awards">
          <div class="table-title player-section-head">${icon("scores", "sm")}Awards &amp; Accolades</div>
          <div class="cmp-award-cols">
            ${[A, B].map((name) => {
              const leg = legOf(name);
              const honors = playerHonors(name, leg);
              const n = honors.reduce((sum, h) => sum + h.n, 0) + (leg && leg.hof ? 1 : 0);
              return `
                <div class="cmp-award-col">
                  <div class="cmp-award-head"><strong>${esc(name)}</strong>
                    ${leg ? `<span class="legacy-rank-badge">${icon("legacy")}Legacy #${leg.rank} &middot; ${leg.score} pts</span>` : ""}
                    <span class="pill">${n} honor${n === 1 ? "" : "s"}</span></div>
                  ${n ? `<div class="legacy-honors">${leg && leg.hof ? hofBadge : ""}${honors.map((h) => `
                    <span class="honor">${LEAGUE.legacy.labels[h.code] || h.code.replace(/_/g, " ")}${h.n > 1 ? ` <b>&times;${h.n}</b>` : ""}</span>`).join("")}</div>`
                    : `<p class="muted small">No honors yet.</p>`}
                </div>`;
            }).join("")}
          </div>
        </div>
      </div>`;
  }

  /* ---------- Updates ---------- */

  let updatesFilter = "all";
  const fmtDate = (d) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };

  function updateRow(u, extra = "") {
    const t = u.t || TEAMS.find((x) => x.name === u.team);
    const type = UPDATE_TYPES[u.type] || { label: u.type, verb: "&middot;" };
    const team = t ? `<a class="link-strong" href="#/teams/${t.slug}">${u.team}</a>` : u.team;
    if (u.type === "disband") return `
      <div class="card update-row">
        ${teamLogo(t, "md")}
        <div class="update-main">
          <div><strong>The ${team}</strong> have disbanded. Their players are now free agents.</div>
          <div class="muted small">${[fmtDate(u.date), u.time && fmtTime(u.time)].filter(Boolean).join(" &middot; ")}</div>
        </div>
        <span class="update-type update-type--release">Disbanded</span>${extra}
      </div>`;
    const what = u.type === "promotion"
      ? `${type.verb} to <strong>${u.role || "staff"}</strong> of ${team}`
      : `${type.verb} ${team}`;
    const meta = [fmtDate(u.date), u.time && fmtTime(u.time), u.by && `Offered by ${u.by}`, u.note]
      .filter(Boolean).join(" &middot; ");
    return `
      <div class="card update-row">
        ${t ? teamLogo(t, "md") : `<img class="team-logo md" src="logo.png" alt="">`}
        <div class="update-main">
          <div><strong>${playerLink(u.player)}</strong> ${what}</div>
          <div class="muted small">${meta}</div>
        </div>
        <span class="update-type update-type--${u.type}">${type.label}</span>${extra}
      </div>`;
  }

  function updates() {
    const list = FEED.filter((u) => updatesFilter === "all" || u.type === updatesFilter).reverse();
    const filters = [["all", "All"], ...Object.entries(UPDATE_TYPES).map(([k, v]) => [k, `${v.label}s`])];
    return `
      <div class="wrap">
        ${pageHead("Updates", "Signings, demands, releases and promotions across the league.")}
        <div class="filter-row">
          ${filters.map(([k, label]) => `<a href="#/updates/${k}" class="filter ${k === updatesFilter ? "active" : ""}">${label}</a>`).join("")}
        </div>
        ${list.length
          ? `<div class="update-list">${list.map((u) => updateRow(u)).join("")}</div>`
          : empty("No updates yet", "Signings and demands will show up here as they happen.")}
      </div>`;
  }

  function standings() {
    return `
      <div class="wrap">
        ${pageHead("Standings", `${LEAGUE.year} regular season`)}
        ${LEAGUE.conferences.map((c) => `
          <section class="conf-block">
            <h2 class="conf-title">${c.name}</h2>
            ${c.divisions.map((d) => `
              <div class="card table-card">
                <div class="table-title">${d.name}</div>
                <div class="table-scroll">
                  <table class="standings">
                    <thead>
                      <tr>
                        <th class="rank">#</th><th class="team-col">Team</th>
                        <th>W</th><th>L</th><th>PCT</th><th>PF</th><th>PA</th><th>DIFF</th><th>STRK</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${[...d.teams].sort((a, b) => (b.pf - b.pa) - (a.pf - a.pa)).map((t, i) => `
                        <tr>
                          <td class="rank">${i + 1}</td>
                          <td class="team-col">
                            <a href="#/teams/${slug(t.name)}" class="team-cell">${teamLogo(t)}<span>${t.name}</span>${disbandedTag(t)}</a>
                          </td>
                          <td>${t.w}</td><td>${t.l}</td><td>${pct(t)}</td>
                          <td>${t.pf}</td><td>${t.pa}</td><td>${diff(t)}</td><td>${t.streak}</td>
                        </tr>`).join("")}
                    </tbody>
                  </table>
                </div>
              </div>`).join("")}
          </section>`).join("")}
      </div>`;
  }

  let awardsSeason = LEAGUE.season;

  function awardCard(a, winners) {
    const raw = winners[a.code];
    const head = `
        <div class="award-head">
          <span class="award-icon">${icon(a.icon || "scores")}</span>
          <div>
            <div class="award-code">${a.code.replace(/_/g, " ")}</div>
            <div class="award-name">${a.name}</div>
          </div>
        </div>`;

    if (Array.isArray(raw)) {
      // Several winners; repeated names are counted
      const counts = new Map();
      raw.forEach((n) => { const name = aliasName(n); counts.set(name, (counts.get(name) || 0) + 1); }); // "N4W" and "n4w" count together
      return `
      <div class="card award-card ${a.featured ? "featured" : ""}">
        ${head}
        <ul class="winner-list">
          ${[...counts].map(([n, c]) => `<li>${playerLink(n)}${c > 1 ? `<span class="win-count">&times;${c}</span>` : ""}</li>`).join("")}
        </ul>
      </div>`;
    }

    const w = typeof raw === "string" && raw !== "N/A" ? { player: raw } : raw;
    const t = w && w.team && TEAMS.find((x) => x.name === w.team);
    const title = w && (w.player || w.team);
    const sub = w && (w.player ? w.team : w.record ? `${w.record} record` : "");
    return `
      <div class="card award-card ${a.featured ? "featured" : ""}">
        ${head}
        ${raw === "N/A"
          ? `<p class="award-empty">Not awarded</p>`
          : w
          ? `<div class="award-winner">
              ${t ? teamLogo(t, "md") : w && w.team && Object.keys(LEAGUE.pastTeams || {}).some((n) => n.toLowerCase() === w.team.toLowerCase()) ? anyTeamLogo(w.team, "md") : ""}
              <div>
                <div class="winner-name">${w.player ? playerLink(w.player) : title}</div>
                ${sub ? `<div class="muted small">${sub}</div>` : ""}
              </div>
            </div>`
          : `<p class="award-empty">Not yet awarded</p>`}
      </div>`;
  }

  function awards() {
    const winners = LEAGUE.awardWinners[awardsSeason] || {};
    const seasons = Array.from({ length: LEAGUE.season }, (_, i) => i + 1);
    const featured = LEAGUE.awards.filter((a) => a.featured);
    const rest = LEAGUE.awards.filter(
      (a) => !a.featured && !(a.optional && awardsSeason < LEAGUE.season && !winners[a.code])
    );
    return `
      <div class="wrap">
        <div class="page-head page-head--row">
          <div>
            <h1>Awards</h1>
            <p class="muted">Season honors and player of the year awards</p>
          </div>
          <select id="awardSeason" class="select" aria-label="Season">
            ${seasons.map((s) => `<option value="${s}" ${s === awardsSeason ? "selected" : ""}>Season ${s}</option>`).join("")}
          </select>
        </div>
        ${awardsSeason === LEAGUE.season ? candidatesSection() : ""}
        ${awardsSeason === LEAGUE.season ? `<div class="section-head section-head--left"><h2>${icon("awards", "accent")} Season ${LEAGUE.season} Awards</h2></div>` : ""}
        <div class="award-grid award-grid--featured">${featured.map((a) => awardCard(a, winners)).join("")}</div>
        <div class="award-grid">${rest.map((a) => awardCard(a, winners)).join("")}</div>
      </div>`;
  }

  /* ---------- Legacy ---------- */

  // Score each player from their honor counts (legacy.players in data.js).
  /* ---------- All-Flag teams (saved on Admin -> All-Flag) ---------- */

  const AF_CODE = { 1: "FIRST_TEAM", 2: "SECOND_TEAM", 3: "THIRD_TEAM" };
  const AF_TIER = { 1: "1st", 2: "2nd", 3: "3rd" };
  let afByPlayer = null;
  // Every pick by player: Map(site name lowercased -> { name, picks: [{ season, tier, side, pos, team }] })
  function allFlagByPlayer() {
    if (afByPlayer) return afByPlayer;
    afByPlayer = new Map();
    Object.entries(SAVED.allFlag || {}).forEach(([season, picks]) => picks.forEach((p) => {
      const name = aliasName(p.player);
      const key = name.toLowerCase();
      if (!afByPlayer.has(key)) afByPlayer.set(key, { name, picks: [] });
      afByPlayer.get(key).picks.push({ ...p, season: Number(season) });
    }));
    return afByPlayer;
  }
  // { FIRST_TEAM: [6, 7], THIRD_TEAM: [6, 6] } (one entry per pick)
  function allFlagSeasons(name) {
    const out = {};
    const hit = allFlagByPlayer().get(aliasName(name).toLowerCase());
    (hit ? hit.picks : []).forEach((p) => (out[AF_CODE[p.tier]] = out[AF_CODE[p.tier]] || []).push(p.season));
    return out;
  }
  // Legacy honor counts with All-Flag picks added. Only seasons from `allFlagCountsFrom` on add points:
  // the counts in data.js already include the seasons before it (those still show on the All-Flag and player pages).
  function withAllFlag(name, honors) {
    const from = LEAGUE.legacy.allFlagCountsFrom || 1;
    const out = { ...honors };
    Object.entries(allFlagSeasons(name)).forEach(([code, seasons]) => {
      const counted = seasons.filter((s) => s >= from).length;
      if (counted) out[code] = (honors[code] || 0) + counted;
    });
    return out;
  }
  // Team code from the post (":SIN:") -> logo + name when the site knows the team
  function allFlagTeam(code) {
    const t = TEAMS.find((x) => x.code && x.code.toUpperCase() === code);
    const name = t ? t.name : (LEAGUE.allFlagTeamCodes || {})[code];
    return { logo: anyTeamLogo(name || ""), name: name || code };
  }

  let allFlagSeason = null;
  function allFlagPage() {
    const seasons = Object.keys(SAVED.allFlag || {}).map(Number).sort((a, b) => b - a);
    const head = (sub, extra = "") => `
      <div class="page-head page-head--row">
        <div><h1 class="title-icon">${icon("star")}All-Flag Teams</h1><p class="muted">${sub}</p></div>${extra}
      </div>`;
    if (!seasons.length) return `<div class="wrap">${head("The best player at every spot, every season.")}${empty("No All-Flag teams yet", "They'll show up here once they're posted.")}</div>`;
    const s = seasons.includes(allFlagSeason) ? allFlagSeason : seasons[0];
    const picks = SAVED.allFlag[s];
    return `
      <div class="wrap">
        ${head(`The best player at every spot in Season ${s}.`, `
          <select id="allFlagSeason" class="select" aria-label="Season">
            ${seasons.map((x) => `<option value="${x}" ${x === s ? "selected" : ""}>Season ${x}</option>`).join("")}
          </select>`)}
        ${[1, 2, 3].filter((t) => picks.some((p) => p.tier === t)).map((t) => `
          <section class="af-tier af-tier--${t}">
            <h2 class="conf-title">${AF_TIER[t]} Team All-Flag</h2>
            <div class="af-sides">
              ${["offense", "defense"].map((side) => {
                const list = picks.filter((p) => p.tier === t && p.side === side);
                return list.length ? `
                  <div class="card af-card">
                    <div class="table-title">${side === "offense" ? "Offense" : "Defense"}</div>
                    ${list.map((p) => {
                      const team = allFlagTeam(p.team);
                      return `
                        <div class="af-row">
                          <span class="af-pos">${esc(p.pos)}</span>
                          ${team.logo}
                          <span class="af-name">${playerLink(aliasName(p.player))}</span>
                          <span class="af-team">${esc(team.name)}</span>
                        </div>`;
                    }).join("")}
                  </div>` : "";
              }).join("")}
            </div>
          </section>`).join("")}
      </div>`;
  }

  function computeLegacy() {
    const value = {};
    LEAGUE.legacy.points.forEach((g) => g.codes.forEach((c) => (value[c] = g.value)));
    const order = LEAGUE.legacy.points.flatMap((g) => g.codes);
    const rankOf = (c) => (order.includes(c) ? order.indexOf(c) : order.length);

    // All-Flag picks (Admin -> All-Flag) on top of the counts in data.js; players who only have All-Flag picks join too
    const players = LEAGUE.legacy.players.map((p) => ({ ...p, honors: withAllFlag(p.name, p.honors) }));
    allFlagByPlayer().forEach(({ name }, key) => {
      if (players.some((p) => aliasName(p.name).toLowerCase() === key)) return;
      const honors = withAllFlag(name, {});
      if (Object.keys(honors).some((c) => value[c])) players.push({ name, honors });
    });

    const list = players.map((p) => {
      const honors = Object.entries(p.honors).sort((a, b) => rankOf(a[0]) - rankOf(b[0]));
      const score = honors.reduce((sum, [code, n]) => sum + (value[code] || 0) * n, p.bonus || 0);
      return {
        name: p.name,
        hof: LEAGUE.legacy.hallOfFame.some((n) => n.toLowerCase() === p.name.toLowerCase()),
        score,
        tier: LEAGUE.legacy.tiers.find((t) => score >= t.min),
        honors: honors.map(([code, n]) => ({ code, n, scored: code in value }))
      };
    });
    // Hall of Famers rank above everyone, then highest legacy score first
    list.sort((a, b) => b.hof - a.hof || b.score - a.score || a.name.localeCompare(b.name));
    list.forEach((p, i) => {
      const prev = list[i - 1];
      p.rank = prev && p.score === prev.score && p.hof === prev.hof ? prev.rank : i + 1;
    });
    return list;
  }

  const tierBadge = (t) => `<span class="tier tier--${t.color}">${t.name}</span>`;
  const hofBadge = `<span class="tier tier--hof">${icon("legacy")}Hall of Fame</span>`;

  function legacyRows(list) {
    if (!list.length) return `<div class="empty"><h3>No players found</h3><p>Try a different name.</p></div>`;
    return list.map((p) => `
      <div class="card legacy-row">
        <span class="legacy-rank">${p.rank}</span>
        <div class="legacy-main">
          <div class="legacy-name">${playerLink(p.name)}${p.hof ? hofBadge : p.tier ? tierBadge(p.tier) : ""}</div>
          <div class="legacy-honors">
            ${p.honors.map((h) => `
              <span class="honor ${h.scored ? "" : "honor--unscored"}" ${h.scored ? "" : 'title="Not counted toward legacy yet"'}>
                ${LEAGUE.legacy.labels[h.code] || h.code.replace(/_/g, " ")}${h.n > 1 ? ` <b>&times;${h.n}</b>` : ""}
              </span>`).join("")}
          </div>
        </div>
        <div class="legacy-score"><span class="num">${p.score}</span><span class="eyebrow">pts</span></div>
      </div>`).join("");
  }

  let legacyList = [];

  function legacy() {
    const show = LEAGUE.legacy.showPlayers;
    legacyList = show ? computeLegacy() : [];
    const rules = LEAGUE.legacy.points.map((g) => `${g.label} = ${g.value}`).join(" &middot; ");
    return `
      <div class="wrap">
        <div class="page-head">
          <h1 class="title-icon">${icon("legacy")}Legacy</h1>
          <p class="muted legacy-desc">All-time player legacy score, combining season awards, UFB titles, crowns, flag titles and all-flag honors. Each time an honor is earned it adds points. ${rules}.</p>
        </div>
        <div class="tier-row">
          <span class="tier tier--hof">${icon("legacy")}Hall of Fame <span>Inductees</span></span>
          ${LEAGUE.legacy.tiers.map((t) => `<span class="tier tier--${t.color}">${t.name} <span>${t.min}+</span></span>`).join("")}
        </div>
        ${show
          ? `<label class="search">
              ${icon("search")}
              <input id="legacySearch" type="search" placeholder="Search players..." autocomplete="off">
            </label>
            <div id="legacyList" class="legacy-list">${legacyRows(legacyList)}</div>`
          : empty("Player rankings coming soon", "Legacy scores will be posted once player records are finalized.")}
      </div>`;
  }

  /* ---------- Schedule ---------- */

  let scheduleWeek = LEAGUE.schedule.length ? LEAGUE.schedule[0].week : 1;

  function matchupType(a, b) {
    if (!a || !b) return { label: "Exhibition", cls: "nonconf" };
    if (a.conference !== b.conference) return { label: "Non-conference", cls: "nonconf" };
    if (a.division !== b.division) return { label: "Conference", cls: "conf" };
    return { label: "Division", cls: "div" };
  }

  const BOX = {
    passing: { label: "Passing", cols: [["C/ATT", (r) => `${r.comp}/${r.att}`], ["YDS", "yds"], ["TD", "td"], ["INT", "int"], ["RTG", "rtg"], ["CMP%", "cmpPct"], ["AVG", "avg"], ["LNG", "lng"], ["SCKD", "sacked"]] },
    rushing: { label: "Rushing", cols: [["ATT", "att"], ["YDS", "yds"], ["TD", "td"], ["YPC", "ypc"], ["FUM", "fum"], ["20+", "plus20"], ["LNG", "lng"], ["PRE", "pre"]] },
    receiving: { label: "Receiving", cols: [["TGT", "tgt"], ["REC", "rec"], ["YDS", "yds"], ["TD", "td"], ["DROP", "drop"], ["LNG", "lng"]] },
    defense: { label: "Defense", cols: [["TAK", "tak"], ["TFL", "tfl"], ["SCK", "sck"], ["SAF", "saf"], ["SWAT", "swat"], ["INT", "int"], ["PBU", "pbu"], ["PRE", "pre"], ["TD", "td"]] }
  };

  function boxScore(g, teams, open) {
    return `
      <div class="box" ${open ? "" : "hidden"}>
        ${g.box.map((side, i) => {
          const groups = Object.keys(BOX).filter((k) => side && side[k] && side[k].length);
          return `
            <div class="box-team">
              <div class="box-team-head">${teamLogo(teams[i])}<span>${teams[i].name}</span>
                <span class="muted small">${groups.reduce((n, k) => n + side[k].length, 0) ? "" : "No stats recorded"}</span></div>
              ${groups.map((k) => `
                <div class="table-scroll">
                  <table class="box-table">
                    <thead><tr><th class="team-col">${BOX[k].label}</th>${BOX[k].cols.map(([h]) => `<th>${h}</th>`).join("")}</tr></thead>
                    <tbody>${side[k].map((r) => `
                      <tr><td class="team-col">${playerLink(r.player)}</td>${BOX[k].cols.map(([, f]) => `<td>${(typeof f === "function" ? f(r) : r[f]) ?? "&mdash;"}</td>`).join("")}</tr>`).join("")}
                    </tbody>
                  </table>
                </div>`).join("")}
            </div>`;
        }).join("")}
      </div>`;
  }

  // The newest VOD posted for a game (Admin -> VODs)
  const gameVod = (id) => (SAVED.vods || []).find((v) => v.gameId === id);

  function gameCard(g, open) {
    const openBox = open === true; // only the admin preview opens it (pages call .map(gameCard), which passes an index)
    const [a, b] = g.teams.map((n) => TEAMS.find((t) => t.name === n) || { name: n });
    const type = matchupType(a.slug && a, b.slug && b);
    const final = Array.isArray(g.score);
    const side = (t, i) => {
      const won = final && g.score[i] > g.score[1 - i];
      return `
        <a class="game-team ${i ? "game-team--right" : ""} ${final && !won ? "lost" : ""}" ${t.slug ? `href="#/teams/${t.slug}"` : ""}>
          ${teamLogo(t, "md")}
          <span>
            <span class="game-team-name">${t.name}</span>
            ${t.slug ? `<span class="muted small">${t.w}-${t.l}</span>` : ""}
          </span>
        </a>`;
    };
    return `
      <div class="card game-card">
        <div class="game-top">
          <span class="game-id">${g.id}</span>
          <span class="game-type game-type--${type.cls}">${type.label}</span>
        </div>
        <div class="game-row">
          ${side(a, 0)}
          <div class="game-mid">${final ? `<span class="game-score">${g.score[0]}<span class="muted">-</span>${g.score[1]}</span>` : `<span class="game-vs">vs</span>`}</div>
          ${side(b, 1)}
        </div>
        <div class="game-foot">
          ${icon("clock", "sm")}
          ${final ? `Final${g.date ? ` &middot; ${fmtDate(g.date)}` : ""}` : g.time || "No game time set yet"}
          ${g.potg ? `<span class="potg">${icon("scores", "sm")}Player of the Game: <strong>${playerLink(g.potg)}</strong></span>` : ""}
        </div>
        ${(() => {
          const hasBox = final && g.box;
          const vod = gameVod(g.id);
          // A live stream tied to this game (Admin -> Live Streams), playable right in the card
          const live = (SAVED.streams || []).find((s) => s.gameId === g.id && streamEmbed(s.url));
          const vodEmbed = vod && streamEmbed(vod.url);
          if (!hasBox && !vod && !live) return "";
          return `
            <div class="game-actions">
              ${hasBox ? `<button type="button" class="box-toggle ${openBox ? "open" : ""}" data-box-toggle aria-expanded="${openBox}">Box score</button>` : ""}
              ${live ? `<button type="button" class="box-toggle watch-btn" data-watch="${esc(streamEmbed(live.url))}" aria-expanded="false" title="${esc(live.title)}"><span class="live-dot"></span>Watch live</button>` : ""}
              ${vodEmbed ? `<button type="button" class="box-toggle watch-btn" data-watch="${esc(vodEmbed)}" aria-expanded="false" title="${esc(vod.title)}">&#9654; Stream</button>`
                : vod ? `<a class="box-toggle vod-btn" href="${esc(vod.url)}" target="_blank" rel="noopener" title="${esc(vod.title)}">&#9654; VOD</a>` : ""}
            </div>
            ${live || vodEmbed ? `<div class="watch" hidden><div class="live-frame"><iframe title="Game stream" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div>` : ""}
            ${hasBox ? boxScore(g, [a, b], openBox) : ""}`;
        })()}
      </div>`;
  }

  // Weeks that have final games, newest week first, keeping only the finals
  function finalWeeks() {
    return LEAGUE.schedule
      .map((wk) => ({ ...wk, games: wk.games.filter((g) => Array.isArray(g.score)) }))
      .filter((wk) => wk.games.length)
      .reverse();
  }

  function scores() {
    const weeks = finalWeeks();
    return `
      <div class="wrap">
        ${pageHead("Scores", "Final results from every week.")}
        ${weeks.length
          ? weeks.map((wk) => `
              <h3 class="div-title">${wk.series ? `Series ${wk.series} &middot; ` : ""}Week ${wk.week}</h3>
              <div class="game-grid game-grid--tight">${wk.games.map(gameCard).join("")}</div>`).join("")
          : empty("No games played yet", "Game results will appear here once games are played.")}
      </div>`;
  }

  function schedule() {
    if (!LEAGUE.schedule.length) return placeholder("Schedule", "The season schedule will be posted soon.")();
    const wk = LEAGUE.schedule.find((w) => w.week === scheduleWeek) || LEAGUE.schedule[0];
    const finals = wk.games.filter((g) => Array.isArray(g.score)).length;
    return `
      <div class="wrap">
        <div class="page-head page-head--row">
          <div>
            <h1>Schedule</h1>
            <p class="muted">${wk.series ? `Series ${wk.series} &middot; ` : ""}Week ${wk.week} &middot; ${wk.games.length} games &middot; ${finals} final</p>
          </div>
          <select id="scheduleWeek" class="select" aria-label="Week">
            ${LEAGUE.schedule.map((w) => `<option value="${w.week}" ${w.week === wk.week ? "selected" : ""}>Week ${w.week}</option>`).join("")}
          </select>
        </div>
        <div class="game-grid">${wk.games.map(gameCard).join("")}</div>
      </div>`;
  }

  /* ---------- Records ---------- */

  const SECTION_ICONS = { Passing: "stats", Receiving: "stats", Rushing: "stats", Defense: "awards", Team: "teams", Achievements: "legacy" };

  const allTimeCat = (key) => {
    const c = LEAGUE.stats.categories.find((x) => x.key === key);
    return c && c.allTime ? { ...c, ...c.allTime } : c;
  };

  // Everyone tied for the top value
  function topOf(totals) {
    const best = Math.max(...totals.map((t) => t.v));
    return best > 0 ? { best, holders: totals.filter((t) => t.v === best).map((t) => t.player) } : null;
  }

  // Career records come straight from the All-Time stats, so the two always agree
  function careerRecord(r) {
    const totals = new Map();
    r.career.forEach((spec) => {
      const [cat, field] = spec.split(".");
      statRowsFor(allTimeCat(cat), "alltime").forEach((row) => {
        const key = row.player.toLowerCase();
        const cur = totals.get(key) || { player: row.player, v: 0 };
        cur.v += row[field] || 0;
        totals.set(key, cur);
      });
    });
    const top = topOf([...totals.values()]);
    return top ? { ...r, holders: top.holders, value: top.best.toLocaleString() } : { ...r, holders: [], value: "—" };
  }

  // A single-season record is replaced when someone this season beats it
  function seasonRecord(r) {
    if (!r.stat) return r;
    const [group, field] = r.stat.split(".");
    const top = topOf(Object.values(BOX_TOTALS[group] || {}).map((row) => ({ player: row.player, v: row[field] || 0 })));
    const old = Number(String(r.value).replace(/[^\d.]/g, ""));
    return top && top.best > old ? { ...r, holders: top.holders, value: top.best.toLocaleString(), season: LEAGUE.season } : r;
  }

  function records() {
    return `
      <div class="wrap">
        <div class="page-head">
          <h1 class="title-icon">${icon("records")}Records</h1>
          <p class="muted">UFF single-season, career, team and achievement records.</p>
        </div>
        ${LEAGUE.records.map((g) => `
          <section class="conf-block">
            <h2 class="conf-title">${g.group}</h2>
            ${g.sections.map((s) => `
              <h3 class="div-title">${s.name}</h3>
              <div class="record-grid">
                ${s.items.map((item) => {
                  const r = item.career ? careerRecord(item) : seasonRecord(item);
                  const t = TEAMS.find((x) => x.name === r.holders[0]);
                  return `
                  <div class="card record-card">
                    <div class="record-head">
                      <span class="award-icon">${icon(SECTION_ICONS[s.name] || "records")}</span>
                      <span class="record-label">${r.label}</span>
                      ${r.season ? `<span class="pill record-season">S${r.season}</span>` : ""}
                    </div>
                    <div class="record-value">${r.value}</div>
                    <div class="record-holders">
                      ${t ? teamLogo(t) : ""}${r.holders.map((h) => (t ? `<span>${h}</span>` : playerLink(h))).join('<span class="muted">&amp;</span>')}
                    </div>
                  </div>`;
                }).join("")}
              </div>`).join("")}
          </section>`).join("")}
      </div>`;
  }

  /* ---------- Admin ---------- */

  const ADMIN_KEY = "uffAdmin";
  const ADMIN_LEFT_KEY = "uffAdminLeft";
  // Browsers restore sessionStorage when they reopen tabs, so also drop the login if the
  // page was closed for more than a few seconds (a quick refresh keeps you logged in).
  try {
    const left = Number(sessionStorage.getItem(ADMIN_LEFT_KEY));
    if (!left || Date.now() - left > 10000) sessionStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem(ADMIN_LEFT_KEY);
  } catch (e) {}
  addEventListener("pagehide", () => { try { sessionStorage.setItem(ADMIN_LEFT_KEY, Date.now()); } catch (e) {} });
  // The login is { user, token }; the token comes from the server and is checked on every save
  const getAdmin = () => {
    try {
      const s = JSON.parse(sessionStorage.getItem(ADMIN_KEY));
      return s && Number(String(s.token).split(".")[0]) > Date.now() ? s : null;
    } catch (e) { return null; }
  };
  const setAdmin = (v) => { try { v ? sessionStorage.setItem(ADMIN_KEY, JSON.stringify(v)) : sessionStorage.removeItem(ADMIN_KEY); } catch (e) {} };
  let adminError = "";
  let adminFlash = "";

  async function adminCall(body) {
    const offline = "Couldn't reach the admin server. Check your internet and try again.";
    let res;
    try {
      res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, token: (getAdmin() || {}).token })
      });
    } catch (e) { throw new Error(offline); }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!data) throw new Error(offline);
    if (res.status === 401 && body.action !== "login") setAdmin(null);
    if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
    return data;
  }

  const flashBox = () =>
    adminFlash ? `<p class="admin-flash">${adminFlash}</p>` : adminError ? `<p class="login-error admin-error">${adminError}</p>` : "";

  // Everyone the site knows about, for the player name suggestions
  function knownPlayers() {
    const names = new Map();
    const add = (n) => n && !names.has(n.toLowerCase()) && names.set(n.toLowerCase(), n);
    Object.values(ROSTERS).forEach((r) => r.forEach(add));
    Object.values(BOX_TOTALS).forEach((g) => Object.values(g).forEach((r) => add(r.player)));
    Object.keys(LEAGUE.stats.positions || {}).forEach(add);
    LEAGUE.legacy.players.forEach((p) => add(p.name));
    return [...names.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  function positionsSection() {
    const changed = Object.entries(LEAGUE.stats.positions || {})
      .filter(([, list]) => [].concat(list).some((p) => /^(TE|LB)$/i.test(p)))
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }));
    return `
      <section>
        <div class="section-head section-head--left"><h2>Player Positions</h2></div>
        <form class="card admin-card" id="posForm" autocomplete="off">
          <p class="muted small admin-note">Receivers count as WR and defenders as DB unless you change them here. This moves their stats to the right tab on the Stats page and the right award.</p>
          <div class="admin-fields">
            <label class="field admin-grow"><span>Player</span><input name="player" id="posPlayer" list="playerNames" required></label>
            <label class="field"><span>Offense</span><select name="off" id="posOff" class="select"><option>WR</option><option>TE</option></select></label>
            <label class="field"><span>Defense</span><select name="def" id="posDef" class="select"><option>DB</option><option>LB</option></select></label>
            <button class="btn btn-primary" type="submit">Save</button>
          </div>
          <datalist id="playerNames">${knownPlayers().map((n) => `<option value="${n}">`).join("")}</datalist>
        </form>
        ${changed.length ? `
          <div class="card list-card admin-list">
            ${changed.map(([name, list]) => `
              <div class="list-row">
                <span>${playerLink(name)}</span>
                <span class="muted small">${[].concat(list).map((p) => p.toUpperCase()).join(", ")}</span>
              </div>`).join("")}
          </div>` : ""}
      </section>`;
  }

  async function savePosition(form) {
    const typed = String(form.get("player") || "").trim();
    if (!typed) return;
    const name = knownPlayers().find((n) => n.toLowerCase() === typed.toLowerCase()) || typed;
    // Only TE / LB need storing; WR and DB are the defaults
    const list = [form.get("off") === "TE" && "TE", form.get("def") === "LB" && "LB"].filter(Boolean);
    await adminCall({ action: "setPosition", name, list });
    const posMap = LEAGUE.stats.positions;
    Object.keys(posMap).filter((n) => n.toLowerCase() === name.toLowerCase()).forEach((n) => delete posMap[n]);
    posMap[name] = list;
    adminFlash = `Saved: ${name} is now ${form.get("off")} / ${form.get("def")}. Everyone sees it now.`;
  }

  // ---- Game results: read a pasted "UFF | Week N Game Recap" ----

  const RECAP_FIELDS = {
    passing: { YDS: "yds", TD: "td", INT: "int", RTG: "rtg", CMP: "cmpPct", AVG: "avg", LNG: "lng", SCKED: "sacked", SCKD: "sacked", SACKED: "sacked" },
    rushing: { ATT: "att", YDS: "yds", TD: "td", YPC: "ypc", FUM: "fum", "20+": "plus20", LNG: "lng", PRE: "pre", PRS: "pre", PRESSURE: "pre", PRESSURES: "pre" },
    receiving: { TGT: "tgt", REC: "rec", YDS: "yds", TD: "td", DROP: "drop", LNG: "lng" },
    defense: { TAK: "tak", TFL: "tfl", SCK: "sck", SAF: "saf", SWAT: "swat", INT: "int", PBU: "pbu", PRE: "pre", TD: "td" }
  };
  // Kept as text so they aren't added up across games
  const TEXT_FIELDS = new Set(["rtg", "cmpPct", "avg", "ypc"]);
  const normTeam = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

  // Stat sheet name -> site name: nicknames from data.js first, then the spelling the site already uses
  function siteName(raw, known) {
    const aliases = LEAGUE.aliases || {};
    const hit = raw in aliases ? raw : Object.keys(aliases).find((k) => k.toLowerCase() === raw.toLowerCase());
    const name = hit ? aliases[hit] : raw;
    return known.find((n) => n === name) || known.find((n) => n.toLowerCase() === name.toLowerCase()) || name;
  }

  function parseRecap(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const known = knownPlayers();
    const out = { teams: null, score: null, week: null, date: null, potg: null, sides: [{}, {}], renamed: [], problems: [] };
    let side = -1, group = null, sections = 0;
    const rename = (raw) => {
      const name = siteName(raw, known);
      if (name !== raw && name.toLowerCase() !== raw.toLowerCase() && !out.renamed.some(([a]) => a === raw)) out.renamed.push([raw, name]);
      return name;
    };

    lines.forEach((line, i) => {
      const next = lines[i + 1] || "";
      let m;
      if (!out.week && (m = line.match(/week\s*(\d+)/i))) out.week = Number(m[1]);
      if (!out.score && (m = line.match(/^(.+?)\s+(\d+)\s*[—–-]+\s*(\d+)\s+(.+)$/)) && !line.includes("|")) {
        out.teams = [m[1].trim(), m[4].trim()];
        out.score = [Number(m[2]), Number(m[3])];
        return;
      }
      if (/player of the game/i.test(line)) { out.potg = rename(next.replace(/^[^\w]+/, "").trim()); return; }
      if (/game date/i.test(line) && (m = next.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/))) {
        out.date = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        return;
      }
      if ((m = line.match(/^(.+?)\s+stats$/i))) {
        // Which team these stats are for: match the name, otherwise go by order
        const n = normTeam(m[1]);
        side = out.teams ? out.teams.findIndex((t) => normTeam(t) === n) : -1;
        if (side < 0) side = Math.min(sections, 1);
        sections++;
        group = null;
        return;
      }
      if (!line.includes("|")) {
        const g = Object.keys(RECAP_FIELDS).find((k) => line.toLowerCase().includes(k));
        if (g && side >= 0) group = g;
        return;
      }
      if (side < 0 || !group) return;
      const [rawName, ...tokens] = line.split("|").map((t) => t.trim());
      if (!rawName) return;
      const row = { player: rename(rawName) };
      tokens.filter(Boolean).forEach((tok) => {
        let t;
        if (group === "passing" && (t = tok.match(/^(\d+)\s*\/\s*(\d+)$/))) { row.comp = Number(t[1]); row.att = Number(t[2]); return; }
        t = tok.match(/^(-?\d+(?:\.\d+)?)%?\s+(\S+)$/);
        const [num, label] = t ? [t[1], t[2]] : (tok.match(/^(\S+)\s+(-?\d+(?:\.\d+)?)%?$/) || []).slice(1).reverse();
        const field = label && RECAP_FIELDS[group][label.toUpperCase()];
        if (!field) { out.problems.push(`Couldn't read "${tok}" on ${row.player}'s ${group} line.`); return; }
        row[field] = TEXT_FIELDS.has(field) ? num : Number(num);
      });
      (out.sides[side][group] = out.sides[side][group] || []).push(row);
    });
    if (!out.score) out.problems.unshift("Couldn't find the score line (like \"TEAM A 6 — 0 TEAM B\").");
    return out;
  }

  const allGames = () => LEAGUE.schedule.flatMap((wk) => wk.games.map((g) => ({ g, wk })));

  // The scheduled game for these two teams, preferring the recap's week and games with no stats yet
  // (the Discord bot posts the final score first, so a game can be final with its stats still to come)
  function findGame(recap) {
    if (!recap.teams) return null;
    const want = recap.teams.map(normTeam).sort().join("|");
    const hits = allGames().filter(({ g }) => g.teams.map(normTeam).sort().join("|") === want);
    const pick = hits.find(({ wk }) => wk.week === recap.week) || hits.find(({ g }) => !g.box) || hits[0];
    return pick ? pick.g : null;
  }

  // Line the recap up with the game's team order
  function recapResult(recap, g) {
    const n = g.teams.map(normTeam);
    const swap = normTeam(recap.teams[0]) === n[1] || normTeam(recap.teams[1]) === n[0];
    const order = swap ? [1, 0] : [0, 1];
    return {
      id: g.id,
      score: order.map((i) => recap.score[i]),
      date: recap.date || undefined,
      potg: recap.potg || undefined,
      box: order.map((i) => recap.sides[i])
    };
  }

  let resDraft = null; // { text, recap, gameId }

  function resultPreview() {
    if (!resDraft) return "";
    const { recap } = resDraft;
    const entry = allGames().find(({ g }) => g.id === resDraft.gameId);
    const g = entry && entry.g;
    const teamNames = TEAMS.map((t) => normTeam(t.name));
    const notes = [];
    if (resDraft.dupOf) notes.push(`<strong>These exact stats were already entered for ${resDraft.dupOf}.</strong> They can't be saved again.`);
    (recap.teams || []).forEach((t) => {
      if (!teamNames.includes(normTeam(t))) notes.push(`"${t}" isn't a team in the league, so pick the game below.`);
    });
    if (g && Array.isArray(g.score)) notes.push(`${g.id} already has a final score. Saving will replace it.`);
    recap.renamed.forEach(([a, b]) => notes.push(`${a} will be saved as ${b}.`));
    recap.problems.forEach((p) => notes.push(p));
    const preview = g && recap.score
      ? gameCard({ ...g, ...recapResult(recap, g) }, true)
      : "";
    return `
      <div class="admin-fields admin-game-pick">
        <label class="field admin-grow"><span>Game</span>
          <select id="resGame" class="select">
            <option value="">Pick the game...</option>
            ${LEAGUE.schedule.map((wk) => `
              <optgroup label="Week ${wk.week}">
                ${wk.games.map((x) => `<option value="${x.id}" ${x.id === resDraft.gameId ? "selected" : ""}>${x.id} · ${x.teams[0]} vs ${x.teams[1]}${Array.isArray(x.score) ? ` (final ${x.score[0]}-${x.score[1]})` : ""}</option>`).join("")}
              </optgroup>`).join("")}
          </select>
        </label>
      </div>
      ${notes.length ? `<ul class="admin-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
      ${preview ? `<div class="admin-preview">${preview}</div>` : ""}
      <div class="admin-actions">
        <button class="btn btn-primary" id="resSave" ${preview && !resDraft.dupOf ? "" : "disabled"}>Save result</button>
        <button class="btn btn-ghost" id="resClear">Clear</button>
      </div>`;
  }

  const statLines = (box) => (box || []).reduce((n, side) =>
    n + Object.values(side || {}).reduce((m, list) => m + (Array.isArray(list) ? list.length : 0), 0), 0);
  const resultLabel = (g, score) => `${g.id}: ${g.teams[0]} ${score[0]}-${score[1]} ${g.teams[1]}`;

  // Every game recap saved this season, newest week first
  function recordedGames() {
    const rows = SAVED.results.map((r) => ({ r, e: allGames().find(({ g }) => g.id === r.id) }))
      .sort((a, b) => ((b.e && b.e.wk.week) || 0) - ((a.e && a.e.wk.week) || 0) || String(b.r.date || "").localeCompare(String(a.r.date || "")));
    return `
      <div class="card admin-card admin-list">
        <div class="admin-subhead">Recorded Games &middot; Season ${LEAGUE.season}<span class="muted small">${rows.length} game${rows.length === 1 ? "" : "s"}</span></div>
        <p class="muted small admin-note">Every recap added this season. Remove a wrong one to take its score and stats back out, then paste it again.</p>
        ${rows.length ? rows.map(({ r, e }) => `
          <div class="list-row recorded-row">
            <div>
              <strong>${e ? `${esc(e.g.teams[0])} ${r.score[0]} &mdash; ${r.score[1]} ${esc(e.g.teams[1])}` : `${esc(r.id)} &middot; ${r.score[0]}-${r.score[1]}`}</strong>
              <div class="muted small">${[e && `Week ${e.wk.week}`, r.date && fmtDate(r.date), `${statLines(r.box)} stat lines`].filter(Boolean).join(" &middot; ")}
                ${e ? `&middot; <span class="ok-text">${esc(e.g.id)} on the schedule</span>` : `&middot; <span class="warn-text">not on the schedule, so it doesn't show on the site</span>`}</div>
            </div>
            <button class="btn btn-ghost btn-sm" data-del-result="${esc(r.id)}">Remove</button>
          </div>`).join("") : `<p class="muted">No games recorded yet.</p>`}
      </div>`;
  }

  function resultsSection() {
    return `
      <section>
        <div class="section-head section-head--left"><h2>Game Results</h2></div>
        <div class="card admin-card">
          <p class="muted small admin-note">Paste the full game recap. The score, box score and every player's stats update Scores, Standings, Stats and Award Candidates for everyone once you save.</p>
          <textarea id="resPaste" class="admin-textarea" rows="8" placeholder="UFF | Week 1 Game Recap&#10;KANSAS CITY JAZZ 6 — 0 SHIROISHI SAMURAI&#10;...">${resDraft ? resDraft.text : ""}</textarea>
          <div id="resPreview">${resultPreview()}</div>
        </div>
        ${recordedGames()}
      </section>`;
  }

  // Same fingerprint as the server (netlify/functions/admin.mjs): spacing and blank lines don't count
  async function recapHash(text) {
    const norm = text.split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean).join("\n");
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function updateResultDraft(text) {
    if (!text.trim()) { resDraft = null; return; }
    const recap = parseRecap(text);
    const prev = resDraft && resDraft.gameId;
    const found = findGame(recap);
    const draft = (resDraft = { text, recap, gameId: found ? found.id : prev || "", dupOf: null });
    // Warn right away if this exact recap was already saved
    recapHash(text).then((h) => {
      const dup = SAVED.results.find((r) => r.sourceHash === h);
      if (resDraft !== draft || !dup) return;
      draft.dupOf = dup.id;
      showResultPreview();
    }).catch(() => {});
  }

  // ---- Transactions: read pasted Discord transaction posts ----

  const TX_EVENTS = [
    ["sign", /^(.*?)\s+has signed with\s+(.+?)[\s!.]*$/i],
    ["sign", /^(.*?)\s+has accepted the offer to\s+(.+?)[\s!.]*$/i],
    ["promotion", /^(.*?)\s+has been promoted to\s+(.+?)\s+of\s+(.+?)[\s!.]*$/i],
    ["release", /^(.*?)\s+(?:has been|was)\s+released\s+(?:by|from)\s+(.+?)[\s!.]*$/i],
    ["demand", /^(.*?)\s+has\s+demanded\s+(?:a\s+release\s+)?(?:from\s+)?(.+?)[\s!.]*$/i],
    // "@peachi® lie917 demands release from :NO~1: @New Orleans Raiders"
    ["demand", /^(.*?)\s+demands?\s+(?:a\s+)?(?:release\s+)?from\s+(.+?)[\s!.]*$/i]
  ];
  const localDay = (d = new Date()) => d.toLocaleDateString("en-CA");
  const to24 = (h, m, ap) => `${String((Number(h) % 12) + (/p/i.test(ap) ? 12 : 0)).padStart(2, "0")}:${m}`;

  // "@2 trey (@Aloneinnewyorkcity)®" -> "2 trey", "@desiredsantana®" -> "desiredsantana"
  function mentionName(s) {
    // "<@816767631222505538> xxlopzj" -> "xxlopzj" (keep the raw tag only if there's no name after it)
    // and a cut-off handle at the end ("Vljla6i (@") goes too
    s = s.replace(/<@[!&]?\d+>\s*(?=\S)/g, "").replace(/(\S)\s*\(@[^)]*$/, "$1").trim().replace(/^@/, "");
    const m = s.match(/^(.+?)\s*(?:\(@[^)]*\))?\s*®/);
    return (m ? m[1] : s.replace(/[®!.]+$/, "")).trim();
  }

  // ":SCB: @Sarnia City Broncos" -> "Sarnia City Broncos"
  function txTeam(s) {
    const raw = s.replace(/:[^:\s]+:/g, "").replace(/@/g, "").replace(/[!.]+$/, "").trim();
    const t = TEAMS.find((x) => normTeam(x.name) === normTeam(raw));
    return t ? t.name : raw;
  }

  // "Today at 3:23 PM" / "Yesterday at 9:05 AM" / "10/15/2026 3:23 PM"
  function txWhen(line, day) {
    let m = line.match(/\b(today|yesterday)\s+at\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
    if (m) {
      const d = new Date(`${day}T12:00:00`);
      if (/yesterday/i.test(m[1])) d.setDate(d.getDate() - 1);
      return { date: localDay(d), time: to24(m[2], m[3], m[4]) };
    }
    m = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4}),?\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return { date: `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`, time: to24(m[4], m[5], m[6]) };
    }
    return null;
  }

  function parseTransactions(text, day) {
    const known = knownPlayers();
    const out = { list: [], renamed: [] };
    const rename = (raw) => {
      const name = siteName(raw, known);
      if (name.toLowerCase() !== raw.toLowerCase() && !out.renamed.some(([a]) => a === raw)) out.renamed.push([raw, name]);
      return name;
    };
    let cur = null, wantBy = false, headerWhen = null;
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
      // A Discord message header ("ZevoraV2 APP — Yesterday at 10:25 PM") dates the transaction under it
      if (/(^|\s)[—–]\s*(today|yesterday|\d{1,2}\/)/i.test(line) && txWhen(line, day)) { headerWhen = txWhen(line, day); return; }
      for (const [type, re] of TX_EVENTS) {
        const m = line.match(re);
        if (!m) continue;
        cur = { type, player: rename(mentionName(m[1])), ...(headerWhen || {}) };
        headerWhen = null;
        if (type === "promotion") { cur.role = m[2].trim(); cur.team = txTeam(m[3]); } else cur.team = txTeam(m[2]);
        out.list.push(cur);
        wantBy = false;
        return;
      }
      if (!cur) return;
      let m;
      if (/^by$/i.test(line)) { wantBy = true; return; }
      if (wantBy) { cur.by = rename(mentionName(line)); wantBy = false; return; }
      if ((m = line.match(/offered by\s*[-–—:]\s*(.+)$/i))) { cur.by = rename(mentionName(m[1])); return; }
      if (/demands?\s+left/i.test(line)) cur.note = line.replace(/^[^\w]+/, "");
      const when = !cur.date && txWhen(line, day);
      if (when) Object.assign(cur, when);
    });
    // Anything without its own time gets the chosen day; skip ones already on the Updates page
    const have = new Set(LEAGUE.updates.map(updateKey));
    out.list.forEach((u) => {
      u.date = u.date || day;
      u.dup = have.has(updateKey(u));
      have.add(updateKey(u));
    });
    return out;
  }

  let txDraft = null; // { text, day, parsed, dupPaste }

  function txPreview() {
    if (!txDraft) return "";
    const { list, renamed } = txDraft.parsed;
    const fresh = list.filter((u) => !u.dup);
    const notes = [];
    if (txDraft.dupPaste) notes.push("<strong>These exact transactions were already entered.</strong> They can't be saved again.");
    if (!list.length) notes.push("Couldn't find any signings, demands, releases or promotions in that paste.");
    [...new Set(list.map((u) => u.team))].forEach((t) => {
      if (!TEAMS.some((x) => x.name === t)) notes.push(`"${t}" isn't a team in the league.`);
    });
    if (list.length > fresh.length) notes.push(`${list.length - fresh.length} already on the Updates page, so ${list.length - fresh.length === 1 ? "it" : "they"} will be skipped.`);
    renamed.forEach(([a, b]) => notes.push(`${a} will be saved as ${b}.`));
    return `
      <div class="admin-fields admin-game-pick">
        <label class="field"><span>"Today" in the paste means</span><input type="date" id="txDay" class="select" value="${txDraft.day}"></label>
      </div>
      ${notes.length ? `<ul class="admin-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
      ${list.length ? `<div class="update-list admin-preview">${list.map((u) =>
        updateRow(u, u.dup ? `<span class="pill">Already posted</span>` : "")).join("")}</div>` : ""}
      <div class="admin-actions">
        <button class="btn btn-primary" id="txSave" ${fresh.length && !txDraft.dupPaste ? "" : "disabled"}>Save ${fresh.length || ""} transaction${fresh.length === 1 ? "" : "s"}</button>
        <button class="btn btn-ghost" id="txClear">Clear</button>
      </div>`;
  }

  // ---- All-Flag teams: read a pasted "Season 6- All Flags Teams" post ----

  // A name from the post -> the site's name for that player (nicknames, then full names, then a unique partial match)
  // Everyone the site has a name for: Legacy, rosters, coaches, stat sheets, box scores and award winners
  function allPlayerNames() {
    const award = Object.values(LEAGUE.awardWinners || {}).flatMap((list) => Object.values(list))
      .flatMap((v) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : v && v.player ? [v.player] : []))
      .filter((n) => n !== "N/A").map(aliasName);
    return [...new Set([...preferredSpellings().values(), ...knownPlayers(), ...award])];
  }

  // How many single-letter edits (or swapped neighbors) turn a into b
  function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }

  function matchAllFlagName(raw) {
    const aliased = rawAlias(raw);
    if (aliased !== raw) return { player: aliasName(aliased), sure: true };
    const names = allPlayerNames();
    const exact = names.find((n) => n.toLowerCase() === raw.toLowerCase());
    if (exact) return { player: exact, sure: true };
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    const n = norm(raw);
    if (n.length >= 3) {
      const starts = names.filter((x) => norm(x).startsWith(n));
      if (starts.length === 1) return { player: starts[0], sure: true };
      const has = names.filter((x) => norm(x).includes(n));
      if (has.length === 1) return { player: has[0], sure: true };
      if (starts[0] || has[0]) return { player: starts[0] || has[0], sure: false };
    }
    // A typo ("Coldveiw" -> "coldview"): the one close spelling, as a guess to check
    if (n.length >= 5) {
      const close = names.filter((x) => Math.abs(norm(x).length - n.length) <= 2 && editDistance(norm(x), n) <= 2);
      if (close.length === 1) return { player: close[0], sure: false };
    }
    return { player: raw, sure: false };
  }

  function parseAllFlag(text) {
    const out = { season: null, picks: [] };
    let tier = 0, side = "offense";
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
      let m;
      if (!out.season && (m = line.match(/season\s*(\d+)/i))) out.season = Number(m[1]);
      // "1st Team All-Flag Offense"
      if ((m = line.match(/\b(1st|2nd|3rd|first|second|third)\b.*\bteam\b/i))) {
        tier = { "1st": 1, first: 1, "2nd": 2, second: 2, "3rd": 3, third: 3 }[m[1].toLowerCase()];
        side = /defen[cs]e/i.test(line) ? "defense" : "offense";
        return;
      }
      // "QB- :SIN: Firmy"
      if (tier && (m = line.match(/^([A-Za-z]{2,3})\s*[-–—]\s*(.+)$/))) {
        const code = ((m[2].match(/:([^:\s]+):/) || [])[1] || "").replace(/~\d+$/, "").replace(/\d+$/, "").toUpperCase();
        const typed = m[2].replace(/:[^:\s]+:/g, "").trim();
        if (typed) out.picks.push({ tier, side, pos: m[1].toUpperCase(), team: code, typed, ...matchAllFlagName(typed) });
      }
    });
    return out;
  }

  let afDraft = null; // { text, parsed }

  function allFlagPreview() {
    if (!afDraft) return "";
    const { season, picks } = afDraft.parsed;
    const unsure = picks.filter((p) => !p.sure).length;
    const notes = [];
    if (!picks.length) notes.push(`Couldn't find any picks. Lines should look like "QB- :SIN: Firmy" under a "1st Team All-Flag Offense" heading.`);
    if (!season) notes.push("Couldn't find the season in the post. Type it in the box.");
    if (unsure) notes.push(`<strong>${unsure} name${unsure === 1 ? "" : "s"} to check</strong> (highlighted). Change the name in the box if it's the wrong player.`);
    if (season && (SAVED.allFlag || {})[season]) notes.push(`Saving replaces the Season ${season} All-Flag teams that are already saved.`);
    const groups = [1, 2, 3].flatMap((t) => ["offense", "defense"].map((side) => ({ t, side, rows: picks.map((p, i) => ({ p, i })).filter(({ p }) => p.tier === t && p.side === side) })))
      .filter((g) => g.rows.length);
    return `
      <div class="admin-fields admin-game-pick">
        <label class="field"><span>Season</span><input id="afSeason" class="select af-season-input" inputmode="numeric" value="${season || ""}"></label>
      </div>
      ${notes.length ? `<ul class="admin-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
      ${groups.map((g) => `
        <div class="admin-subhead admin-subhead--small">${AF_TIER[g.t]} Team &middot; ${g.side === "offense" ? "Offense" : "Defense"}</div>
        ${g.rows.map(({ p, i }) => `
          <div class="af-edit-row ${p.sure ? "" : "warn"}">
            <span class="af-pos">${esc(p.pos)}</span>
            <span class="af-edit-team">${esc(p.team || "&ndash;")}</span>
            <input class="af-edit-name" data-af-i="${i}" value="${esc(p.player)}" list="playerNames" aria-label="Player">
            <span class="muted small">${p.typed.toLowerCase() !== p.player.toLowerCase() ? `typed &ldquo;${esc(p.typed)}&rdquo;` : ""}</span>
          </div>`).join("")}`).join("")}
      <datalist id="playerNames">${allPlayerNames().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <div class="admin-actions">
        <button class="btn btn-primary" id="afSave" ${picks.length ? "" : "disabled"}>Save ${picks.length || ""} All-Flag pick${picks.length === 1 ? "" : "s"}</button>
        <button class="btn btn-ghost" id="afClear">Clear</button>
      </div>`;
  }

  function allFlagAdminSection() {
    const seasons = Object.keys(SAVED.allFlag || {}).map(Number).sort((a, b) => b - a);
    return `
      <section>
        <div class="section-head section-head--left"><h2>All-Flag Adder</h2></div>
        <div class="card admin-card">
          <p class="muted small admin-note">Paste the whole All-Flag post from Discord (1st, 2nd and 3rd Team, offense and defense). Check the names in the preview, then save. The teams go on the All-Flag page and on each player's page, and from Season ${LEAGUE.legacy.allFlagCountsFrom || 1} on they add to Legacy (1st Team ${LEAGUE.legacy.points.find((g) => g.codes.includes("FIRST_TEAM")).value} pts, 2nd Team ${LEAGUE.legacy.points.find((g) => g.codes.includes("SECOND_TEAM")).value} pts).</p>
          <textarea id="afPaste" class="admin-textarea" rows="8" placeholder=":UFF: Season 6- All Flags Teams&#10;1st Team All-Flag Offense&#10;QB- :SIN: Firmy&#10;...">${afDraft ? esc(afDraft.text) : ""}</textarea>
          <div id="afPreview">${allFlagPreview()}</div>
        </div>
        ${seasons.length ? `
          <div class="card admin-card admin-list">
            <div class="admin-subhead admin-subhead--small">Saved All-Flag teams</div>
            ${seasons.map((s) => `
              <div class="list-row">
                <span><a class="plink" href="#/allflag/${s}">Season ${s}</a> <span class="muted small">&middot; ${SAVED.allFlag[s].length} picks</span></span>
                <button type="button" class="btn btn-ghost btn-sm" data-af-del="${s}">Delete</button>
              </div>`).join("")}
          </div>` : ""}
      </section>`;
  }

  function transactionsSection() {
    const saved = [...SAVED.updates].sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
    return `
      <section>
        <div class="section-head section-head--left"><h2>Transactions</h2></div>
        <div class="card admin-card">
          <p class="muted small admin-note">Paste signings, offers accepted, demands, releases and promotions straight from Discord (several at once is fine). They go on the Updates page and update team rosters for everyone once you save.</p>
          <textarea id="txPaste" class="admin-textarea" rows="8" placeholder="✍️ Signing&#10;@player has signed with Pittsburg Sentinels!&#10;...">${txDraft ? txDraft.text : ""}</textarea>
          <div id="txPreview">${txPreview()}</div>
        </div>
        ${saved.length ? `
          <div class="update-list admin-list">
            ${saved.map((u) => updateRow(u, `<button class="btn btn-ghost btn-sm" data-del-update="${u.id}">Delete</button>`)).join("")}
          </div>` : ""}
      </section>`;
  }

  function updateTxDraft(text, day) {
    if (!text.trim()) { txDraft = null; return; }
    day = day || (txDraft && txDraft.day) || localDay();
    const draft = (txDraft = { text, day, parsed: parseTransactions(text, day), dupPaste: false });
    recapHash(text).then((h) => {
      if (txDraft !== draft || !SAVED.updates.some((u) => u.sourceHash === h)) return;
      draft.dupPaste = true;
      document.getElementById("txPreview").innerHTML = txPreview();
    }).catch(() => {});
  }

  // Results change standings, stats and awards everywhere, so reload to rebuild it all
  function reloadWithFlash(msg) {
    try { sessionStorage.setItem("uffAdminFlash", msg); } catch (e) {}
    location.reload();
  }
  try {
    adminFlash = sessionStorage.getItem("uffAdminFlash") || "";
    sessionStorage.removeItem("uffAdminFlash");
  } catch (e) {}

  const ADMIN_TABS = [
    ["overview", "Overview", "stats", () => adminOverview()],
    ["stats", "Stat Adder", "scores", () => resultsSection()],
    ["playerstats", "Player Stats", "trend", () => playerStatsAdminSection()],
    ["transactions", "Transactions", "updates", () => transactionsSection()],
    ["teams", "Teams", "teams", () => teamsAdminSection()],
    ["streams", "Live Streams", "live", () => streamsAdminSection()],
    ["vods", "VODs", "play", () => vodsAdminSection()],
    ["playoffs", "Playoffs", "playoff", () => playoffsAdminSection()],
    ["bowls", "Bowl History", "bowl", () => bowlsAdminSection()],
    ["allflag", "All-Flag", "star", () => allFlagAdminSection()],
    ["positions", "Positions", "compare", () => positionsSection()]
  ];
  let adminTab = "overview";

  function adminOverview() {
    const finals = LEAGUE.schedule.reduce((n, w) => n + w.games.filter((g) => Array.isArray(g.score)).length, 0);
    const games = LEAGUE.schedule.reduce((n, w) => n + w.games.length, 0);
    const po = bracket();
    return `
      <div class="stat-chips admin-chips">
        <div class="card stat-chip"><span class="eyebrow">Teams</span><span class="num">${TEAMS.length}</span></div>
        <div class="card stat-chip"><span class="eyebrow">Games final</span><span class="num">${finals} / ${games}</span></div>
        <div class="card stat-chip"><span class="eyebrow">Updates</span><span class="num">${UPDATES.length}</span></div>
        <div class="card stat-chip"><span class="eyebrow">Live streams</span><span class="num">${(SAVED.streams || []).length}</span></div>
        <div class="card stat-chip"><span class="eyebrow">Playoff bracket</span><span class="num">${po ? `${po.rounds.length} round${po.rounds.length === 1 ? "" : "s"}` : "None"}</span></div>
        <div class="card stat-chip"><span class="eyebrow">Legacy players</span><span class="num">${LEAGUE.legacy.players.length}</span></div>
      </div>
      ${activitySection(25)}`;
  }

  function admin() {
    const session = getAdmin();
    const user = session && session.user;
    if (user) {
      const tab = ADMIN_TABS.find(([k]) => k === adminTab) || ADMIN_TABS[0];
      return `
        <div class="wrap admin-page">
          <div class="page-head page-head--row">
            <div>
              <h1>Admin</h1>
              <p class="muted">Logged in as <strong>${esc(user)}</strong></p>
            </div>
            <button class="btn btn-ghost" id="adminLogout">Log out</button>
          </div>
          <nav class="admin-tabs" aria-label="Admin sections">
            ${ADMIN_TABS.map(([k, label, ic]) => `
              <a href="#/admin/${k}" class="admin-tab ${k === tab[0] ? "active" : ""}" ${k === tab[0] ? 'aria-current="page"' : ""}>${icon(ic, "sm")}${label}</a>`).join("")}
          </nav>
          ${flashBox()}
          ${tab[3]()}
        </div>`;
    }
    return `
      <div class="wrap">
        <div class="login-wrap">
          <form class="card login-card" id="adminLogin" autocomplete="on">
            <img src="${LEAGUE.brandLogo}" alt="" class="login-logo">
            <h1>Admin Login</h1>
            <p class="muted">League staff only.</p>
            <label class="field"><span>Username</span><input name="username" autocomplete="username" required></label>
            <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
            <label class="field"><span>Your name <span class="muted">(shows in the activity log)</span></span><input name="name" autocomplete="nickname" maxlength="30" required></label>
            ${adminError ? `<p class="login-error">${adminError}</p>` : ""}
            <button class="btn btn-primary login-btn" type="submit">Log in</button>
          </form>
        </div>
      </div>`;
  }

  /* ---------- Live streams, playoffs, predictions, past bowls ---------- */

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // Logo for any team name: league teams, past teams listed in data.js, otherwise the UFF logo
  function anyTeamLogo(name, size = "") {
    const t = TEAMS.find((x) => x.name === name);
    if (t) return teamLogo(t, size);
    const past = Object.keys(LEAGUE.pastTeams || {}).find((n) => n.toLowerCase() === String(name || "").trim().toLowerCase());
    return past
      ? `<img class="team-logo custom ${size}" src="${LEAGUE.pastTeams[past]}${LEAGUE.logoVersion ? `?v=${LEAGUE.logoVersion}` : ""}" alt="${esc(past)} logo">`
      : `<img class="team-logo ${size}" src="${LEAGUE.brandLogo}" alt="">`;
  }

  // Team name with its logo
  function teamChip(name, size = "") {
    if (!name) return `<span class="team-cell muted">TBD</span>`;
    return `<span class="team-cell">${anyTeamLogo(name, size)}<span>${esc(name)}</span></span>`;
  }

  // YouTube / Twitch link -> embeddable player address (Twitch needs this site's domain)
  function streamEmbed(url) {
    let m;
    const host = location.hostname || "localhost";
    if ((m = url.match(/twitch\.tv\/videos\/(\d+)/i))) return `https://player.twitch.tv/?video=${m[1]}&parent=${host}`;
    if ((m = url.match(/twitch\.tv\/([A-Za-z0-9_]+)/i))) return `https://player.twitch.tv/?channel=${m[1]}&parent=${host}`;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i))) return `https://www.youtube.com/embed/${m[1]}`;
    if ((m = url.match(/youtube\.com\/channel\/(UC[\w-]+)/i))) return `https://www.youtube.com/embed/live_stream?channel=${m[1]}`;
    return null;
  }

  function liveSection() {
    const list = (SAVED.streams || []).map((s) => ({ ...s, embed: streamEmbed(s.url) })).filter((s) => s.embed);
    if (!list.length) return "";
    return `
      <section class="wrap live-wrap">
        <div class="section-head section-head--left"><h2><span class="live-dot"></span>Live Now</h2></div>
        <div class="live-grid">
          ${list.map((s) => `
            <div class="card live-card">
              <div class="live-frame"><iframe src="${esc(s.embed)}" title="${esc(s.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
              <div class="live-title">${esc(s.title)}</div>
            </div>`).join("")}
        </div>
      </section>`;
  }

  // ---- Bracket rules (shared by the Playoff page, Predictions and the admin editor) ----

  // Which side won a real bracket game ("a" / "b"): the "advances" pick, otherwise the higher score
  function winnerSide(g) {
    if ((g.adv === "a" || g.adv === "b") && g[g.adv]) return g.adv;
    const a = Number(g.sa), b = Number(g.sb);
    if (g.sa !== "" && g.sb !== "" && Number.isFinite(a) && Number.isFinite(b) && a !== b && g.a && g.b) return a > b ? "a" : "b";
    return "";
  }
  const gameWinner = (g) => { const s = winnerSide(g); return s ? g[s] : ""; };
  const seedOf = (g, s) => (s === "a" ? g.seedA : g.seedB) || "";

  // Spots in a round that the previous round's winners fill, in order: TBD spots and spots already filled
  // by "Send winners". Each is [game index, "a"|"b", which previous game feeds it].
  function feederSlots(round, r) {
    const out = [];
    if (r === 0) return out;
    let k = 0;
    round.games.forEach((g, gi) => ["a", "b"].forEach((s) => {
      const from = s === "a" ? g.fromA : g.fromB;
      if (from == null && g[s]) return;
      out.push([gi, s, from != null ? from : k]);
      k++;
    }));
    return out;
  }

  // The bracket saved on the Admin page (data.js can also hold one under `playoffs`)
  const bracket = () => {
    const po = SAVED.playoffs || LEAGUE.playoffs;
    return po && po.rounds && po.rounds.length ? po : null;
  };

  // The championship result when the last round is a single decided game
  function bracketFinal() {
    const po = bracket();
    const last = po && po.rounds[po.rounds.length - 1];
    if (!last || last.games.length !== 1) return null;
    const g = last.games[0];
    const win = gameWinner(g);
    if (!win) return null;
    const winA = win === g.a;
    return { champion: win, runnerUp: winA ? g.b : g.a, scoreA: winA ? g.sa : g.sb, scoreB: winA ? g.sb : g.sa };
  }

  function bracketHead(po, sub, showLogo) {
    return `
      <div class="page-head bracket-head">
        ${showLogo && po.logo ? `<img class="bracket-logo" src="${esc(po.logo)}" alt="">` : ""}
        <div>
          <h1>${esc(po.title)}</h1>
          <p class="muted">${sub}</p>
        </div>
      </div>`;
  }

  // Short team name for bracket boxes: the team's code from data.js ("KCJ"), else its nickname
  function teamShort(name) {
    const t = TEAMS.find((x) => x.name === name);
    return t ? t.code || name.split(" ").pop() : name;
  }
  // A bracket box filled with the team's color, its text in the team's secondary color (both in data.js);
  // teams without a secondary color get dark or white text, whichever reads better
  function teamTint(name) {
    const t = name && TEAMS.find((x) => x.name === name);
    if (!name) return { cls: "tbd", style: "" };
    if (!t || !/^#[0-9a-f]{6}$/i.test(t.color || "")) return { cls: "", style: "" };
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(t.color.slice(i, i + 2), 16));
    const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
    const ink = /^#[0-9a-f]{6}$/i.test(t.color2 || "") ? t.color2 : light ? "#1a1f3d" : "#ffffff";
    return { cls: "tinted", style: `--team:${t.color};--team-ink:${ink}` };
  }

  function bracketTeam(name, seed) {
    if (!name) return `<span class="team-cell muted">${seed ? `<span class="seed">${esc(seed)}</span>` : ""}TBD</span>`;
    return `<span class="team-cell" title="${esc(name)}">${anyTeamLogo(name)}${seed ? `<span class="seed">${esc(seed)}</span>` : ""}<span>${esc(teamShort(name))}</span></span>`;
  }

  // Lays a bracket out. When the last round is one game and every round before it splits evenly,
  // the first half of each round goes on the left, the second half on the right (mirrored), and the
  // final sits in the middle under the bowl logo. Otherwise rounds just go left to right.
  function bracketBoard(po, rounds, match, champ) {
    const last = rounds.length - 1;
    const split = rounds.length >= 2 && rounds[last].games.length === 1 && rounds.slice(0, -1).every((r) => r.games.length && r.games.length % 2 === 0);
    const col = (r, from, to, cls = "") => `
      <div class="bracket-round ${cls}">
        <div class="bracket-round-name">${esc(rounds[r].name)}</div>
        <div class="bracket-games">${rounds[r].games.slice(from, to).map((g, i) => match(g, r, from + i)).join("")}</div>
      </div>`;
    if (!split) {
      return `
        <div class="bracket">
          ${rounds.map((round, r) => col(r, 0, round.games.length)).join("")}
          ${champ ? `<div class="bracket-round bracket-round--champ"><div class="bracket-round-name">Champion</div><div class="bracket-games">${po.logo ? `<img class="bracket-center-logo" src="${esc(po.logo)}" alt="">` : ""}${champ}</div></div>` : ""}
        </div>`;
    }
    const sides = rounds.slice(0, -1).map((round, r) => r);
    return `
      <p class="bracket-swipe">Swipe sideways to see the whole bracket &rarr;</p>
      <div class="bracket bracket--split">
        ${sides.map((r) => col(r, 0, rounds[r].games.length / 2, "bracket-round--left")).join("")}
        <div class="bracket-center">
          ${po.logo ? `<img class="bracket-center-logo" src="${esc(po.logo)}" alt="${esc(rounds[last].name)} logo">` : ""}
          <div class="bracket-round-name">${esc(rounds[last].name)}</div>
          ${match(rounds[last].games[0], last, 0)}
          ${champ || ""}
        </div>
        ${sides.slice().reverse().map((r) => col(r, rounds[r].games.length / 2, rounds[r].games.length, "bracket-round--right")).join("")}
      </div>`;
  }

  function playoffPage() {
    const po = bracket();
    if (!po) return `<div class="wrap">${pageHead("Playoff")}${empty("Coming soon", "The playoff bracket will be revealed later in the season.")}</div>`;
    const final = bracketFinal();
    const match = (g) => {
      const win = winnerSide(g);
      const row = (s) => {
        const tint = teamTint(g[s]);
        return `
        <div class="match-team ${tint.cls} ${win === s ? "win" : win ? "lose" : ""}" style="${tint.style}">
          ${bracketTeam(g[s], seedOf(g, s))}<span class="match-score">${esc(s === "a" ? g.sa : g.sb)}</span>
        </div>`;
      };
      return `<div class="card match">${row("a")}${row("b")}</div>`;
    };
    const champ = `
      <div class="card bracket-champ">
        <span class="eyebrow">Champion</span>
        ${final ? bracketTeam(final.champion) : `<span class="muted">To be decided</span>`}
      </div>`;
    return `
      <div class="wrap">
        ${bracketHead(po, `Season ${LEAGUE.season} playoff bracket`)}
        ${bracketBoard(po, po.rounds, match, champ)}
      </div>`;
  }

  // ---- Predictions: each visitor's own picks, saved only in their browser ----

  // The bracket with this visitor's picks carried forward round by round
  function predictedRounds(po, picks) {
    const rounds = [];
    po.rounds.forEach((round, r) => {
      const games = round.games.map((g) => ({ a: g.a, b: g.b, seedA: g.seedA || "", seedB: g.seedB || "" }));
      if (r > 0) feederSlots(round, r).forEach(([gi, s, k]) => {
        const prev = rounds[r - 1].games[k] || {};
        games[gi][s] = prev.pick || "";
        games[gi][s === "a" ? "seedA" : "seedB"] = prev.pick ? (prev.pick === prev.a ? prev.seedA : prev.seedB) : "";
      });
      games.forEach((g, gi) => {
        const p = picks[`${r}-${gi}`];
        g.pick = p && (p === g.a || p === g.b) ? p : "";
        g.real = gameWinner(round.games[gi]);
      });
      rounds.push({ name: round.name, games });
    });
    return rounds;
  }

  // Each visitor picks their own playoff field: 7 seeds per conference, then winners. Saved only on this device.
  // When a playoff bracket is posted, everyone predicts that bracket; otherwise they pick their own 14 teams first.
  // Each has its own saved picks.
  const PRED_SEEDS = 7;
  // true = before a bracket is posted, people can pick their own 14 teams and predict those; false = "coming soon"
  const PRED_OWN_TEAMS = false;
  const predKey = () => (bracket() ? `uffPredictions:S${LEAGUE.season}:${bracket().title}` : `uffPredictions:S${LEAGUE.season}`);
  function loadPred() {
    try { const s = JSON.parse(localStorage.getItem(predKey())); if (s) return { seeds: {}, picks: {}, locked: false, ...s }; } catch (e) {}
    return { seeds: {}, picks: {}, locked: false };
  }
  function savePred(state) {
    try { localStorage.setItem(predKey(), JSON.stringify(state)); } catch (e) {}
  }
  const predSeedsDone = (state) => LEAGUE.conferences.every((c) => (state.seeds[c.name] || []).filter(Boolean).length === PRED_SEEDS);

  // The 7-team-per-conference bracket: #1 gets a bye; Wild Card 4v5, 2v7, 3v6; Divisional #1 vs the 4/5 winner,
  // 2/7 winner vs 3/6 winner; then Conference Finals and the Bowl. First conference on the left, second on the right.
  function predictionBracket(seeds) {
    const game = (a, sa, b, sb) => ({ a: a || "", seedA: a ? String(sa) : "", b: b || "", seedB: b ? String(sb) : "", sa: "", sb: "", adv: "", fromA: null, fromB: null });
    const tbd = () => game("", 0, "", 0);
    const sides = LEAGUE.conferences.slice(0, 2).map((c) => seeds[c.name] || []);
    return {
      title: `Season ${LEAGUE.season} Playoff Predictions`,
      logo: (LEAGUE.bowlLogos || {})[LEAGUE.season] || "",
      rounds: [
        { name: "Wild Card", games: sides.flatMap((S) => [game(S[3], 4, S[4], 5), game(S[1], 2, S[6], 7), game(S[2], 3, S[5], 6)]) },
        { name: "Divisional", games: sides.flatMap((S) => [game(S[0], 1, "", 0), tbd()]) },
        { name: "Conference Finals", games: [tbd(), tbd()] },
        { name: `United Flag Bowl ${roman(LEAGUE.season)}`, games: [tbd()] }
      ]
    };
  }

  // Teams in a conference ordered like the standings (most wins, then point differential)
  const standingsOrder = (conf) => TEAMS.filter((t) => t.conference === conf)
    .sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa) || a.name.localeCompare(b.name));

  function predictionsPage() {
    const state = loadPred();
    const official = bracket();
    if (!official && !PRED_OWN_TEAMS) {
      return `<div class="wrap">${pageHead("Predictions")}${empty("Predictions open soon", "Once the playoff bracket is posted you can pick who wins every game here.")}</div>`;
    }
    const done = official || predSeedsDone(state);
    const seedPicker = `
      <div class="card admin-card pred-seeds">
        <div class="admin-subhead">1. Pick your playoff teams<span class="muted small">${PRED_SEEDS} per conference</span></div>
        <div class="pred-seed-cols">
          ${LEAGUE.conferences.map((c) => {
            const chosen = state.seeds[c.name] || [];
            return `
              <div>
                <div class="admin-subhead admin-subhead--small">${esc(c.name)}</div>
                ${Array.from({ length: PRED_SEEDS }, (_, i) => `
                  <label class="pred-seed">
                    <span class="pred-seed-num">#${i + 1}</span>
                    <select class="select" data-seed-conf="${esc(c.name)}" data-seed-i="${i}" ${state.locked ? "disabled" : ""}>
                      <option value="">Pick a team</option>
                      ${TEAMS.filter((t) => t.conference === c.name && (t.name === chosen[i] || !chosen.includes(t.name))).map((t) =>
                        `<option value="${esc(t.name)}" ${t.name === chosen[i] ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
                    </select>
                  </label>`).join("")}
              </div>`;
          }).join("")}
        </div>
        ${state.locked ? "" : `<div class="admin-actions"><button class="btn btn-ghost btn-sm" id="predStandings">Fill from current standings</button></div>`}
      </div>`;
    const head = `
      <div class="page-head">
        <h1>${official ? esc(official.title.replace(/Playoffs?$/i, "").trim() || "Playoff") + " Predictions" : "Predictions"}</h1>
        <p class="muted">${official
          ? "Pick who wins every game, all the way to the United Flag Bowl."
          : `Pick your ${PRED_SEEDS * LEAGUE.conferences.length} playoff teams, then who wins every game.`} Only you can see your picks; they're saved on this device.</p>
      </div>`;
    if (!done) return `<div class="wrap">${head}${seedPicker}</div>`;

    // The posted playoff bracket, or the one built from this person's own 14 teams
    const po = official || predictionBracket(state.seeds);
    const rounds = predictedRounds(po, state.picks);
    const last = rounds[rounds.length - 1];
    const champ = last && last.games.length === 1 ? last.games[0].pick : "";
    const made = rounds.reduce((n, r) => n + r.games.filter((g) => g.pick).length, 0);
    const total = rounds.reduce((n, r) => n + r.games.length, 0);
    // Once a game on the posted bracket is decided, picks get a check or a cross (g.real = the actual winner)
    const team = (g, s, r, gi) => {
      const name = g[s];
      const picked = name && g.pick === name;
      const mark = !picked || !g.real ? "" : g.real === name ? `<span class="pick-mark ok">&#10003;</span>` : `<span class="pick-mark bad">&#10007;</span>`;
      // A game can be picked once both of its teams are known
      const tint = teamTint(name);
      return `<button type="button" class="match-team pick ${tint.cls} ${picked ? "picked" : g.pick ? "faded" : ""}" style="${tint.style}" data-pick="${r}-${gi}" data-team="${esc(name)}" ${!g.a || !g.b || state.locked ? "disabled" : ""}>${bracketTeam(name, seedOf(g, s))}${mark}</button>`;
    };
    const match = (g, r, gi) => `<div class="card match">${team(g, "a", r, gi)}${team(g, "b", r, gi)}</div>`;
    const champBox = `
      <div class="card bracket-champ">
        <span class="eyebrow">Your champion</span>
        ${champ ? bracketTeam(champ) : `<span class="muted">Pick a winner</span>`}
      </div>`;
    return `
      <div class="wrap">
        ${head}
        ${official ? "" : `${seedPicker}<div class="admin-subhead pred-step">2. Pick your winners</div>`}
        <div class="pred-bar">
          <span class="pill">${made} / ${total} picks</span>
          ${state.locked ? `<span class="pill pill-navy">Final picks &middot; locked</span>` : ""}
          <span class="pred-actions">
            <button class="btn btn-ghost btn-sm" id="predLock">${state.locked ? "Edit picks" : "Lock in picks"}</button>
            <button class="btn btn-ghost btn-sm" id="predReset" ${state.locked ? "disabled" : ""}>Reset</button>
          </span>
        </div>
        ${bracketBoard(po, rounds, match, champBox)}
      </div>`;
  }

  // ---- Past United Flag Bowls ----

  const roman = (n) => [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]].reduce((out, [v, s]) => { while (n >= v) { out += s; n -= v; } return out; }, "");

  function bowlsPage() {
    const rows = [];
    for (let s = LEAGUE.season; s >= 1; s--) {
      let b = (SAVED.bowls || {})[s];
      let fromBracket = false;
      if ((!b || !b.champion) && s === LEAGUE.season && bracketFinal()) { b = bracketFinal(); fromBracket = true; }
      if (b && (b.champion || b.runnerUp)) rows.push({ s, ...b, fromBracket });
    }
    return `
      <div class="wrap">
        <div class="page-head">
          <h1 class="title-icon">${icon("bowl")}Past Bowls</h1>
          <p class="muted">Every United Flag Bowl champion.</p>
        </div>
        ${rows.length ? `<div class="bowl-list">${rows.map((b) => `
          <div class="card bowl-card">
            <div class="bowl-head"><span class="bowl-name">United Flag Bowl ${roman(b.s)}</span><span class="pill">Season ${b.s}</span></div>
            <div class="bowl-body">
              <div class="bowl-side bowl-side--win"><span class="eyebrow">Champion</span>${teamChip(b.champion, "lg")}</div>
              <div class="bowl-mid">
                ${(LEAGUE.bowlLogos || {})[b.s] ? `<img class="bowl-logo" src="${LEAGUE.bowlLogos[b.s]}?v=${LEAGUE.logoVersion || ""}" alt="United Flag Bowl ${roman(b.s)} logo" loading="lazy">` : ""}
                <div class="bowl-score">${b.scoreA || b.scoreB ? `${esc(b.scoreA)}<span class="muted">&ndash;</span>${esc(b.scoreB)}` : `<span class="muted">def.</span>`}</div>
              </div>
              <div class="bowl-side"><span class="eyebrow">Runner-up</span>${teamChip(b.runnerUp, "lg")}</div>
            </div>
          </div>`).join("")}</div>`
          : empty("No bowls recorded yet", "United Flag Bowl results will show up here.")}
      </div>`;
  }

  // ---- Admin: live streams, playoff editor, bowl history, activity log ----

  function streamsAdminSection() {
    const list = SAVED.streams || [];
    return `
      <section>
        <div class="section-head section-head--left"><h2>Live Streams</h2></div>
        <form class="card admin-card" id="streamForm" autocomplete="off">
          <p class="muted small admin-note">Add a YouTube or Twitch link and it plays at the top of the home page. Twitch channel (twitch.tv/name), YouTube video or stream (watch?v=... or youtu.be/...), or a YouTube /channel/UC... link. Pick the game to also put a <strong>Watch live</strong> button next to its box score that plays the stream right in the game card. When the broadcast ends, <strong>End &mdash; keep on game</strong> takes it off the home page but leaves it on the game card as the replay (best with a past-broadcast link like twitch.tv/videos/...; a channel link only shows the channel). <strong>Remove</strong> deletes it.</p>
          <div class="admin-fields">
            <label class="field admin-grow"><span>Title</span><input name="title" maxlength="80" placeholder="Week 3 · Jazz vs Samurai" required></label>
            <label class="field admin-grow"><span>YouTube or Twitch link</span><input name="url" placeholder="https://www.twitch.tv/..." required></label>
          </div>
          <div class="admin-fields">
            <label class="field admin-grow"><span>Game (optional)</span>${gamePicker()}</label>
            <button class="btn btn-primary" type="submit">Add live stream</button>
          </div>
          <div class="admin-subhead admin-subhead--small">On the home page now (${list.length})</div>
          ${list.length ? list.map((s) => `
            <div class="list-row">
              <div><strong>${esc(s.title)}</strong><div class="muted small">${[s.gameId && gameLabel(s.gameId), esc(s.url)].filter(Boolean).join(" &middot; ")}</div></div>
              <span class="stream-actions">
                ${s.gameId ? `<button type="button" class="btn btn-primary btn-sm" data-del-stream="${esc(s.id)}" data-keep title="Off the home page; stays on the game card as its replay">End &mdash; keep on game</button>` : ""}
                <button type="button" class="btn btn-ghost btn-sm" data-del-stream="${esc(s.id)}">Remove</button>
              </span>
            </div>`).join("") : `<p class="muted small">No live streams added.</p>`}
        </form>
      </section>`;
  }

  // ---- Admin: teams ----

  let teamEditKey = null; // the team being edited (its original name), or "+new"
  let teamLogoDraft = null;
  const teamPlaces = () => LEAGUE.conferences.flatMap((c) => c.divisions.map((d) => [c.name, d.name]));

  function teamsAdminSection() {
    const edits = SAVED.teams || {};
    const isNew = teamEditKey === "+new";
    const t = isNew ? null : TEAMS.find((x) => x.key === teamEditKey);
    const logo = teamLogoDraft != null ? teamLogoDraft : t ? t.logo || "" : "";
    const place = t ? `${t.conference}||${t.division}` : "";
    return `
      <section>
        <div class="section-head section-head--left"><h2>Teams</h2></div>
        <div class="team-admin">
          <div class="card admin-card team-admin-list">
            <button type="button" class="btn btn-primary team-new" id="teamNew">+ New team</button>
            ${LEAGUE.conferences.map((c) => `
              <div class="admin-subhead admin-subhead--small">${esc(c.name)}</div>
              ${TEAMS.filter((x) => x.conference === c.name).map((x) => `
                <button type="button" class="team-pick ${x.key === teamEditKey ? "active" : ""}" data-team-pick="${esc(x.key)}">
                  ${teamLogo(x)}<span>${esc(x.name)}</span>${x.key in edits ? `<span class="pill">Edited</span>` : ""}
                </button>`).join("")}`).join("")}
          </div>
          <div class="card admin-card">
            ${t || isNew ? `
              <form id="teamForm" autocomplete="off">
                <div class="admin-subhead">${isNew ? "New team" : esc(t.name)}</div>
                ${t ? `<p class="muted small admin-note">Record ${t.w}-${t.l} &middot; PF ${t.pf} &middot; PA ${t.pa}. Records come from game results automatically.</p>` : ""}
                <div class="team-logo-edit">
                  ${logo ? `<img src="${esc(logo)}" alt="">` : `<span class="po-logo-empty">?</span>`}
                  <label class="btn btn-ghost btn-sm">Upload logo<input type="file" id="teamLogoFile" accept="image/*" hidden></label>
                </div>
                <div class="admin-fields">
                  <label class="field admin-grow"><span>Team name</span><input name="name" value="${esc(t ? t.name : "")}" maxlength="60" required></label>
                  <label class="field"><span>Short code</span><input name="code" value="${esc(t ? t.code || "" : "")}" maxlength="5" placeholder="KCJ"></label>
                  <label class="field admin-grow"><span>Head coach</span><input name="coach" value="${esc(t ? t.coach || "" : "")}" maxlength="40" list="playerNames"></label>
                  <label class="field"><span>Main color</span><input type="color" name="color" class="color-input" value="${esc(t && t.color ? t.color : "#1f2547")}"></label>
                  <label class="field"><span>Secondary color</span><input type="color" name="color2" class="color-input" value="${esc(t && t.color2 ? t.color2 : "#ffffff")}"></label>
                  <label class="field admin-grow"><span>Conference &middot; Division</span>
                    <select name="place" class="select" required>
                      ${teamPlaces().map(([c, d]) => `<option value="${esc(`${c}||${d}`)}" ${`${c}||${d}` === place ? "selected" : ""}>${esc(c)} &middot; ${esc(d)}</option>`).join("")}
                    </select>
                  </label>
                </div>
                <datalist id="playerNames">${knownPlayers().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
                <div class="admin-actions">
                  <button class="btn btn-primary" type="submit">Save team</button>
                  ${t && t.key in edits ? `<button type="button" class="btn btn-ghost" id="teamReset">${t.key.startsWith("+") ? "Remove team" : "Undo my changes"}</button>` : ""}
                </div>
                <p class="muted small">Renaming a team keeps its transactions, games and playoff spots.</p>
              </form>` : `<p class="muted">Pick a team on the left to edit it, or add a new one.</p>`}
          </div>
        </div>
      </section>`;
  }

  // ---- Admin: hand-edited player stats ----

  const STAT_EDIT = {
    passing: [["comp", "CMP"], ["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["int", "INT"], ["lng", "LNG"], ["sacked", "SCKD"]],
    rushing: [["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["fum", "FUM"], ["lng", "LNG"], ["pre", "PRE"]],
    receiving: [["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"], ["lng", "LNG"]],
    defense: [["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["saf", "SAF"], ["swat", "SWAT"], ["int", "INT"], ["pbu", "PBU"], ["pre", "PRE"], ["td", "TD"]]
  };
  let statsEditName = "";

  function playerStatsAdminSection() {
    const name = statsEditName;
    const key = name.toLowerCase();
    const edit = name && statEditFor(name);
    const rows = Object.fromEntries(Object.keys(STAT_EDIT).map((g) => [g, BOX_TOTALS[g][key] || {}]));
    const gp = edit && edit.gp != null ? edit.gp : Math.max(0, ...Object.values(rows).map((r) => r.gp || 0));
    const editedNames = Object.keys(SAVED.statEdits || {}).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return `
      <section>
        <div class="section-head section-head--left"><h2>Player Stats &middot; Season ${LEAGUE.season}</h2></div>
        <form class="card admin-card" id="statPick" autocomplete="off">
          <p class="muted small admin-note">Fix a player's Season ${LEAGUE.season} totals by hand if a recap was wrong. What you save replaces their totals from the box scores on the Stats page, leaders, award candidates, records and their player page. Undo it any time to go back to the box scores.</p>
          <div class="admin-fields">
            <label class="field admin-grow"><span>Player</span><input name="player" value="${esc(name)}" list="playerNames" required></label>
            <button class="btn btn-primary" type="submit">Load stats</button>
          </div>
          <datalist id="playerNames">${knownPlayers().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        </form>
        ${name ? `
          <form class="card admin-card admin-list" id="statForm" autocomplete="off">
            <div class="admin-subhead">${esc(name)}${edit ? `<span class="pill">Edited by hand</span>` : `<span class="muted small">from box scores</span>`}</div>
            <div class="stat-edit-group">
              <label class="field"><span>Games</span><input name="gp" value="${gp}" inputmode="numeric"></label>
            </div>
            ${Object.entries(STAT_EDIT).map(([g, cols]) => `
              <div class="admin-subhead admin-subhead--small">${BOX[g].label}</div>
              <div class="stat-edit-group">
                ${cols.map(([f, h]) => `<label class="field"><span>${h}</span><input name="${g}.${f}" value="${rows[g][f] || 0}" inputmode="decimal"></label>`).join("")}
              </div>`).join("")}
            <div class="admin-actions">
              <button class="btn btn-primary" type="submit">Save stats</button>
              ${edit ? `<button type="button" class="btn btn-ghost" id="statReset">Undo &mdash; use the box scores</button>` : ""}
            </div>
          </form>` : ""}
        ${editedNames.length ? `
          <div class="card admin-card admin-list">
            <div class="admin-subhead admin-subhead--small">Edited by hand (${editedNames.length})</div>
            ${editedNames.map((n) => `<div class="list-row"><span>${playerLink(n)}</span><button type="button" class="btn btn-ghost btn-sm" data-stat-load="${esc(n)}">Edit</button></div>`).join("")}
          </div>` : ""}
      </section>`;
  }

  // ---- VODs ----

  const ytId = (url) => {
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
    return m ? m[1] : null;
  };
  const gameLabel = (id) => {
    const e = allGames().find(({ g }) => g.id === id);
    return e ? `Week ${e.wk.week} &middot; ${esc(e.g.teams[0])} vs ${esc(e.g.teams[1])}` : id ? esc(id) : "";
  };

  // Every scheduled game, by week, for tying a stream or VOD to a game
  const gamePicker = () => `
    <select name="gameId" class="select">
      <option value="">Not tied to a game</option>
      ${LEAGUE.schedule.map((wk) => `<optgroup label="Week ${wk.week}">${wk.games.map((g) => `<option value="${esc(g.id)}">${esc(g.id)} &middot; ${esc(g.teams[0])} vs ${esc(g.teams[1])}</option>`).join("")}</optgroup>`).join("")}
    </select>`;

  function vodsAdminSection() {
    const list = SAVED.vods || [];
    return `
      <section>
        <div class="section-head section-head--left"><h2>VODs</h2></div>
        <form class="card admin-card" id="vodForm" autocomplete="off">
          <p class="muted small admin-note">Add YouTube videos or Twitch past broadcasts and clips. Pick the game to put a <strong>Stream</strong> button next to its box score that plays the video right in the game card. Every VOD is also listed on the VODs page, newest first.</p>
          <div class="admin-fields">
            <label class="field admin-grow"><span>Title</span><input name="title" maxlength="80" placeholder="Week 1 · Jazz vs Samurai" required></label>
            <label class="field admin-grow"><span>YouTube or Twitch link</span><input name="url" placeholder="https://www.youtube.com/watch?v=..." required></label>
          </div>
          <div class="admin-fields">
            <label class="field admin-grow"><span>Game (optional)</span>${gamePicker()}</label>
            <label class="field admin-grow"><span>Note (optional)</span><input name="note" maxlength="80" placeholder="Season 7 · Week 1"></label>
            <button class="btn btn-primary" type="submit">Add VOD</button>
          </div>
          <div class="admin-subhead admin-subhead--small">Added VODs (${list.length})</div>
          ${list.length ? list.map((v) => `
            <div class="list-row">
              <div><strong>${esc(v.title)}</strong><div class="muted small">${[v.gameId && gameLabel(v.gameId), esc(v.note || ""), esc(v.url)].filter(Boolean).join(" &middot; ")}</div></div>
              <button type="button" class="btn btn-ghost btn-sm" data-del-vod="${esc(v.id)}">Remove</button>
            </div>`).join("") : `<p class="muted small">No VODs added yet.</p>`}
        </form>
      </section>`;
  }

  function vodsPage() {
    const list = SAVED.vods || [];
    return `
      <div class="wrap">
        ${pageHead("VODs", "Game replays and highlights, newest first.")}
        ${list.length ? `<div class="vod-grid">${list.map((v) => {
          const yt = ytId(v.url);
          return `
            <a class="card vod-card" href="${esc(v.url)}" target="_blank" rel="noopener">
              <div class="vod-thumb">${yt ? `<img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy">` : ""}<span class="vod-play">&#9654;</span></div>
              <div class="vod-body">
                <div class="vod-title">${esc(v.title)}</div>
                <div class="muted small">${[v.gameId && gameLabel(v.gameId), esc(v.note || ""), v.at && fmtDate(new Date(v.at).toLocaleDateString("en-CA"))].filter(Boolean).join(" &middot; ")}</div>
              </div>
            </a>`;
        }).join("")}</div>` : empty("No VODs yet", "Game replays and highlights will show up here.")}
      </div>`;
  }

  let poDraft = null;
  const newGame = () => ({ a: "", b: "", sa: "", sb: "", seedA: "", seedB: "", adv: "", fromA: null, fromB: null });
  const emptyBracket = () => ({ title: `Season ${LEAGUE.season} Playoffs`, logo: (LEAGUE.bowlLogos || {})[LEAGUE.season] || "", rounds: [] });
  const draftPlayoffs = () => (poDraft = poDraft || (bracket() ? clone(bracket()) : emptyBracket()));

  function playoffEditor() {
    const d = draftPlayoffs();
    const opts = (val) => {
      const names = TEAMS.map((t) => t.name);
      if (val && !names.includes(val)) names.push(val);
      return `<option value="">TBD</option>${names.map((n) => `<option value="${esc(n)}" ${n === val ? "selected" : ""}>${esc(n)}</option>`).join("")}`;
    };
    return `
      <div class="admin-fields">
        <label class="field admin-grow"><span>Bracket title</span><input data-po-title value="${esc(d.title)}" maxlength="80"></label>
        <div class="po-logo">
          ${d.logo ? `<img src="${d.logo}" alt="">` : `<span class="po-logo-empty">${icon("awards")}</span>`}
          <label class="btn btn-ghost btn-sm">Upload logo<input type="file" id="poLogo" accept="image/*" hidden></label>
          ${d.logo ? `<button type="button" class="btn btn-ghost btn-sm" data-po-act="removeLogo">Remove logo</button>` : ""}
        </div>
      </div>
      ${d.rounds.map((round, r) => `
        <div class="po-round">
          <div class="po-round-head">
            <input class="po-input" data-po-round="${r}" value="${esc(round.name)}" maxlength="40" aria-label="Round name">
            <button type="button" class="btn btn-ghost btn-sm" data-po-act="addGame" data-r="${r}">+ Add game</button>
            <button type="button" class="btn btn-ghost btn-sm" data-po-act="send" data-r="${r}">Send winners to next round</button>
            <button type="button" class="btn btn-ghost btn-sm" data-po-act="delRound" data-r="${r}">Delete round</button>
          </div>
          ${round.games.length ? round.games.map((g, gi) => `
            <div class="po-game">
              <input class="po-score po-seed" data-r="${r}" data-g="${gi}" data-po-f="seedA" value="${esc(g.seedA || "")}" maxlength="3" placeholder="#" aria-label="Seed" title="Seed">
              <select class="select" data-r="${r}" data-g="${gi}" data-po-f="a">${opts(g.a)}</select>
              <input class="po-score" data-r="${r}" data-g="${gi}" data-po-f="sa" value="${esc(g.sa)}" inputmode="numeric" maxlength="4" aria-label="Score">
              <span class="muted small">vs</span>
              <input class="po-score" data-r="${r}" data-g="${gi}" data-po-f="sb" value="${esc(g.sb)}" inputmode="numeric" maxlength="4" aria-label="Score">
              <select class="select" data-r="${r}" data-g="${gi}" data-po-f="b">${opts(g.b)}</select>
              <input class="po-score po-seed" data-r="${r}" data-g="${gi}" data-po-f="seedB" value="${esc(g.seedB || "")}" maxlength="3" placeholder="#" aria-label="Seed" title="Seed">
              <select class="select" data-r="${r}" data-g="${gi}" data-po-f="adv">
                <option value="">Advances: choose...</option>
                <option value="a" ${g.adv === "a" ? "selected" : ""}>${esc(g.a || "Team 1")} advances</option>
                <option value="b" ${g.adv === "b" ? "selected" : ""}>${esc(g.b || "Team 2")} advances</option>
              </select>
              <button type="button" class="btn btn-ghost btn-sm" data-po-act="delGame" data-r="${r}" data-g="${gi}" aria-label="Remove game">&#10005;</button>
            </div>`).join("") : `<p class="muted small">No games yet.</p>`}
        </div>`).join("")}
      <div class="admin-actions">
        <button type="button" class="btn btn-ghost" data-po-act="addRound">+ Add round</button>
        <button type="button" class="btn btn-primary" data-po-act="save">Save playoffs</button>
        ${d.rounds.length ? `<button type="button" class="btn btn-ghost" data-po-act="clear">Clear bracket</button>` : ""}
      </div>`;
  }

  function playoffsAdminSection() {
    return `
      <section>
        <div class="section-head section-head--left"><h2>Playoffs &middot; Season ${LEAGUE.season}</h2></div>
        <div class="card admin-card">
          <p class="muted small admin-note">Build the bracket round by round: add games, pick the two teams, type the score if you like, then choose who advances. Leave a spot as <strong>TBD</strong> for the winner of the round before, and <strong>Send winners to next round</strong> fills those in (a game with no pick uses the higher score). Press <strong>Save playoffs</strong> to publish it on the Playoff page; Predictions use the same bracket.</p>
          <div id="poEditor">${playoffEditor()}</div>
        </div>
      </section>`;
  }

  // Fill the next round's TBD spots with this round's winners (or make the next round)
  function sendWinners(r) {
    const d = draftPlayoffs();
    // Each winner keeps its seed as it moves on
    const winners = d.rounds[r].games.map((g) => { const s = winnerSide(g); return s ? { team: g[s], seed: seedOf(g, s) } : null; });
    let next = d.rounds[r + 1];
    if (!next) {
      next = { name: `Round ${r + 2}`, games: [] };
      for (let k = 0; k < winners.length; k += 2) {
        const [wa, wb] = [winners[k], winners[k + 1]];
        next.games.push({ ...newGame(), a: wa ? wa.team : "", seedA: wa ? wa.seed : "", b: wb ? wb.team : "", seedB: wb ? wb.seed : "", fromA: k, fromB: k + 1 < winners.length ? k + 1 : null });
      }
      d.rounds.push(next);
      return;
    }
    feederSlots(next, r + 1).forEach(([gi, s, k]) => {
      if (!winners[k]) return;
      next.games[gi][s] = winners[k].team;
      next.games[gi][s === "a" ? "seedA" : "seedB"] = winners[k].seed;
      next.games[gi][s === "a" ? "fromA" : "fromB"] = k;
    });
  }

  let bowlDraft = null;
  function bowlsAdminSection() {
    bowlDraft = bowlDraft || clone(SAVED.bowls || {});
    const seasons = Array.from({ length: LEAGUE.season }, (_, i) => LEAGUE.season - i);
    const val = (s, f) => esc((bowlDraft[s] || {})[f] || "");
    return `
      <section>
        <div class="section-head section-head--left"><h2>United Flag Bowl History</h2></div>
        <div class="card admin-card">
          <p class="muted small admin-note">Type the champion and runner-up for any season. It shows on the Past Bowls page. Leave Season ${LEAGUE.season}'s champion empty to use the playoff bracket's result.</p>
          <div class="bowl-admin">
            ${seasons.map((s) => `
              <div class="bowl-admin-row">
                <strong>S${s}</strong>
                <input data-bowl="${s}" data-bowl-f="champion" value="${val(s, "champion")}" placeholder="Champion" maxlength="60" aria-label="Season ${s} champion">
                <input data-bowl="${s}" data-bowl-f="runnerUp" value="${val(s, "runnerUp")}" placeholder="Runner-up" maxlength="60" aria-label="Season ${s} runner-up">
                <input data-bowl="${s}" data-bowl-f="scoreA" value="${val(s, "scoreA")}" placeholder="Score" maxlength="4" inputmode="numeric" aria-label="Champion score">
                <input data-bowl="${s}" data-bowl-f="scoreB" value="${val(s, "scoreB")}" placeholder="Score" maxlength="4" inputmode="numeric" aria-label="Runner-up score">
              </div>`).join("")}
          </div>
          <div class="admin-actions"><button type="button" class="btn btn-primary" id="bowlSave">Save bowl history</button></div>
        </div>
      </section>`;
  }

  const ACTIVITY_LABELS = {
    saveResult: "Results", deleteResult: "Results", saveUpdates: "Transactions", deleteUpdate: "Transactions",
    setPosition: "Positions", addStream: "Live stream", removeStream: "Live stream", savePlayoffs: "Playoffs", saveBowls: "Bowl history", saveSchedule: "Schedule",
    saveTeam: "Teams", removeTeam: "Teams", setStats: "Player stats", addVod: "VODs", removeVod: "VODs"
  };
  function activitySection(limit = 100) {
    return `
      <section>
        <div class="section-head section-head--left"><h2>Recent Activity</h2></div>
        <div class="card list-card" id="activityList" data-limit="${limit}"><p class="muted admin-pad">Loading...</p></div>
      </section>`;
  }
  async function loadActivity() {
    const box = document.getElementById("activityList");
    if (!box) return;
    try {
      const { activity } = await adminCall({ action: "activity" });
      const list = (activity || []).slice(0, Number(box.dataset.limit) || 100);
      if (!document.body.contains(box)) return;
      box.innerHTML = list.length ? list.map((a) => `
        <div class="activity-row">
          <div>
            <span class="eyebrow">${esc(ACTIVITY_LABELS[a.action] || a.action)}</span>
            <div class="activity-text">${esc(a.text)}</div>
            <div class="muted small">by ${esc(a.by)}</div>
          </div>
          <span class="muted small activity-time">${new Date(a.at).toLocaleString()}</span>
        </div>`).join("") : `<p class="muted admin-pad">Nothing yet. Admin saves will be listed here.</p>`;
    } catch (err) {
      box.innerHTML = `<p class="login-error admin-pad">${esc(err.message)}</p>`;
    }
  }

  // Shrink an uploaded logo so it stays small enough to save
  function shrinkImage(file, max = 256) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("That file isn't an image."));
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- Build a Team: spin for legends, draft them into a 7v7 offense, play a 9-game season ---------- */

  const BT_SLOTS = [
    { id: "QB", label: "QB", side: "off", group: "QB", weight: 2 },
    { id: "WR1", label: "WR", side: "off", group: "WR" }, { id: "WR2", label: "WR", side: "off", group: "WR" },
    { id: "WR3", label: "WR", side: "off", group: "WR" }, { id: "WR4", label: "WR", side: "off", group: "WR" },
    { id: "WR5", label: "WR", side: "off", group: "WR" },
    { id: "TE", label: "TE", side: "off", group: "TE" }
  ];
  const BT_GROUPS = {
    QB: { cats: ["QB"], award: "QBOTY", side: "off" },
    WR: { cats: ["WR"], award: "WROTY", side: "off" },
    TE: { cats: ["TE"], award: "TEOTY", side: "off" }
  };
  // Who's in Build a Team, with hand-set ratings (keyed by lowercase league name; old names work too).
  // A position left out comes from the formula in legendRatings(), never above the player's hand-set best; {} = all formula.
  const BT_ROSTER = {
    // QB
    "dictator 10": { QB: 99 }, breakxu: { QB: 96 }, jvkethings: { QB: 95 }, biggiecheese: { QB: 94 }, hellraiser: { QB: 92 },
    exanious: { QB: 91 }, soto: { QB: 89 }, sk8erboy111: { QB: 87, WR: 82 }, wery: {}, discoversoul: {},
    // WR
    "lord 9": { WR: 99 }, n4w: { WR: 95 }, splndd: { WR: 93 }, kamil08: { WR: 92 }, coaserh: { WR: 90 }, "2kaiju": { WR: 89 },
    curfaw: { WR: 89 }, hurdle: { WR: 88 }, "130kami": { WR: 88 }, mr_devy1122: { WR: 87 }, xjupp: { WR: 86 }, yavientt: { WR: 86 },
    ast1: { WR: 86 }, fraeology: { WR: 85 }, kevskiiiiiii: { WR: 85 }, rosewood: { WR: 85 }, pravings: { WR: 85 },
    vboppppppppppp: { WR: 85 }, rcbkailer: { WR: 84 }, synappseuser: { WR: 83 }, stunaaaaaaaaaaaaa: { WR: 83 }, fooge: { WR: 82 },
    superkarbfulboy9999: { WR: 82 }, vampviolences: { WR: 80 }, gabe08130: { WR: 79 }, seaboy: { WR: 79 }, knql: { WR: 78 },
    jadnlations: { WR: 76 }, goatnotgood: { WR: 72 }, ewikoro: { WR: 70 }, galan: { WR: 65 },
    uufaailen: { WR: 64 }, lynnvxd: { WR: 64 }, descended: { WR: 64 }, "10": { WR: 64 }, "130": { WR: 64 }, bloodhill: { WR: 64 },
    influx: { WR: 64 }, shyne6712: { WR: 64 }, mar: { WR: 64 }, offline9178393958402: { WR: 64 }, reapadread: { WR: 64 },
    sinsession: { WR: 64 }, xoxo: { WR: 64 }, "シシシシシシシシシシシシシシシシ": { WR: 64 },
    // TE
    day: { TE: 99 }, elim: { TE: 98 }, shazam: { TE: 97 }, phentric: { TE: 90 }, ripburied: { TE: 88 }, liarliarliar: { WR: 64, TE: 87 },
    knqq: { TE: 83 }
  };
  // Chance (%) a spin offers at least one legend rated this OVR or better; OVRs between rows are filled in
  const BT_ODDS = {
    99: 3, 98: 4, 97: 5, 96: 6, 95: 7, 94: 9, 93: 11, 92: 13, 91: 15, 90: 18, 89: 22, 88: 26, 87: 30, 86: 35, 85: 40,
    84: 45, 83: 50, 82: 55, 81: 60, 80: 65, 79: 70, 78: 75, 77: 80, 76: 84, 75: 87, 72: 90, 71: 92, 70: 94, 66: 96,
    65: 97, 64: 98, 63: 99, 62: 99.5
  };
  const BT_GAMES = 9;
  const BT_RESPINS = 1;
  // Change the name to reset everyone's "Your best" (older bests don't carry over); the old ones are cleared off each device
  const BT_BEST_KEY = "uffBuildBest2";
  try { ["uffBuildBestOff9"].forEach((k) => localStorage.removeItem(k)); } catch (e) {}

  // Each BT_ROSTER player's 60-99 rating at each position group, worked out once
  let btLegends = null;
  function legendRatings() {
    if (btLegends) return btLegends;
    const legacy = computeLegacy();
    const maxScore = Math.max(1, ...legacy.map((p) => p.score));
    // Where each player ranks (0 = lowest, 1 = best) in each All-Time stat tab, by FPTS
    const pct = {};
    Object.values(BT_GROUPS).flatMap((g) => g.cats).forEach((cat) => {
      const rows = statRowsFor(allTimeCat(cat), "alltime").filter((r) => (r.fpts || 0) > 0).sort((a, b) => a.fpts - b.fpts);
      pct[cat] = new Map(rows.map((r, i) => [r.player.toLowerCase(), rows.length > 1 ? i / (rows.length - 1) : 1]));
    });
    const legacyOf = new Map(legacy.map((p) => [aliasName(p.name).toLowerCase(), p]));
    btLegends = new Map();
    Object.entries(BT_ROSTER).forEach(([raw, set]) => {
      const key = aliasName(raw).toLowerCase();
      const p = legacyOf.get(key); // players who aren't on the Legacy list get no Legacy points
      const name = p ? p.name : aliasName(raw);
      const honors = Object.fromEntries(playerHonors(name, p).map((h) => [h.code, h.n]));
      const legacyPart = p ? 10 * Math.sqrt(p.score / maxScore) : 0;
      const top = Math.max(0, ...Object.values(set));
      const ratings = {};
      Object.entries(BT_GROUPS).forEach(([g, def]) => {
        if (g in set) return (ratings[g] = set[g]);
        const statPart = 20 * Math.max(0, ...def.cats.map((c, i) => (pct[c].get(key) || 0) * (i ? 0.8 : 1)));
        const awardPart = 6 * Math.min(2, honors[def.award] || 0);
        const sidePart = Math.min(3, 1.5 * ((honors.MVP || 0) + (def.side === "off" ? honors.OPOTY || 0 : honors.DPOTY || 0)));
        ratings[g] = Math.min(top || 99, Math.round(60 + statPart + awardPart + legacyPart + sidePart));
      });
      btLegends.set(key, { name, hof: p ? p.hof : false, tier: p && p.tier, ratings });
    });
    return btLegends;
  }

  // BT_ODDS for any OVR, in between rows by straight line
  function btOddsAtLeast(ovr) {
    const rows = Object.keys(BT_ODDS).map(Number).sort((a, b) => a - b);
    if (ovr <= rows[0]) return ovr < rows[0] ? 100 : BT_ODDS[rows[0]];
    if (ovr >= rows[rows.length - 1]) return BT_ODDS[rows[rows.length - 1]];
    const hi = rows.find((r) => r >= ovr), lo = rows[rows.indexOf(hi) - 1];
    return hi === ovr ? BT_ODDS[hi] : BT_ODDS[lo] + ((BT_ODDS[hi] - BT_ODDS[lo]) * (ovr - lo)) / (hi - lo);
  }

  let bt = null; // the run in progress
  const btNew = () => ({ slots: {}, spin: null, choosing: null, respins: BT_RESPINS, result: null });
  const btOpen = (run) => BT_SLOTS.filter((s) => !run.slots[s.id]);
  const btUsedOn = (run, side) => new Set(BT_SLOTS.filter((s) => s.side === side && run.slots[s.id]).map((s) => run.slots[s.id]));
  // Open spots a legend can still take (once on offense, once on defense)
  const btSpotsFor = (run, key) => btOpen(run).filter((s) => !btUsedOn(run, s.side).has(key));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const BT_OPTIONS = 6;
  // A legend's OVR for the spin: their best rating at a spot still open
  const btOfferOvr = (run, key) => Math.max(...btSpotsFor(run, key).map((s) => legendRatings().get(key).ratings[s.group]));
  function btSpin(run) {
    const byOvr = new Map();
    [...legendRatings().keys()].filter((k) => btSpotsFor(run, k).length).forEach((k) => {
      const o = btOfferOvr(run, k);
      byOvr.set(o, (byOvr.get(o) || []).concat(k));
    });
    const levels = [...byOvr.keys()].sort((a, b) => b - a);
    if (!levels.length) return null;
    // Each option rolls its own OVR, so a spin offers at least one that good at BT_ODDS's chance:
    // one roll reaches OVR o with chance 1 - (1 - odds)^(1/6)
    let reached = 0;
    const chance = levels.map((o, i) => {
      const atLeast = i === levels.length - 1 ? 1 : 1 - Math.pow(1 - btOddsAtLeast(o) / 100, 1 / BT_OPTIONS);
      const c = Math.max(0, atLeast - reached);
      reached = Math.max(reached, atLeast);
      return c;
    });
    const left = levels.map((o) => shuffle(byOvr.get(o).slice()));
    const options = [];
    const want = Math.min(BT_OPTIONS, left.flat().length);
    while (options.length < want) {
      // An OVR whose legends are all on this spin already rolls again
      const open = chance.map((c, i) => (left[i].length ? c : 0));
      let roll = Math.random() * open.reduce((a, b) => a + b, 0);
      const hit = open.findIndex((c) => c && (roll -= c) < 0);
      options.push(left[hit >= 0 ? hit : left.findIndex((l) => l.length)].pop());
    }
    run.spin = { options };
    run.choosing = null;
    return run.spin;
  }

  const btUnitOvr = (run, side) => {
    const slots = BT_SLOTS.filter((s) => s.side === side && run.slots[s.id]);
    const w = slots.reduce((n, s) => n + (s.weight || 1), 0);
    return w ? slots.reduce((n, s) => n + legendRatings().get(run.slots[s.id]).ratings[s.group] * (s.weight || 1), 0) / w : 0;
  };

  // A 9-game season against random UFF teams; better lineups win more often, and higher-ranked teams are harder to beat
  function btPlaySeason(run) {
    const ovr = btUnitOvr(run, "off");
    const order = powerRankingOrder().list;
    const opponents = shuffle(TEAMS.slice()).slice(0, BT_GAMES);
    const games = opponents.map((t) => {
      // Power Rankings #1 plays like an 85, the last-ranked team like a 74 (plus or minus 1.5 for a good or bad day)
      const rank = order.indexOf(t) + 1;
      const opp = 85 - (11 * (rank - 1)) / Math.max(1, order.length - 1) + (Math.random() * 3 - 1.5);
      const win = Math.random() < 1 / (1 + Math.exp(-(ovr - opp) / 7));
      const hi = 21 + 7 * Math.floor(Math.random() * 5), lo = Math.max(0, hi - 7 * (1 + Math.floor(Math.random() * 3)) + (Math.random() < 0.3 ? 1 : 0));
      return { team: t.name, rank, win, us: win ? hi : lo, them: win ? lo : hi };
    });
    const wins = games.filter((g) => g.win).length;
    run.result = { ovr: Math.round(ovr), wins, losses: BT_GAMES - wins, games };
    try {
      const best = JSON.parse(localStorage.getItem(BT_BEST_KEY));
      if (!best || wins > best.wins || (wins === best.wins && ovr > best.ovr)) localStorage.setItem(BT_BEST_KEY, JSON.stringify({ wins, ovr: Math.round(ovr) }));
    } catch (e) {}
  }

  // Only used by offline tests (window.UFF_TEST is never set on the real site)
  if (window.UFF_TEST) Object.assign(window.UFF_TEST, { legendRatings, btOddsAtLeast, btOfferOvr, btNew, btSpin, btSpotsFor, btOpen, btPlaySeason, BT_SLOTS });

  const btGrade = (w) => (w === BT_GAMES ? "Perfect season. Undefeated." : w >= 7 ? "Title contender." : w >= 5 ? "Playoff bubble." : "Rebuild year.");
  const btRatingClass = (r) => (r >= 90 ? "elite" : r >= 80 ? "good" : r >= 70 ? "ok" : "low");

  function btResultText(run) {
    const r = run.result;
    const line = (s) => `${s.label} ${legendRatings().get(run.slots[s.id]).name} (${legendRatings().get(run.slots[s.id]).ratings[s.group]})`;
    return [`UFF Build a Team: ${r.wins}-${r.losses} | OVR ${r.ovr}`,
      BT_SLOTS.map(line).join(", "),
      "uffleague.github.io/#/build"].join("\n");
  }

  function buildPage() {
    bt = bt || btNew();
    const legends = legendRatings();
    const filled = BT_SLOTS.length - btOpen(bt).length;
    let best = null;
    try { best = JSON.parse(localStorage.getItem(BT_BEST_KEY)); } catch (e) {}
    const badge = (l) => (l.hof ? `<span class="tier tier--hof">HOF</span>` : l.tier ? tierBadge(l.tier) : "");
    const slotRow = (s) => {
      const k = bt.slots[s.id];
      const l = k && legends.get(k);
      return `
        <div class="bt-slot ${l ? "filled" : ""}">
          <span class="bt-pos">${s.label}</span>
          ${l ? `<span class="bt-name">${esc(l.name)}</span><span class="bt-rating bt-rating--${btRatingClass(l.ratings[s.group])}">${l.ratings[s.group]}</span>` : `<span class="muted">Open</span>`}
        </div>`;
    };
    const unit = (side, title) => `
      <div class="bt-unit">
        <div class="admin-subhead admin-subhead--small">${title}${btUnitOvr(bt, side) ? `<span class="muted small">OVR ${Math.round(btUnitOvr(bt, side))}</span>` : ""}</div>
        ${BT_SLOTS.filter((s) => s.side === side).map(slotRow).join("")}
      </div>`;

    let panel;
    if (bt.result) {
      const r = bt.result;
      panel = `
        <div class="card admin-card bt-result">
          <span class="eyebrow">Your season</span>
          <div class="bt-record">${r.wins}-${r.losses}</div>
          <div class="bt-grade">${btGrade(r.wins)}</div>
          <div class="muted">Offense OVR <strong>${r.ovr}</strong></div>
          <div class="bt-games">${r.games.map((g) => `
            <div class="bt-game ${g.win ? "win" : "loss"}"><span class="bt-wl">${g.win ? "W" : "L"}</span>${anyTeamLogo(g.team)}${g.rank ? `<span class="seed">#${g.rank}</span>` : ""}<span class="bt-opp">${esc(teamShort(g.team))}</span><span class="bt-score">${g.us}-${g.them}</span></div>`).join("")}</div>
          <div class="admin-actions">
            <button class="btn btn-primary" id="btAgain">Play again</button>
            <button class="btn btn-ghost" id="btCopy">Copy result</button>
          </div>
        </div>`;
    } else if (!bt.spin) {
      panel = `
        <div class="card admin-card bt-spin-panel">
          <div class="bt-round">Pick ${filled + 1} of ${BT_SLOTS.length}</div>
          <p class="muted">Spin to get 6 legends, then draft one. The higher the rating, the rarer they are.</p>
          <button class="btn btn-primary bt-spin-btn" id="btSpin">Spin</button>
        </div>`;
    } else {
      const choosing = bt.choosing && legends.get(bt.choosing);
      panel = `
        <div class="card admin-card bt-spin-panel">
          <div class="bt-round">Pick ${filled + 1} of ${BT_SLOTS.length}</div>
          <div class="bt-options">
            ${bt.spin.options.map((k) => {
              const l = legends.get(k);
              const spots = btSpotsFor(bt, k);
              const top = [...new Map(spots.map((s) => [s.group, s])).values()]
                .map((s) => [s.label, l.ratings[s.group]])
                .sort((a, b) => b[1] - a[1]).slice(0, 3);
              return `
                <button type="button" class="bt-option ${bt.choosing === k ? "active" : ""}" data-bt-pick="${esc(k)}">
                  <span class="bt-option-name">${esc(l.name)} ${badge(l)}</span>
                  <span class="bt-option-ratings">${top.map(([p, r]) => `<span>${p} <b class="bt-rating--${btRatingClass(r)}">${r}</b></span>`).join("")}</span>
                </button>`;
            }).join("")}
          </div>
          ${choosing ? `
            <div class="bt-place">
              <div class="muted small">Put <strong>${esc(choosing.name)}</strong> at:</div>
              <div class="bt-place-spots">
                ${btSpotsFor(bt, bt.choosing)
                  .filter((s, i, all) => all.findIndex((x) => x.side === s.side && x.label === s.label) === i) // one button per kind of spot
                  .sort((a, b) => choosing.ratings[b.group] - choosing.ratings[a.group]).map((s) => `
                  <button type="button" class="btn btn-ghost btn-sm" data-bt-slot="${s.id}">${s.label} &middot; <b>${choosing.ratings[s.group]}</b></button>`).join("")}
              </div>
            </div>` : `<p class="muted small">Pick a legend, then choose their spot.</p>`}
          <div class="admin-actions">
            <button class="btn btn-ghost btn-sm" id="btRespin" ${bt.respins ? "" : "disabled"}>Re-spin (${bt.respins} left)</button>
          </div>
        </div>`;
    }

    return `
      <div class="wrap">
        <div class="page-head page-head--row">
          <div>
            <h1>Build a Team</h1>
            <p class="muted">Spin for legends, draft them into your 7v7 offense (QB, 5 WR, TE), and see if they can go ${BT_GAMES}-0.</p>
          </div>
          ${best ? `<span class="pill">Your best: ${best.wins}-${BT_GAMES - best.wins} &middot; OVR ${best.ovr}</span>` : ""}
        </div>
        <div class="bt-layout">
          <div>${panel}</div>
          <div class="card admin-card bt-roster">
            ${unit("off", "Offense")}
            ${filled && !bt.result ? `<button class="btn btn-ghost btn-sm" id="btReset">Start over</button>` : ""}
          </div>
        </div>
      </div>`;
  }

  const placeholder = (title, sub) => () => `
    <div class="wrap">
      ${pageHead(title)}
      ${empty("Coming soon", sub)}
    </div>`;

  function notFound() {
    return `<div class="wrap">${empty("Page not found", '<a class="link" href="#/">Back to home</a>')}</div>`;
  }

  const ROUTES = {
    "": home,
    teams,
    standings,
    schedule,
    scores,
    stats,
    compare: comparePage,
    awards,
    allflag: allFlagPage,
    playoff: playoffPage,
    predictions: predictionsPage,
    vods: vodsPage,
    build: buildPage,
    bowls: bowlsPage,
    legacy,
    records,
    updates,
    admin
  };

  /* ---------- Router ---------- */

  const app = document.getElementById("app");
  const nav = document.getElementById("nav");
  const topnav = document.getElementById("topnav");
  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");

  document.getElementById("seasonNum").textContent = `Season ${LEAGUE.season}`;
  document.getElementById("seasonYear").textContent = LEAGUE.year;
  document.querySelectorAll(".brand img").forEach((img) => (img.src = LEAGUE.brandLogo));

  // The main pages sit in the top bar; the menu lists every page
  topnav.innerHTML = NAV.filter((n) => n.top).map((n) => `<a href="#/${n.path}" data-path="${n.path}">${n.label}</a>`).join("");
  nav.innerHTML = NAV.map(
    (n) => `<a href="#/${n.path}" data-path="${n.path}">${icon(n.icon)}<span>${n.label}</span></a>`
  ).join("");

  function render() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const [section, sub] = parts;
    if (section === "schedule" && sub) scheduleWeek = Number(sub);
    if (section === "allflag") allFlagSeason = Number(sub) || null;
    if (section === "compare") {
      cmp.scope = sub === "alltime" ? "alltime" : "season";
      try { cmp.a = decodeURIComponent(parts[2] || ""); cmp.b = decodeURIComponent(parts[3] || ""); } catch (e) {}
    }
    if (section === "updates") updatesFilter = UPDATE_TYPES[sub] ? sub : "all";
    if (section === "stats") {
      statsScope = sub === "alltime" ? "alltime" : "season";
      const pos = parts[2] && LEAGUE.stats.categories.find((c) => c.key.toLowerCase() === parts[2].toLowerCase());
      if (pos) statsPos = pos.key;
    }
    if (section === "awards") {
      const s = Number(sub);
      awardsSeason = s >= 1 && s <= LEAGUE.season ? s : LEAGUE.season;
    }
    if (section === "admin") {
      const tab = ADMIN_TABS.some(([k]) => k === sub) ? sub : "overview";
      // A message from one tab doesn't follow you to another
      if (tab !== adminTab) adminError = adminFlash = "";
      adminTab = tab;
    }
    const page = section === "teams" && sub ? () => team(sub)
      : section === "players" && sub ? () => player(sub)
      : ROUTES[section] || notFound;
    app.innerHTML = page();
    document.body.classList.toggle("is-home", page === home);
    [nav, topnav].forEach((list) => list.querySelectorAll("a").forEach((a) =>
      a.classList.toggle("active", a.dataset.path === (section || ""))
    ));
    const adminLink = document.getElementById("adminLink");
    adminLink.classList.toggle("active", section === "admin");
    adminLink.textContent = getAdmin() ? "Admin" : "Log In";
    if (section !== "admin") adminError = adminFlash = "";
    const label = NAV.find((n) => n.path === (section || ""));
    document.title = label && label.path ? `${label.label} | UFF` : "UFF | United Flag Football";
    closeMenu();
    window.scrollTo(0, 0);
    if (section === "admin" && getAdmin()) loadActivity();
  }

  function closeMenu() {
    menuPanel.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }
  menuBtn.addEventListener("click", () => {
    const open = menuPanel.hidden;
    menuPanel.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  // Clicking outside the menu or pressing Escape closes it
  document.addEventListener("click", (e) => { if (!menuPanel.hidden && !e.target.closest("#menuPanel, #menuBtn")) closeMenu(); });

  // ---- Compare player dropdowns ----
  const comboClose = (box) => {
    if (!box) return;
    box.querySelector(".combo-list").hidden = true;
    box.querySelector(".combo-input").setAttribute("aria-expanded", "false");
  };
  const comboFill = (input) => {
    const list = input.closest(".combo").querySelector(".combo-list");
    list.innerHTML = comboOptions(input);
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    const sel = list.querySelector(".combo-opt.selected");
    if (sel) list.scrollTop = sel.offsetTop - list.clientHeight / 2 + sel.offsetHeight / 2;
  };
  const comboPick = (box, name) => {
    const side = box.dataset.combo;
    location.hash = `#/compare/${cmp.scope}/${encodeURIComponent(side === "a" ? name : cmp.a)}/${encodeURIComponent(side === "b" ? name : cmp.b)}`;
  };
  const comboMove = (box, step) => {
    const opts = [...box.querySelectorAll(".combo-opt")];
    if (!opts.length) return;
    const cur = opts.findIndex((o) => o.classList.contains("active"));
    const next = cur < 0 ? (step > 0 ? 0 : opts.length - 1) : Math.max(0, Math.min(opts.length - 1, cur + step));
    opts.forEach((o, i) => o.classList.toggle("active", i === next));
    opts[next].scrollIntoView({ block: "nearest" });
  };
  app.addEventListener("focusin", (e) => {
    if (!e.target.classList.contains("combo-input")) return;
    e.target.select();
    comboFill(e.target);
  });
  app.addEventListener("input", (e) => { if (e.target.classList.contains("combo-input")) comboFill(e.target); });
  app.addEventListener("keydown", (e) => {
    if (!e.target.classList.contains("combo-input")) return;
    const box = e.target.closest(".combo");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (box.querySelector(".combo-list").hidden) comboFill(e.target);
      comboMove(box, e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = box.querySelector(".combo-opt.active") || box.querySelector(".combo-opt");
      if (opt) comboPick(box, opt.dataset.comboOpt);
    } else if (e.key === "Escape" || e.key === "Tab") comboClose(box);
  });
  // mousedown (not click) so picking happens before the box loses focus
  app.addEventListener("mousedown", (e) => {
    const opt = e.target.closest("[data-combo-opt]");
    if (opt) { e.preventDefault(); comboPick(opt.closest(".combo"), opt.dataset.comboOpt); return; }
    document.querySelectorAll(".combo").forEach((box) => { if (!box.contains(e.target)) comboClose(box); });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  app.addEventListener("submit", async (e) => {
    const id = e.target.id;
    if (!["posForm", "adminLogin", "streamForm", "teamForm", "statPick", "statForm", "vodForm"].includes(id)) return;
    e.preventDefault();
    const form = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    adminError = adminFlash = "";
    try {
      if (id === "posForm") await savePosition(form);
      else if (id === "statPick") {
        const typed = String(form.get("player") || "").trim();
        statsEditName = knownPlayers().find((n) => n.toLowerCase() === aliasName(typed).toLowerCase()) || aliasName(typed);
      } else if (id === "statForm") {
        const stats = { gp: form.get("gp") };
        Object.entries(STAT_EDIT).forEach(([g, cols]) => {
          stats[g] = Object.fromEntries(cols.map(([f]) => [f, Number(form.get(`${g}.${f}`)) || 0]));
        });
        await adminCall({ action: "setStats", name: statsEditName, stats });
        return reloadWithFlash(`Saved ${statsEditName}'s Season ${LEAGUE.season} stats. Everyone sees them now.`);
      } else if (id === "teamForm") {
        const [conference, division] = String(form.get("place") || "").split("||");
        const current = TEAMS.find((x) => x.key === teamEditKey);
        const team = {
          name: String(form.get("name") || "").trim(), code: String(form.get("code") || "").trim().toUpperCase(),
          coach: String(form.get("coach") || "").trim(), conference, division,
          color: String(form.get("color") || ""), color2: String(form.get("color2") || ""),
          logo: teamLogoDraft != null ? teamLogoDraft : current ? current.logo : ""
        };
        const key = teamEditKey === "+new" ? `+${crypto.randomUUID()}` : teamEditKey;
        await adminCall({ action: "saveTeam", key, team });
        return reloadWithFlash(`Saved ${team.name}. Everyone sees it now.`);
      } else if (id === "vodForm") {
        const url = String(form.get("url") || "").trim();
        if (!streamEmbed(url)) throw new Error("That isn't a YouTube or Twitch link.");
        const res = await adminCall({ action: "addVod", title: String(form.get("title") || ""), url, gameId: String(form.get("gameId") || ""), note: String(form.get("note") || "") });
        SAVED.vods = res.vods;
        adminFlash = "Added the VOD. It's on the VODs page now.";
      }
      else if (id === "streamForm") {
        const url = String(form.get("url") || "").trim();
        if (!streamEmbed(url)) throw new Error("That isn't a YouTube or Twitch link the site can play.");
        const res = await adminCall({ action: "addStream", title: String(form.get("title") || ""), url, gameId: String(form.get("gameId") || "") });
        SAVED.streams = res.streams;
        adminFlash = "Added the live stream. It's on the home page now.";
      } else {
        const s = await adminCall({
          action: "login", username: String(form.get("username") || ""),
          password: String(form.get("password") || ""), name: String(form.get("name") || "")
        });
        setAdmin({ user: s.name || s.username, token: s.token });
      }
    } catch (err) {
      adminError = err.message;
    }
    render();
  });

  const showResultPreview = () => { document.getElementById("resPreview").innerHTML = resultPreview(); };

  const showPoEditor = () => { document.getElementById("poEditor").innerHTML = playoffEditor(); };

  // Run an admin save, then show the result (or the error) at the top of the Admin page
  async function adminSave(btn, body, after) {
    if (btn) btn.disabled = true;
    adminError = adminFlash = "";
    try {
      after(await adminCall(body));
    } catch (err) {
      adminError = err.message;
    }
    render();
  }

  // Redraw the page but stay where you were scrolled
  const renderKeepScroll = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };

  app.addEventListener("click", async (e) => {
    const t = e.target.closest("button, [data-pick]") || e.target;

    // Home: banner arrows / dots and the Stat Leaders tabs
    if (t.dataset && t.dataset.hero) {
      const h = t.dataset.hero;
      return heroGo(h === "next" ? heroAt + 1 : h === "prev" ? heroAt - 1 : Number(h));
    }
    if (t.dataset && "rankAll" in t.dataset) {
      rankAll = !rankAll;
      document.querySelector(".hx-area-rank").innerHTML = powerRankingsPanel();
      return;
    }
    if (t.dataset && t.dataset.leadScope) {
      leadScope = t.dataset.leadScope;
      document.querySelector(".hx-area-lead").innerHTML = leadersPanel();
      return;
    }
    if (t.dataset && t.dataset.leadTab) {
      leadTab = Number(t.dataset.leadTab);
      document.querySelectorAll("[data-lead-tab]").forEach((b) => b.classList.toggle("on", b === t));
      document.querySelectorAll("[data-lead-pane]").forEach((p) => { p.hidden = Number(p.dataset.leadPane) !== leadTab; });
      return;
    }

    // Box score open / close
    // Stream / VOD player inside a game card: one player per card, the iframe only loads while it's open
    if (t.dataset && t.dataset.watch) {
      const card = t.closest(".game-card");
      const pane = card.querySelector(".watch");
      const frame = pane.querySelector("iframe");
      const open = !t.classList.contains("open");
      card.querySelectorAll("[data-watch]").forEach((b) => { b.classList.remove("open"); b.setAttribute("aria-expanded", "false"); });
      if (open) {
        if (frame.getAttribute("src") !== t.dataset.watch) frame.src = t.dataset.watch;
        t.classList.add("open");
        t.setAttribute("aria-expanded", "true");
      } else frame.removeAttribute("src"); // stops the video
      pane.hidden = !open;
      return;
    }

    if (t.hasAttribute && t.hasAttribute("data-box-toggle")) {
      const box = t.closest(".game-card").querySelector(".box");
      const open = box.hidden;
      box.hidden = !open;
      t.classList.toggle("open", open);
      t.setAttribute("aria-expanded", String(open));
      return;
    }

    // Build a Team
    if (t.id === "btSpin" || t.id === "btRespin") {
      if (t.id === "btRespin") bt.respins--;
      btSpin(bt);
      return renderKeepScroll();
    }
    if (t.dataset.btPick) { bt.choosing = bt.choosing === t.dataset.btPick ? null : t.dataset.btPick; return renderKeepScroll(); }
    if (t.dataset.btSlot) {
      bt.slots[t.dataset.btSlot] = bt.choosing;
      bt.spin = null;
      bt.choosing = null;
      if (!btOpen(bt).length) btPlaySeason(bt);
      return renderKeepScroll();
    }
    if (t.id === "btReset" || t.id === "btAgain") {
      if (t.id === "btReset" && !confirm("Start over with an empty lineup?")) return;
      bt = btNew();
      return renderKeepScroll();
    }
    if (t.id === "btCopy") {
      const done = () => { t.textContent = "Copied!"; };
      if (navigator.clipboard) navigator.clipboard.writeText(btResultText(bt)).then(done, () => prompt("Copy your result:", btResultText(bt)));
      else prompt("Copy your result:", btResultText(bt));
      return;
    }

    // Admin: teams, player stats, VODs
    if (t.id === "teamNew" || t.dataset.teamPick) {
      teamEditKey = t.id === "teamNew" ? "+new" : t.dataset.teamPick;
      teamLogoDraft = null;
      return renderKeepScroll();
    }
    if (t.id === "teamReset") {
      const current = TEAMS.find((x) => x.key === teamEditKey);
      const isAdded = teamEditKey.startsWith("+");
      if (!confirm(isAdded ? `Remove ${current.name} from the league?` : `Undo all your changes to ${current.name}?`)) return;
      return adminSave(t, { action: "removeTeam", key: teamEditKey }, () =>
        reloadWithFlash(isAdded ? `Removed ${current.name}.` : `${current.name} is back to its original details.`));
    }
    if (t.dataset.statLoad) { statsEditName = t.dataset.statLoad; return renderKeepScroll(); }
    if (t.id === "statReset") {
      if (!confirm(`Undo the hand edits for ${statsEditName} and use the box scores again?`)) return;
      return adminSave(t, { action: "setStats", name: statsEditName, stats: null }, () =>
        reloadWithFlash(`${statsEditName}'s stats come from the box scores again.`));
    }
    if (t.dataset.delVod) {
      return adminSave(t, { action: "removeVod", id: t.dataset.delVod }, (res) => {
        SAVED.vods = res.vods;
        adminFlash = "Removed the VOD.";
      });
    }

    // Predictions (saved in this browser only)
    if (t.dataset.pick || t.id === "predLock" || t.id === "predReset" || t.id === "predStandings") {
      const state = loadPred();
      if (t.dataset.pick) state.picks[t.dataset.pick] = t.dataset.team;
      if (t.id === "predLock") state.locked = !state.locked;
      if (t.id === "predReset") {
        if (!confirm(bracket() ? "Clear all your picks?" : "Clear your playoff teams and all your picks?")) return;
        state.seeds = {};
        state.picks = {};
      }
      if (t.id === "predStandings") {
        LEAGUE.conferences.forEach((c) => { state.seeds[c.name] = standingsOrder(c.name).slice(0, PRED_SEEDS).map((x) => x.name); });
      }
      savePred(state);
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
      return;
    }

    // Playoff bracket editor
    const act = t.dataset.poAct;
    if (act) {
      const d = draftPlayoffs();
      const r = Number(t.dataset.r), g = Number(t.dataset.g);
      if (act === "addRound") d.rounds.push({ name: d.rounds.length ? `Round ${d.rounds.length + 1}` : "Round 1", games: [newGame()] });
      if (act === "addGame") d.rounds[r].games.push(newGame());
      if (act === "delGame") d.rounds[r].games.splice(g, 1);
      if (act === "delRound" && confirm(`Delete ${d.rounds[r].name} and its games?`)) d.rounds.splice(r, 1);
      if (act === "send") sendWinners(r);
      if (act === "removeLogo") d.logo = "";
      if (act === "clear") {
        if (!confirm("Clear the whole bracket? The Playoff page goes back to \"Coming soon\" once you save.")) return;
        poDraft = emptyBracket();
        adminError = "";
        adminFlash = "Bracket cleared. Press Save playoffs to take it off the site.";
        return render();
      }
      if (act === "save") {
        return adminSave(t, { action: "savePlayoffs", playoffs: d }, (res) => {
          SAVED.playoffs = res.playoffs;
          poDraft = null;
          adminFlash = "Saved the playoff bracket. It's on the Playoff page now.";
        });
      }
      showPoEditor();
      return;
    }
    if (t.id === "bowlSave") {
      return adminSave(t, { action: "saveBowls", bowls: bowlDraft || {} }, (res) => {
        SAVED.bowls = res.bowls;
        bowlDraft = null;
        adminFlash = "Saved the United Flag Bowl history. It's on the Past Bowls page now.";
      });
    }
    if (t.dataset.delStream) {
      const keep = "keep" in t.dataset;
      return adminSave(t, { action: "removeStream", id: t.dataset.delStream, keep }, (res) => {
        SAVED.streams = res.streams;
        SAVED.vods = res.vods;
        adminFlash = keep
          ? "Took the stream off the home page. It stays on its game card as the replay (it's also on the VODs page)."
          : "Removed the live stream from the home page.";
      });
    }

    if (t.id === "resClear") { resDraft = null; render(); return; }
    if (t.id === "txClear") { txDraft = null; render(); return; }
    // Compare: swap the two players
    if (t.id === "cmpSwap") {
      location.hash = `#/compare/${cmp.scope}/${encodeURIComponent(cmp.b)}/${encodeURIComponent(cmp.a)}`;
      return;
    }

    // All-Flag adder
    if (t.id === "afClear") { afDraft = null; return renderKeepScroll(); }
    if (t.id === "afSave" || t.dataset.afDel) {
      const del = t.dataset.afDel;
      if (del && !confirm(`Delete the Season ${del} All-Flag teams?`)) return;
      if (!del && !afDraft.parsed.season) { adminError = "Type the season first."; return renderKeepScroll(); }
      if (!del && afDraft.parsed.picks.some((p) => !p.player)) { adminError = "Every pick needs a player name."; return renderKeepScroll(); }
      t.disabled = true;
      try {
        if (del) {
          await adminCall({ action: "deleteAllFlag", season: del });
          reloadWithFlash(`Deleted the Season ${del} All-Flag teams.`);
        } else {
          const { season, picks } = afDraft.parsed;
          await adminCall({ action: "saveAllFlag", season, picks: picks.map(({ tier, side, pos, team, player }) => ({ tier, side, pos, team, player })) });
          afDraft = null;
          reloadWithFlash(`Saved the Season ${season} All-Flag teams (${picks.length} picks). Everyone sees them now.`);
        }
      } catch (err) {
        adminError = err.message;
        renderKeepScroll();
      }
      return;
    }

    if (t.id === "txSave" || t.dataset.delUpdate) {
      const del = t.dataset.delUpdate;
      if (del && !confirm("Delete this transaction? It comes off the Updates page and the roster.")) return;
      t.disabled = true;
      try {
        if (del) {
          await adminCall({ action: "deleteUpdate", id: del });
          reloadWithFlash("Deleted the transaction.");
        } else {
          const list = txDraft.parsed.list.filter((u) => !u.dup).map(({ dup, ...u }) => u);
          await adminCall({ action: "saveUpdates", updates: list, source: txDraft.text });
          txDraft = null;
          reloadWithFlash(`Saved ${list.length} transaction${list.length === 1 ? "" : "s"}. Everyone sees ${list.length === 1 ? "it" : "them"} now.`);
        }
      } catch (err) {
        adminFlash = "";
        adminError = err.message;
        render();
      }
      return;
    }
    if (t.id === "resSave" || t.dataset.delResult) {
      const del = t.dataset.delResult;
      if (del && !confirm(`Remove the result for ${del}? Its score and stats come off the site.`)) return;
      t.disabled = true;
      try {
        if (del) {
          const saved = SAVED.results.find((x) => x.id === del);
          const e2 = allGames().find(({ g }) => g.id === del);
          await adminCall({ action: "deleteResult", id: del, label: saved && e2 ? resultLabel(e2.g, saved.score) : del });
          reloadWithFlash(`Removed the result for ${del}.`);
        } else {
          const g = allGames().find(({ g }) => g.id === resDraft.gameId).g;
          const r = recapResult(resDraft.recap, g);
          await adminCall({ action: "saveResult", result: r, source: resDraft.text, label: resultLabel(g, r.score) });
          resDraft = null;
          reloadWithFlash(`Saved ${g.id}: ${g.teams[0]} ${r.score[0]}-${r.score[1]} ${g.teams[1]}. Everyone sees it now.`);
        }
      } catch (err) {
        adminFlash = "";
        adminError = err.message;
        render();
      }
      return;
    }
    if (t.id !== "adminLogout") return;
    setAdmin(null);
    render();
  });

  app.addEventListener("input", (e) => {
    const el = e.target;
    // Typing in the bracket editor / bowl history only updates the draft (no redraw, so focus stays)
    if (el.tagName === "INPUT" && (el.hasAttribute("data-po-title") || el.dataset.poRound || el.dataset.poF)) {
      const d = draftPlayoffs();
      if (el.hasAttribute("data-po-title")) d.title = el.value;
      else if (el.dataset.poRound) d.rounds[Number(el.dataset.poRound)].name = el.value;
      else d.rounds[Number(el.dataset.r)].games[Number(el.dataset.g)][el.dataset.poF] = el.value.trim();
      return;
    }
    if (el.dataset.bowl) {
      bowlDraft = bowlDraft || clone(SAVED.bowls || {});
      (bowlDraft[el.dataset.bowl] = bowlDraft[el.dataset.bowl] || {})[el.dataset.bowlF] = el.value;
      return;
    }
    if (e.target.id === "resPaste") {
      updateResultDraft(e.target.value);
      showResultPreview();
      return;
    }
    if (e.target.id === "afPaste") {
      afDraft = e.target.value.trim() ? { text: e.target.value, parsed: parseAllFlag(e.target.value) } : null;
      document.getElementById("afPreview").innerHTML = allFlagPreview();
      return;
    }
    if (afDraft && e.target.id === "afSeason") { afDraft.parsed.season = Number(e.target.value) || null; return; }
    if (afDraft && e.target.dataset.afI) { afDraft.parsed.picks[Number(e.target.dataset.afI)].player = e.target.value.trim(); return; }
    if (e.target.id === "txPaste") {
      updateTxDraft(e.target.value);
      document.getElementById("txPreview").innerHTML = txPreview();
      return;
    }
    if (e.target.id === "posPlayer") {
      // Show the player's current positions once a known name is typed
      const name = e.target.value.trim();
      if (!knownPlayers().some((n) => n.toLowerCase() === name.toLowerCase())) return;
      document.getElementById("posOff").value = positionOf(name, "receiving");
      document.getElementById("posDef").value = positionOf(name, "defense");
      return;
    }
    if (e.target.id === "statsSearch") {
      const q = e.target.value.trim().toLowerCase();
      document.getElementById("statsList").innerHTML = statsTable(
        statsRows.filter((r) => r.player.toLowerCase().includes(q) || (r.team || "").toLowerCase().includes(q))
      );
      return;
    }
    if (e.target.id !== "legacySearch") return;
    const q = e.target.value.trim().toLowerCase();
    document.getElementById("legacyList").innerHTML =
      legacyRows(legacyList.filter((p) => p.name.toLowerCase().includes(q)));
  });

  app.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.dataset.seedConf) {
      const state = loadPred();
      const list = (state.seeds[el.dataset.seedConf] = (state.seeds[el.dataset.seedConf] || []).slice());
      list[Number(el.dataset.seedI)] = el.value;
      savePred(state);
      return renderKeepScroll();
    }
    if (el.tagName === "SELECT" && el.dataset.poF) {
      const game = draftPlayoffs().rounds[Number(el.dataset.r)].games[Number(el.dataset.g)];
      const f = el.dataset.poF;
      game[f] = el.value;
      // Back to TBD = the winner of the round before goes here again
      if ((f === "a" || f === "b") && !el.value) game[f === "a" ? "fromA" : "fromB"] = null;
      if ((f === "a" || f === "b") && game.adv === f && !el.value) game.adv = "";
      showPoEditor();
      return;
    }
    if (el.id === "teamLogoFile" && el.files && el.files[0]) {
      try {
        const res = await adminCall({ action: "uploadImage", image: await shrinkImage(el.files[0]) });
        teamLogoDraft = res.url;
        adminError = "";
        adminFlash = "Logo uploaded. Press Save team to use it.";
      } catch (err) {
        adminFlash = "";
        adminError = err.message;
      }
      return renderKeepScroll();
    }
    if (el.id === "poLogo" && el.files && el.files[0]) {
      try {
        draftPlayoffs().logo = await shrinkImage(el.files[0]);
      } catch (err) {
        alert(err.message);
      }
      showPoEditor();
      return;
    }
    if (e.target.id === "resGame" && resDraft) {
      resDraft.gameId = e.target.value;
      showResultPreview();
    }
    if (e.target.id === "txDay" && txDraft && e.target.value) {
      updateTxDraft(txDraft.text, e.target.value);
      document.getElementById("txPreview").innerHTML = txPreview();
    }
    if (e.target.id === "awardSeason") location.hash = `#/awards/${e.target.value}`;
    if (e.target.id === "scheduleWeek") location.hash = `#/schedule/${e.target.value}`;
    if (e.target.id === "allFlagSeason") location.hash = `#/allflag/${e.target.value}`;
    if (e.target.id === "cmpScope") location.hash = `#/compare/${e.target.value}/${encodeURIComponent(cmp.a)}/${encodeURIComponent(cmp.b)}`;
  });

  window.addEventListener("hashchange", render);
  render();
})();
