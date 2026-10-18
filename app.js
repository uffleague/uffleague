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
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'
  };
  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  const NAV = [
    { path: "", label: "Home", icon: "home" },
    { path: "teams", label: "Teams", icon: "teams" },
    { path: "schedule", label: "Schedule", icon: "schedule" },
    { path: "standings", label: "Standings", icon: "standings" },
    { path: "scores", label: "Scores", icon: "scores" },
    { path: "stats", label: "Stats", icon: "stats" },
    { path: "updates", label: "Updates", icon: "updates" },
    { path: "compare", label: "Compare", icon: "compare" },
    { path: "awards", label: "Awards", icon: "awards" },
    { path: "playoff", label: "Playoff", icon: "playoff" },
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
  let SAVED = { results: [], updates: [], positions: {} };
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

    const games = LEAGUE.schedule.flatMap((w) => w.games);
    SAVED.results.forEach((r) => {
      const g = games.find((x) => x.id === r.id);
      if (g) Object.assign(g, { score: r.score, date: r.date, potg: r.potg, box: r.box });
    });

    const have = new Set((LEAGUE.updates = LEAGUE.updates || []).map(updateKey));
    SAVED.updates.forEach((u) => {
      if (!have.has(updateKey(u))) { LEAGUE.updates.push(u); have.add(updateKey(u)); }
    });
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
  const UPDATES = (LEAGUE.updates || [])
    .map((u, i) => ({ ...u, i, t: TEAMS.find((x) => x.name === u.team) }))
    .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`) || a.i - b.i);

  const ROSTERS = {};
  UPDATES.forEach((u) => {
    if (!u.t) return;
    const key = u.player.toLowerCase();
    if (u.type === "sign") {
      Object.values(ROSTERS).forEach((r) => r.delete(key));
      (ROSTERS[u.t.slug] = ROSTERS[u.t.slug] || new Map()).set(key, u.player);
    } else if ((u.type === "demand" || u.type === "release") && ROSTERS[u.t.slug]) {
      ROSTERS[u.t.slug].delete(key);
    }
  });

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
      ? `<img class="team-logo custom ${size}" src="${t.logo}" alt="${t.name} logo">`
      : `<img class="team-logo ${size}" src="logo.png" alt="">`;

  const pageHead = (title, sub) => `
    <div class="page-head">
      <h1>${title}</h1>
      ${sub ? `<p class="muted">${sub}</p>` : ""}
    </div>`;

  const empty = (title, text) => `
    <div class="empty">
      <img src="logo.png" alt="">
      <h3>${title}</h3>
      <p>${text}</p>
    </div>`;

  /* ---------- Pages ---------- */

  function home() {
    return `
      <section class="hero">
        <div class="wrap">
          <img class="hero-logo" src="${LEAGUE.brandLogo}" alt="United Flag Football logo">
          <span class="pill">Season ${LEAGUE.season} &middot; ${LEAGUE.year}</span>
          <h1 class="hero-title">United Flag<br>Football</h1>
          <p class="hero-sub">The premier Roblox flag football league. ${TEAMS.length} teams. ${confCount} conferences. One champion.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/standings">View Standings ${icon("arrow", "sm")}</a>
            <a class="btn btn-ghost" href="#/stats">Stat Leaders</a>
          </div>
        </div>
      </section>
      <section class="wrap home-grid">
        <div>
          <div class="section-head">
            <h2>Latest Scores</h2>
            <a href="#/scores" class="link">View All &rarr;</a>
          </div>
          ${finalWeeks().length
            ? `<div class="game-list">${finalWeeks().flatMap((w) => w.games).slice(0, 4).map(gameCard).join("")}</div>`
            : empty("No games played yet", "Scores will show up here once the season kicks off.")}
        </div>
        <div>
          <div class="section-head">
            <h2>${icon("trend", "accent")} Season Leaders</h2>
          </div>
          ${seasonLeaders() || empty("No leaders yet", "Stat leaders will be posted after week one.")}
          <a href="#/stats" class="link leaders-more">All stat leaders &rarr;</a>
        </div>
      </section>
      <section class="wrap">${candidatesSection()}</section>
      <section class="wrap">
        <div class="section-head"><h2>The League</h2></div>
        <div class="conf-overview">
          ${LEAGUE.conferences.map((c) => `
            <a class="card conf-card" href="#/teams">
              <h3>${c.name}</h3>
              ${c.divisions.map((d) => `
                <div class="conf-div">
                  <span class="eyebrow">${d.name}</span>
                  <span>${d.teams.length} teams</span>
                </div>`).join("")}
            </a>`).join("")}
        </div>
      </section>`;
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
                      <div class="team-name">${t.name}</div>
                      <div class="muted small">${t.w}-${t.l}${(() => {
                        const r = ROSTERS[slug(t.name)];
                        return r && r.size ? ` &middot; ${r.size} player${r.size === 1 ? "" : "s"}` : "";
                      })()}</div>
                      ${t.coach ? `<div class="muted small">HC ${t.coach}</div>` : ""}
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
    return played || TEAMS.find((t) => t.coach && t.coach.toLowerCase() === key) || (staff && staff.t) || null;
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
    const staff = [...staffBy.values()];

    const games = teamSchedule(t);
    const short =`${t.conference.replace(/ Conference$/, "")} ${t.division.replace(/ Division$/, "")}`;
    return `
      <div class="wrap">
        <a href="#/teams" class="link back">&larr; All Teams</a>
        <div class="team-head">
          ${teamLogo(t, "xl")}
          <div>
            <h1>${t.name}</h1>
            <p class="muted">${short}${t.coach ? ` &middot; Head Coach ${playerLink(t.coach, "link-strong")}` : ""}</p>
            ${staff.length ? `<p class="muted">${staff.map((u) => `${u.role} ${playerLink(u.player, "link-strong")}`).join(" &middot; ")}</p>` : ""}
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
    ["rushing", "Rushing", [["ATT", "att"], ["YDS", "yds"], ["TD", "td"], ["FUM", "fum"]]],
    ["receiving", "Receiving", [["TGT", "tgt"], ["REC", "rec"], ["YDS", "yds"], ["TD", "td"], ["DROP", "drop"]]],
    ["defense", "Defense", [["TAK", "tak"], ["TFL", "tfl"], ["SCK", "sck"], ["SAF", "saf"], ["INT", "int"], ["PBU", "pbu"], ["SWAT", "swat"], ["TD", "td"]]]
  ];

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
    const wins = awardWins(name);
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
      </div>`;
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
  function aliasName(name) {
    const aliases = LEAGUE.aliases || {};
    if (name in aliases) return aliases[name];
    const hit = Object.keys(aliases).find((k) => k.toLowerCase() === name.toLowerCase());
    return hit ? aliases[hit] : name;
  }

  function statRowsFor(cat, scope) {
    const shown = cat.columns.map(([k]) => k).filter((k) => k !== "gp" && k !== "fpts");
    const fromBox = (cat.from ? Object.values(BOX_TOTALS[cat.from]) : [])
      .filter((r) => !cat.pos || positionOf(r.player, cat.from) === cat.pos)
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
    const list = UPDATES.filter((u) => updatesFilter === "all" || u.type === updatesFilter).reverse();
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
                            <a href="#/teams/${slug(t.name)}" class="team-cell">${teamLogo(t)}<span>${t.name}</span></a>
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
      raw.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1));
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
              ${t ? teamLogo(t, "md") : ""}
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
  function computeLegacy() {
    const value = {};
    LEAGUE.legacy.points.forEach((g) => g.codes.forEach((c) => (value[c] = g.value)));
    const order = LEAGUE.legacy.points.flatMap((g) => g.codes);
    const rankOf = (c) => (order.includes(c) ? order.indexOf(c) : order.length);

    const list = LEAGUE.legacy.players.map((p) => {
      const honors = Object.entries(p.honors).sort((a, b) => rankOf(a[0]) - rankOf(b[0]));
      const score = honors.reduce((sum, [code, n]) => sum + (value[code] || 0) * n, p.bonus || 0);
      return {
        name: p.name,
        hof: LEAGUE.legacy.hallOfFame.includes(p.name),
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
    rushing: { label: "Rushing", cols: [["ATT", "att"], ["YDS", "yds"], ["TD", "td"], ["YPC", "ypc"], ["FUM", "fum"], ["20+", "plus20"], ["LNG", "lng"]] },
    receiving: { label: "Receiving", cols: [["TGT", "tgt"], ["REC", "rec"], ["YDS", "yds"], ["TD", "td"], ["DROP", "drop"], ["LNG", "lng"]] },
    defense: { label: "Defense", cols: [["TAK", "tak"], ["TFL", "tfl"], ["SCK", "sck"], ["SAF", "saf"], ["SWAT", "swat"], ["INT", "int"], ["PBU", "pbu"], ["PRE", "pre"], ["TD", "td"]] }
  };

  function boxScore(g, teams) {
    return `
      <details class="box">
        <summary>Box score</summary>
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
      </details>`;
  }

  function gameCard(g) {
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
        ${final && g.box ? boxScore(g, [a, b]) : ""}
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
    rushing: { ATT: "att", YDS: "yds", TD: "td", YPC: "ypc", FUM: "fum", "20+": "plus20", LNG: "lng" },
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

  // The scheduled game for these two teams, preferring the recap's week and games not played yet
  function findGame(recap) {
    if (!recap.teams) return null;
    const want = recap.teams.map(normTeam).sort().join("|");
    const hits = allGames().filter(({ g }) => g.teams.map(normTeam).sort().join("|") === want);
    const pick = hits.find(({ wk }) => wk.week === recap.week) || hits.find(({ g }) => !Array.isArray(g.score)) || hits[0];
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
      ? gameCard({ ...g, ...recapResult(recap, g) }).replace('<details class="box">', '<details class="box" open>')
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

  function resultsSection() {
    const saved = SAVED.results
      .map((r) => allGames().find(({ g }) => g.id === r.id))
      .filter(Boolean);
    return `
      <section>
        <div class="section-head section-head--left"><h2>Game Results</h2></div>
        <div class="card admin-card">
          <p class="muted small admin-note">Paste the full game recap. The score, box score and every player's stats update Scores, Standings, Stats and Award Candidates for everyone once you save.</p>
          <textarea id="resPaste" class="admin-textarea" rows="8" placeholder="UFF | Week 1 Game Recap&#10;KANSAS CITY JAZZ 6 — 0 SHIROISHI SAMURAI&#10;...">${resDraft ? resDraft.text : ""}</textarea>
          <div id="resPreview">${resultPreview()}</div>
        </div>
        ${saved.length ? `
          <div class="card list-card admin-list">
            ${saved.map(({ g, wk }) => `
              <div class="list-row">
                <span><span class="muted small">W${wk.week}</span> ${g.id} &middot; ${g.teams[0]} ${g.score[0]}-${g.score[1]} ${g.teams[1]}</span>
                <button class="btn btn-ghost btn-sm" data-del-result="${g.id}">Delete</button>
              </div>`).join("")}
          </div>` : ""}
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
    ["demand", /^(.*?)\s+has\s+demanded\s+(?:a\s+release\s+)?(?:from\s+)?(.+?)[\s!.]*$/i]
  ];
  const localDay = (d = new Date()) => d.toLocaleDateString("en-CA");
  const to24 = (h, m, ap) => `${String((Number(h) % 12) + (/p/i.test(ap) ? 12 : 0)).padStart(2, "0")}:${m}`;

  // "@2 trey (@Aloneinnewyorkcity)®" -> "2 trey", "@desiredsantana®" -> "desiredsantana"
  function mentionName(s) {
    s = s.trim().replace(/^@/, "");
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
    let cur = null, wantBy = false;
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
      for (const [type, re] of TX_EVENTS) {
        const m = line.match(re);
        if (!m) continue;
        cur = { type, player: rename(mentionName(m[1])) };
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

  function admin() {
    const session = getAdmin();
    const user = session && session.user;
    if (user) {
      const finals = LEAGUE.schedule.reduce((n, w) => n + w.games.filter((g) => Array.isArray(g.score)).length, 0);
      const games = LEAGUE.schedule.reduce((n, w) => n + w.games.length, 0);
      return `
        <div class="wrap">
          <div class="page-head page-head--row">
            <div>
              <h1>Admin</h1>
              <p class="muted">Logged in as <strong>${user}</strong></p>
            </div>
            <button class="btn btn-ghost" id="adminLogout">Log out</button>
          </div>
          <div class="stat-chips admin-chips">
            <div class="card stat-chip"><span class="eyebrow">Teams</span><span class="num">${TEAMS.length}</span></div>
            <div class="card stat-chip"><span class="eyebrow">Games final</span><span class="num">${finals} / ${games}</span></div>
            <div class="card stat-chip"><span class="eyebrow">Updates</span><span class="num">${UPDATES.length}</span></div>
            <div class="card stat-chip"><span class="eyebrow">Legacy players</span><span class="num">${LEAGUE.legacy.players.length}</span></div>
          </div>
          ${flashBox()}
          ${resultsSection()}
          ${transactionsSection()}
          ${positionsSection()}
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
            ${adminError ? `<p class="login-error">${adminError}</p>` : ""}
            <button class="btn btn-primary login-btn" type="submit">Log in</button>
          </form>
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
    compare: placeholder("Compare", "Head-to-head comparisons are on the way."),
    awards,
    playoff: placeholder("Playoff", "The playoff bracket will be revealed later in the season."),
    legacy,
    records,
    updates,
    admin
  };

  /* ---------- Router ---------- */

  const app = document.getElementById("app");
  const nav = document.getElementById("nav");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");

  document.getElementById("seasonNum").textContent = `Season ${LEAGUE.season}`;
  document.getElementById("seasonYear").textContent = LEAGUE.year;
  document.querySelectorAll(".brand img").forEach((img) => (img.src = LEAGUE.brandLogo));

  nav.innerHTML = NAV.map(
    (n) => `<a href="#/${n.path}" data-path="${n.path}">${icon(n.icon)}<span>${n.label}</span></a>`
  ).join("");

  function render() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const [section, sub] = parts;
    if (section === "schedule" && sub) scheduleWeek = Number(sub);
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
    const page = section === "teams" && sub ? () => team(sub)
      : section === "players" && sub ? () => player(sub)
      : ROUTES[section] || notFound;
    app.innerHTML = page();
    nav.querySelectorAll("a").forEach((a) =>
      a.classList.toggle("active", a.dataset.path === (section || ""))
    );
    document.getElementById("adminLink").classList.toggle("active", section === "admin");
    if (section !== "admin") adminError = adminFlash = "";
    const label = NAV.find((n) => n.path === (section || ""));
    document.title = label && label.path ? `${label.label} | UFF` : "UFF | United Flag Football";
    closeMenu();
    window.scrollTo(0, 0);
  }

  function closeMenu() {
    sidebar.classList.remove("open");
    scrim.classList.remove("show");
  }
  document.getElementById("menuBtn").addEventListener("click", () => {
    sidebar.classList.add("open");
    scrim.classList.add("show");
  });
  scrim.addEventListener("click", closeMenu);

  app.addEventListener("submit", async (e) => {
    const id = e.target.id;
    if (id !== "posForm" && id !== "adminLogin") return;
    e.preventDefault();
    const form = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    adminError = adminFlash = "";
    try {
      if (id === "posForm") await savePosition(form);
      else {
        const s = await adminCall({ action: "login", username: String(form.get("username") || ""), password: String(form.get("password") || "") });
        setAdmin({ user: s.username, token: s.token });
      }
    } catch (err) {
      adminError = err.message;
    }
    render();
  });

  const showResultPreview = () => { document.getElementById("resPreview").innerHTML = resultPreview(); };

  app.addEventListener("click", async (e) => {
    const t = e.target;
    if (t.id === "resClear") { resDraft = null; render(); return; }
    if (t.id === "txClear") { txDraft = null; render(); return; }
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
      if (del && !confirm(`Delete the result for ${del}? Its score and stats come off the site.`)) return;
      t.disabled = true;
      try {
        if (del) {
          await adminCall({ action: "deleteResult", id: del });
          reloadWithFlash(`Deleted the result for ${del}.`);
        } else {
          const g = allGames().find(({ g }) => g.id === resDraft.gameId).g;
          const r = recapResult(resDraft.recap, g);
          await adminCall({ action: "saveResult", result: r, source: resDraft.text });
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
    if (e.target.id === "resPaste") {
      updateResultDraft(e.target.value);
      showResultPreview();
      return;
    }
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

  app.addEventListener("change", (e) => {
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
  });

  window.addEventListener("hashchange", render);
  render();
})();
