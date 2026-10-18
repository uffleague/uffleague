// League data. Update records here when new standings come in.
// w = wins, l = losses, pf = points for, pa = points against, streak e.g. "W2" or "L1"
// Teams are listed in the order they appear in the standings.
const LEAGUE = {
  name: "United Flag Football",
  short: "UFF",
  season: 7,
  year: 2026,
  brandLogo: "logo-main.png", // sidebar + home page logo
  // Team logos: add logo: "logos/<file>.png" to a team. Teams without one use logo.png.
  // Awards shown on the Awards page. featured: true = big card in the top row.
  awards: [
    { code: "MVP", name: "Most Valuable Player", featured: true },
    { code: "OPOTY", name: "Offensive Player of the Year", featured: true },
    { code: "DPOTY", name: "Defensive Player of the Year", featured: true },
    { code: "UFB_MVP", name: "UFB MVP" },
    { code: "QBOTY", name: "Quarterback of the Year" },
    { code: "RBOTY", name: "Runningback of the Year" },
    { code: "WROTY", name: "Wide Receiver of the Year" },
    { code: "TEOTY", name: "Tight End of the Year" },
    { code: "DBOTY", name: "Defensive Back of the Year" },
    { code: "DEOTY", name: "Defensive End of the Year" },
    { code: "LBOTY", name: "Linebacker of the Year" },
    { code: "ROTY", name: "Rookie of the Year" },
    { code: "HCOTY", name: "Head Coach of the Year" },
    { code: "EOTY", name: "Executive of the Year" },
    { code: "TOTY", name: "Team of the Year" },
    // optional: true = hidden on past seasons that have no winners recorded
    { code: "CROWN", name: "Crown", optional: true, icon: "legacy" },
    { code: "FLAG_TITLE", name: "Flag Title", optional: true, icon: "playoff" },
    { code: "COTY", name: "City of the Year", optional: true, icon: "home" }
  ],
  // Award winners by season.
  //   "name"                               -> player who won
  //   { player: "name", team: "Team" }     -> player + team (shows team logo if it's a current team)
  //   { team: "Team", record: "7-0" }      -> team award
  //   ["name", "name", ...]                -> several winners (repeat a name for multiple wins)
  //   "N/A"                                -> award wasn't given that season
  // Awards left out show "Not yet awarded".
  awardWinners: {
    1: {
      MVP: "n4w", OPOTY: "n4w", DPOTY: "synappseuser", UFB_MVP: "rosewood",
      QBOTY: "JvkeThingz", TEOTY: "shazamzq", WROTY: "grimacc", DBOTY: "synappseuser",
      LBOTY: "grimacc", DEOTY: "shazamzq", RBOTY: "karra",
      HCOTY: "JvkeThingz", TOTY: { team: "Vicksburg Vortex" },
      COTY: ["n4w", "discoversoul", "jvkethings", "xjupp"]
    },
    2: {
      MVP: "dictator 10", OPOTY: "lord 9", DPOTY: "breakxu", UFB_MVP: "glockyinmywaist",
      QBOTY: "dictator 10", TEOTY: "shazamzq", WROTY: "glockyinmywaist", DBOTY: "depthacfler",
      LBOTY: "N/A", DEOTY: "shazamzq", RBOTY: "fooge",
      ROTY: "1021Juice", HCOTY: "firmy", EOTY: "MarDimes", TOTY: { team: "Deltabay Dolphins", record: "7-0" },
      COTY: ["130kami", "zach"]
    },
    3: {
      MVP: "breakxu", OPOTY: "biglester", DPOTY: "n4w", UFB_MVP: "130kami",
      QBOTY: "hellraiser000", TEOTY: "day", WROTY: "splndd", DBOTY: "mr_devy1122",
      LBOTY: "ast1", DEOTY: "lord 9", RBOTY: "breakxu",
      ROTY: "spacemakin", HCOTY: "biglester", EOTY: "Davivibez", TOTY: { team: "Shiroishi Samurai", record: "7-1" },
      COTY: ["fraeology", "mr_devy1122", "rcbkailer"]
    },
    4: {
      MVP: "lord 9", OPOTY: "wery", DPOTY: "knqq", UFB_MVP: "N/A",
      QBOTY: "JvkeThingz", TEOTY: "day", WROTY: "SolaceInPerishing", DBOTY: "lord 9",
      LBOTY: "Galan101dragon20", DEOTY: "knqq", RBOTY: "N/A",
      ROTY: "Conaments", HCOTY: "JvkeThingz", EOTY: "Ccore", TOTY: { team: "Seminola Spartians", record: "6-0" },
      COTY: ["n4w", "xjupp", "rcbkailer"]
    },
    5: {
      MVP: "breakxu", OPOTY: "biglester", DPOTY: "knqq", UFB_MVP: "n4w",
      QBOTY: "Soto1s", TEOTY: "phentric", WROTY: "Curfaw", DBOTY: "ast1",
      LBOTY: "breakxu", DEOTY: "knqq", RBOTY: "JvkeThingz",
      ROTY: "VampViolence", HCOTY: "JvkeThingz", EOTY: "1021Juice", TOTY: { team: "Seminola Spartians" },
      COTY: ["coaserh", "discoversoul", "jvkethings", "Kevskiiiiiii", "knql", "Nxstalgjc", "xjupp"]
    },
    6: {
      MVP: "dictator 10", OPOTY: "Kamil08", DPOTY: "mr_devy1122", UFB_MVP: "Kamil08",
      QBOTY: "biglester", TEOTY: "elim", WROTY: "yavient", DBOTY: "kevski",
      LBOTY: "knql", DEOTY: "day", RBOTY: "biglester",
      ROTY: "cooks", HCOTY: "coldview", EOTY: "day", TOTY: { team: "Sinaloa Red Devils", record: "11-0" },
      CROWN: ["dictator 10", "Kamil08", "elim", "day"],
      FLAG_TITLE: ["mr_devy1122", "1021juice", "zach", "andre", "zach", "zach", "knql"],
      COTY: ["n4w", "coaserh", "Descended", "elim", "ewikoro", "fraeology", "hurdle", "lord 9", "kuaz",
        "lynnvxd", "Omar", "xjupp", "romance", "sinsession", "splndd", "ty balla", "uufaailen"]
    },
    7: {}
  },
  // Stats page. Season stats add up automatically from the box scores of final games.
  // `from` = which box score section feeds the tab; `pos` = only players at that position.
  // You can also add rows by hand under season or allTime (same keys as the columns).
  stats: {
    // Rushing lines always go to DE. Receivers count as WR and defenders as DB unless listed here,
    // e.g. "sk8erboy111": "TE", "i56gwe": "LB".
    // A player who plays both sides can have two: "breakxu": ["TE", "LB"].
    positions: {},
    // `allTime` = how the All-Time tab looks (same layout as the old stat sheets). Its rows come from the
    // stats-alltime-*.js sheets plus this season's box scores; `fpts` scores this season's games the way the sheets did.
    categories: [
      { key: "QB", from: "passing", sort: "yds", columns: [["comp", "CMP"], ["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["int", "INT"], ["cmpPct", "CMP%"], ["lng", "LNG"], ["sacked", "SCKD"]],
        allTime: { sort: "fpts", fpts: { yds: 0.04, td: 4, int: -4 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["comp", "CMP"], ["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["int", "INT"]] } },
      { key: "RB", sort: "yds", columns: [["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["ypc", "YPC"], ["fum", "FUM"], ["plus20", "20+"], ["lng", "LNG"]],
        allTime: { from: "rushing", sort: "fpts", fpts: { yds: 1, td: 20 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["fum", "FUM"]] } },
      { key: "WR", from: "receiving", pos: "WR", sort: "yds", columns: [["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"], ["lng", "LNG"]],
        allTime: { sort: "fpts", fpts: { yds: 0.1, td: 6 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"]] } },
      { key: "TE", from: "receiving", pos: "TE", sort: "yds", columns: [["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"], ["lng", "LNG"]],
        allTime: { sort: "fpts", fpts: { yds: 0.1, td: 6 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"]] } },
      { key: "Tackles", from: "defense", sort: "tak", columns: [["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["pbu", "PBU"], ["int", "INT"]],
        allTime: { sort: "fpts", fpts: { tak: 1, tfl: 2 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tak", "TAK"], ["tfl", "TFL"]] } },
      { key: "DE", from: "rushing", sort: "yds", columns: [["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["ypc", "YPC"], ["fum", "FUM"], ["plus20", "20+"], ["lng", "LNG"]],
        allTime: { from: "defense", sort: "fpts", fpts: { sck: 1, saf: 2 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["sck", "SCK"], ["saf", "SAF"]] } },
      { key: "DB", from: "defense", pos: "DB", sort: "int", columns: [["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["saf", "SAF"], ["swat", "SWAT"], ["int", "INT"], ["pbu", "PBU"], ["pre", "PRE"], ["td", "TD"]],
        allTime: { sort: "fpts", fpts: { int: 1, pbu: 0.5 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["int", "INT"], ["pbu", "PBU"]] } },
      // The old LB sheet's FPTS used stats it didn't show, so this season's LB points are a best guess
      { key: "LB", from: "defense", pos: "LB", sort: "tak", columns: [["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["saf", "SAF"], ["swat", "SWAT"], ["int", "INT"], ["pbu", "PBU"], ["pre", "PRE"], ["td", "TD"]],
        allTime: { sort: "fpts", fpts: { tak: 1, tfl: 2, sck: 1, saf: 2, int: 1, pbu: 0.5 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["int", "INT"]] } }
    ],
    season: { QB: [], RB: [], WR: [], TE: [], Tackles: [], DE: [], DB: [], LB: [] },
    allTime: {} // filled from stats-alltime-*.js
  },
  // Old Discord nicknames -> the name used on the site. Applied when pasting stats or transactions.
  aliases: {
    "IIIIIIIIIIII": "lord 9", "IlIIIllIllIIllIlI": "lord 9", "✷": "n4w", "✴": "n4w",
    "ella": "breakxu", "jmr": "jvkethings", "sla": "splndd", "PrincessKitty5897": "xjupp",
    "DoobyDoo": "fooge", "sky": "youngvtee", "big phil": "seaboy", "vmp": "vampviolences",
    "raskal": "phentric", "User171718": "goatnotgood", "kamill08": "Kamil08", "kamil08": "Kamil08",
    "biglester1": "BIGGIECHEESE",
    // Same players under different names on the old all-time stat sheets
    "Drivxon": "breakxu", "JvkeThingz": "jvkethings", "soto1s": "soto", "Kevskiiiiiiii": "Kevskiiiiiii",
    "coIdview": "coldview", "3va8dkq1zafjmxtn": "3vo8dkq1zafjmxtn", "hello78alt3": "helloo78alt3",
    "gamerpony4182": "gamerpony4132", "settIe": "settle", "Iaddmcconkey": "laddmcconkey",
    "loverIoverlover": "248","influencethekilI": "influencethekill", "depthqcfler": "depthacfler",
    "t1memanagement": "tlmemanagement", "maIikvrt": "maiikvrt", "nichelarpers": "day", "cooks423": "cooks", "t8l": "dictator 10",
    // Award winners listed under a shorter or misspelled name
    "biglester": "BIGGIECHEESE", "kevski": "Kevskiiiiiii", "VampViolence": "vampviolences", "yavient": "Yavientt",
    "affused": "lord 9", "2687affused982673260": "lord 9", "touchdenim": "denim",
    // Head coaches' usernames (from the Season 7 coaches list) -> the name they go by
    "Aloneinnewyorkcity": "2 trey", "marmersie": "msuede", "loverloverlover": "248", "jumpbaI": "splndd"
  },
  // Fantasy points per stat, used to rank Award Candidates. Change these to match your league.
  fantasy: {
    passing: { yds: 0.04, td: 4, int: -2 },
    rushing: { yds: 0.1, td: 6, fum: -2 },
    receiving: { rec: 1, yds: 0.1, td: 6 },
    defense: { tak: 1, tfl: 1, sck: 2, saf: 2, swat: 1, int: 3, pbu: 1, pre: 0.5, td: 6 }
  },
  // Award Candidates: which box score sections count for each award, and (optional) position.
  // Rushing counts as defense here because rushing lines are DE stats.
  candidates: [
    { code: "MVP", name: "Most Valuable Player", groups: ["passing", "rushing", "receiving", "defense"] },
    { code: "OPOTY", name: "Offensive Player of the Year", groups: ["passing", "receiving"] },
    { code: "DPOTY", name: "Defensive Player of the Year", groups: ["defense", "rushing"] },
    { code: "QBOTY", name: "Quarterback of the Year", groups: ["passing"] },
    { code: "WROTY", name: "Wide Receiver of the Year", groups: ["receiving"], pos: "WR" },
    { code: "TEOTY", name: "Tight End of the Year", groups: ["receiving"], pos: "TE" },
    { code: "DBOTY", name: "Defensive Back of the Year", groups: ["defense"], pos: "DB" },
    { code: "DEOTY", name: "Defensive End of the Year", groups: ["rushing"] },
    { code: "LBOTY", name: "Linebacker of the Year", groups: ["defense"], pos: "LB" }
  ],
  // Updates page (shown newest first). type: "sign", "demand", "release" or "promotion".
  // time is 24-hour ("13:05" = 1:05 PM). Optional: by (who offered), note, role (for promotions).
  //   { date: "2026-10-17", time: "13:05", type: "sign", player: "breakxu", team: "Columbus Colts", by: "zlssei" },
  // Signings add the player to that team's roster (and take them off any old team);
  // demands and releases take them off the team.
  updates: [
    { date: "2026-10-17", time: "00:11", type: "sign", player: "CountTo5", team: "Toronto Maples", by: "zlssei" },
    { date: "2026-10-17", time: "00:15", type: "sign", player: "vboppppppppppp", team: "Baltimore Bluejays", by: "breakxu" },
    { date: "2026-10-17", time: "00:40", type: "sign", player: "vboppppppppppp", team: "Baltimore Bluejays", by: "breakxu" },
    { date: "2026-10-17", time: "00:43", type: "sign", player: "curfaw", team: "Toronto Maples", by: "zlssei" },
    { date: "2026-10-17", time: "00:58", type: "sign", player: "1vo", team: "New Orleans Raiders" },
    { date: "2026-10-17", time: "01:35", type: "sign", player: "ggglory", team: "New Orleans Raiders", by: "BIGGIECHEESE" },
    { date: "2026-10-17", time: "01:42", type: "sign", player: "dddddddddddddddddddd", team: "Baltimore Bluejays", by: "breakxu" },
    { date: "2026-10-17", time: "05:48", type: "sign", player: "vile", team: "Baltimore Bluejays", by: "breakxu" },
    { date: "2026-10-17", time: "06:25", type: "sign", player: "mirrorless22", team: "Toronto Maples", by: "zlssei" },
    { date: "2026-10-17", time: "06:59", type: "sign", player: "Wockiiiiiiii", team: "New Orleans Raiders", by: "BIGGIECHEESE" },
    { date: "2026-10-17", time: "07:22", type: "sign", player: "SUPERKITOBOY9999", team: "Pittsburg Sentinels", by: "2 trey" },
    { date: "2026-10-17", time: "07:23", type: "sign", player: "uufaailen", team: "Pittsburg Sentinels", by: "2 trey" },
    { date: "2026-10-17", time: "07:29", type: "sign", player: "ssvior", team: "Pittsburg Sentinels", by: "2 trey" },
    { date: "2026-10-17", time: "07:29", type: "sign", player: "soto", team: "Pittsburg Sentinels", by: "2 trey" },
    { date: "2026-10-17", time: "07:29", type: "sign", player: "tony", team: "Pittsburg Sentinels", by: "2 trey" },
    { date: "2026-10-17", time: "07:30", type: "sign", player: "korrupt", team: "Pittsburg Sentinels", by: "2 trey" },
    { date: "2026-10-17", time: "08:30", type: "sign", player: "kuaz", team: "Vienna Angels", by: "Kamil08" },
    { date: "2026-10-17", time: "08:36", type: "sign", player: "lord 9", team: "Vienna Angels", by: "Kamil08" },
    { date: "2026-10-17", time: "08:50", type: "sign", player: "peachi", team: "New Orleans Raiders", by: "BIGGIECHEESE" },
    { date: "2026-10-17", time: "08:56", type: "sign", player: "zocist", team: "Vienna Angels", by: "Kamil08" },
    { date: "2026-10-17", time: "09:04", type: "sign", player: "Omar", team: "Baltimore Bluejays", by: "breakxu" },
    { date: "2026-10-17", time: "09:19", type: "sign", player: "erixflocks", team: "Sarnia City Broncos", by: "desiredsantana" },
    { date: "2026-10-17", time: "09:23", type: "sign", player: "5kaiju", team: "Vienna Angels", by: "Kamil08" },
    { date: "2026-10-17", time: "09:38", type: "sign", player: "FreeMind", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "09:40", type: "sign", player: "影影影影", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "09:42", type: "sign", player: "kamasi", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "09:55", type: "sign", player: "2grok", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "10:03", type: "sign", player: "brian", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "10:23", type: "sign", player: "Sigma", team: "Toronto Maples", by: "zlssei" },
    { date: "2026-10-17", time: "10:24", type: "sign", player: "goatnotgood", team: "New Orleans Raiders", by: "BIGGIECHEESE" },
    { date: "2026-10-17", time: "10:26", type: "sign", player: "handofchrist", team: "Sarnia City Broncos", by: "desiredsantana" },
    { date: "2026-10-17", time: "10:47", type: "sign", player: "mr_devy1122", team: "Vienna Angels", by: "Kamil08" },
    { date: "2026-10-17", time: "11:04", type: "sign", player: "alfe", team: "New Orleans Raiders", by: "BIGGIECHEESE" },
    { date: "2026-10-17", time: "11:05", type: "sign", player: "Audemar", team: "Detroit Dynasty", by: "fox balla" },
    { date: "2026-10-17", time: "11:06", type: "sign", player: "wraams", team: "Detroit Dynasty", by: "fox balla" },
    { date: "2026-10-17", time: "11:18", type: "sign", player: "xavier", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "11:41", type: "sign", player: "inltf", team: "Toronto Maples", by: "sec" },
    { date: "2026-10-17", time: "11:48", type: "sign", player: "stunaaaaaaaaaaaaa", team: "Olympia Owls", by: "fooge" },
    { date: "2026-10-17", time: "11:48", type: "sign", player: "xjupp", team: "Olympia Owls", by: "fooge" },
    { date: "2026-10-17", time: "11:51", type: "sign", player: "lazerjoenuts", team: "Toronto Maples", by: "sec" },
    { date: "2026-10-17", time: "11:57", type: "sign", player: "dictator 10", team: "Olympia Owls", by: "fooge" },
    { date: "2026-10-17", time: "12:00", type: "sign", player: "day", team: "Olympia Owls", by: "fooge" },
    { date: "2026-10-17", time: "12:06", type: "sign", player: "DracoDemonEdward", team: "Olympia Owls", by: "fooge" },
    { date: "2026-10-17", time: "12:24", type: "sign", player: "pravings", team: "Olympia Owls", by: "fooge" },
    { date: "2026-10-17", time: "12:25", type: "sign", player: "hurdle", team: "Vienna Angels", by: "Kamil08" },
    { date: "2026-10-17", time: "12:39", type: "sign", player: "DJ Reign", team: "Detroit Dynasty", by: "fox balla" },
    { date: "2026-10-17", time: "12:47", type: "sign", player: "Nznjdjdjzzj", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "12:48", type: "sign", player: "boomy", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "12:54", type: "sign", player: "InfamousBoogerEater", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "12:58", type: "sign", player: "Zyronewalt", team: "Detroit Dynasty", by: "fox balla" },
    { date: "2026-10-17", time: "13:07", type: "sign", player: "5eo", team: "Detroit Dynasty", by: "fox balla" },
    { date: "2026-10-17", time: "13:14", type: "sign", player: "ExceepXXIX", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "13:37", type: "sign", player: "Ave", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "14:02", type: "sign", player: "chiron", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "14:10", type: "sign", player: "Devin", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "14:17", type: "sign", player: "eazy", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "14:46", type: "sign", player: "Joshua Van", team: "Rose City Reapers", by: "ACTIVIST000" },
    { date: "2026-10-17", time: "14:57", type: "sign", player: "knql", team: "San Francisco Miners", by: "sk8erboy111" },
    { date: "2026-10-17", time: "14:58", type: "sign", player: "jvkethings", team: "San Francisco Miners", by: "sk8erboy111" },
    { date: "2026-10-17", time: "15:00", type: "sign", player: "Kevskiiiiiii", team: "San Francisco Miners", by: "sk8erboy111" },
    { date: "2026-10-17", time: "15:02", type: "sign", player: "vboppppppppppp", team: "San Francisco Miners", by: "sk8erboy111" },
    { date: "2026-10-17", time: "15:12", type: "sign", player: "shazam", team: "San Francisco Miners", by: "sk8erboy111" },
    { date: "2026-10-17", time: "15:13", type: "sign", player: "AsianAustra", team: "Shiroishi Samurai", by: "Vljla6i" },
    { date: "2026-10-17", time: "15:23", type: "sign", player: "Jack", team: "Pittsburg Sentinels", by: "2 trey" },
    { date: "2026-10-17", time: "15:23", type: "promotion", player: "SUPERKITOBOY9999", team: "Pittsburg Sentinels", role: "Assistant Head Coach", by: "2 trey" },
    { date: "2026-10-17", time: "21:36", type: "promotion", player: "denim", team: "Baltimore Bluejays", role: "Assistant Coach" }
  ],
  // Schedule. Each game lists its two teams (names must match the teams below).
  // Optional: time: "Sat 8 PM EST" once it's set, score: [21, 14] once it's final (same order as teams).
  // Final scores are added to the teams' W/L, PF/PA and streak automatically.
  // Optional on a final: date, potg (player of the game), box: [team 1 stats, team 2 stats]
  // with passing / rushing / receiving / defense lists, e.g.
  //   box: [{ passing: [{ player: "breakxu", comp: 2, att: 6, yds: 65, td: 1, int: 0, lng: 54, sacked: 1 }] },
  //         { defense: [{ player: "i56gwe", tak: 2, tfl: 1, sck: 1, int: 0, pbu: 3 }] }]
  // Results entered on the Admin page are stored on the server and added on top of these.
  // Division / conference / non-conference is worked out from the teams automatically.
  // Format: { series: 1, week: 1, games: [{ id: "W1-1", teams: ["Novasota Wolf Pack", "San Jose Scarecrows"] }, ...] }
  schedule: [],
  // Records page. Each record: label, holders (one or more names), value, and season if single-season.
  // Single-season: `stat` = box score stat this season's games are checked against; beating the record replaces it.
  // Career: `career` = All-Time stat tabs + stat to add up; holders and value are worked out from the All-Time stats.
  records: [
    {
      group: "Single-Season Records",
      sections: [
        { name: "Passing", items: [
          { label: "Most Passing Yards", holders: ["soto"], value: "5,190", season: 5, stat: "passing.yds" },
          { label: "Most Passing TDs", holders: ["soto"], value: "48", season: 5, stat: "passing.td" },
          { label: "Most Passing Attempts", holders: ["youngvtee"], value: "226", season: 3, stat: "passing.att" },
          { label: "Most Completions", holders: ["wery"], value: "160", season: 5, stat: "passing.comp" },
          { label: "Most Interceptions Thrown", holders: ["Vljla6i"], value: "18", season: 4, stat: "passing.int" }
        ] },
        { name: "Receiving", items: [
          { label: "Most Receiving Yards", holders: ["n4w"], value: "2,436", season: 1, stat: "receiving.yds" },
          { label: "Most Receiving TDs", holders: ["n4w"], value: "25", season: 1, stat: "receiving.td" },
          { label: "Most Receptions", holders: ["lord 9"], value: "46", season: 4, stat: "receiving.rec" }
        ] },
        { name: "Rushing", items: [
          { label: "Most Rushing Yards", holders: ["breakxu"], value: "359", season: 5, stat: "rushing.yds" },
          { label: "Most Rushing TDs", holders: ["breakxu"], value: "5", season: 3, stat: "rushing.td" },
          { label: "Most Rushing Attempts", holders: ["breakxu"], value: "21", season: 3, stat: "rushing.att" }
        ] },
        { name: "Defense", items: [
          { label: "Most Defensive INTs", holders: ["n4w", "synappseuser"], value: "13", season: 1, stat: "defense.int" },
          { label: "Most Tackles", holders: ["sk8erboy111"], value: "43", season: 5, stat: "defense.tak" },
          { label: "Most Pass Breakups", holders: ["stunaaaaaaaaaaaaa"], value: "8", season: 5, stat: "defense.pbu" },
          { label: "Most Sacks", holders: ["knqq"], value: "22", season: 5, stat: "defense.sck" },
          { label: "Most Safeties", holders: ["day"], value: "7", season: 6, stat: "defense.saf" }
        ] }
      ]
    },
    {
      group: "Career Records",
      sections: [
        { name: "Passing", items: [
          { label: "Most Career Passing Yards", career: ["QB.yds"] },
          { label: "Most Career Passing TDs", career: ["QB.td"] },
          { label: "Most Career Passing Attempts", career: ["QB.att"] },
          { label: "Most Career Completions", career: ["QB.comp"] },
          { label: "Most Career INTs Thrown", career: ["QB.int"] }
        ] },
        { name: "Receiving", items: [
          { label: "Most Career Receiving Yards", career: ["WR.yds", "TE.yds"] },
          { label: "Most Career Receiving TDs", career: ["WR.td", "TE.td"] },
          { label: "Most Career Receptions", career: ["WR.rec", "TE.rec"] }
        ] },
        { name: "Rushing", items: [
          { label: "Most Career Rushing Yards", career: ["RB.yds"] },
          { label: "Most Career Rushing TDs", career: ["RB.td"] }
        ] },
        { name: "Defense", items: [
          { label: "Most Career Tackles", career: ["Tackles.tak"] },
          { label: "Most Career Sacks", career: ["DE.sck"] },
          { label: "Most Career Defensive INTs", career: ["DB.int", "LB.int"] },
          { label: "Most Career Pass Breakups", career: ["DB.pbu"] },
          { label: "Most Career Tackles for Loss", career: ["Tackles.tfl"] },
          { label: "Most Career Safeties", career: ["DE.saf"] }
        ] }
      ]
    },
    {
      group: "Team, Awards & Legacy",
      sections: [
        { name: "Team", items: [
          { label: "Longest Winning Streak", holders: ["Sinaloa Red Devils"], value: "11" },
          { label: "Best Single-Season Record", holders: ["Sinaloa Red Devils"], value: "11–0" }
        ] },
        { name: "Achievements", items: [
          { label: "Most Valuable Awards", holders: ["breakxu", "n4w"], value: "3 each" },
          { label: "Most Rings", holders: ["coaserh", "lord 9", "Kamil08"], value: "3" },
          { label: "Most Positional Awards", holders: ["shazam"], value: "4" },
          { label: "Most Crowns", holders: ["day"], value: "3" },
          { label: "Most Titles", holders: ["mr_devy1122", "lord 9", "splndd"], value: "5" },
          { label: "Most All-Pro Selections", holders: ["stunaaaaaaaaaaaaa"], value: "7" }
        ] }
      ]
    }
  ],
  // Legacy page: points a player earns for each honor, and the tiers.
  // Honors not in `points` show on the player but add 0 points until given a value here.
  legacy: {
    // Set to true to show the player rankings on the site.
    showPlayers: true,
    points: [
      { label: "UFB Champion / UFB MVP / MVP / OPOTY / DPOTY / ROTY / EXEOTY / City of the Year", value: 50, codes: ["UFB_CHAMP", "UFB_MVP", "MVP", "OPOTY", "DPOTY", "ROTY", "EXEOTY", "COTY"] },
      { label: "Positional awards, Crown, HCOTY, JRNOTY, SOTY & MOTY", value: 32, codes: ["QBOTY", "RBOTY", "WROTY", "TEOTY", "DBOTY", "DEOTY", "LBOTY", "CROWN", "HCOTY", "JRNOTY", "SOTY", "MOTY"] },
      { label: "First Team All Flag", value: 16, codes: ["FIRST_TEAM"] },
      { label: "Flag Title", value: 16, codes: ["FLAG_TITLE"] },
      { label: "Second Team All Flag", value: 8, codes: ["SECOND_TEAM"] }
    ],
    // Hall of Fame inductees (chosen, not points-based). Names must match players below.
    hallOfFame: ["dictator 10", "lord 9"],
    tiers: [
      { name: "Ultra", min: 1600, color: "ultra" },
      { name: "Legend", min: 1200, color: "legend" },
      { name: "Superstar", min: 850, color: "superstar" },
      { name: "Specialist", min: 600, color: "specialist" },
      { name: "Veteran", min: 400, color: "veteran" },
      { name: "All-Pro", min: 250, color: "allpro" },
      { name: "Pro", min: 100, color: "pro" }
    ],
    // Short names shown on each player's honor chips
    labels: {
      UFB_CHAMP: "UFB Champ", UFB_MVP: "UFB MVP", FLAG_TITLE: "Flag Title", CROWN: "Crown", COTY: "City of the Year",
      FIRST_TEAM: "1st Team All-Flag", SECOND_TEAM: "2nd Team All-Flag"
    },
    // From the Discord roles (nicknames). Number = how many times they have it.
    // bonus = extra points on top of their roles (for totals set by the league).
    players: [
      { name: "n4w", honors: { COTY: 3, UFB_CHAMP: 2, UFB_MVP: 1, MVP: 1, OPOTY: 1, DPOTY: 1, CROWN: 1, FLAG_TITLE: 2, FIRST_TEAM: 2, SECOND_TEAM: 3 } },
      { name: "lord 9", honors: { COTY: 1, UFB_CHAMP: 3, MVP: 1, OPOTY: 1, DEOTY: 1, DBOTY: 1, CROWN: 2, FLAG_TITLE: 5, FIRST_TEAM: 4 } },
      { name: "dictator 10", honors: { UFB_CHAMP: 2, MVP: 2, QBOTY: 1, CROWN: 1, FIRST_TEAM: 2, SECOND_TEAM: 2, HCOTY: 1 } },
      { name: "shazam", honors: { UFB_CHAMP: 2, TEOTY: 2, DEOTY: 2, CROWN: 2 } },
      { name: "mr_devy1122", honors: { COTY: 1, UFB_CHAMP: 1, DPOTY: 1, DBOTY: 1, FLAG_TITLE: 5, FIRST_TEAM: 3, SECOND_TEAM: 2 } },
      { name: "BIGGIECHEESE", honors: { OPOTY: 2, QBOTY: 1, RBOTY: 1, FLAG_TITLE: 4, FIRST_TEAM: 2, SECOND_TEAM: 2 } },
      { name: "Kamil08", honors: { UFB_CHAMP: 3, UFB_MVP: 1, OPOTY: 1 } },
      { name: "day", honors: { TEOTY: 2, DEOTY: 1, CROWN: 3, FIRST_TEAM: 3, EXEOTY: 1 } },
      { name: "rcbkailer", honors: { COTY: 2, UFB_CHAMP: 1, DBOTY: 1, LBOTY: 1, CROWN: 1, FLAG_TITLE: 2, FIRST_TEAM: 3, SECOND_TEAM: 1 }, bonus: 38 },
      { name: "splndd", honors: { COTY: 1, UFB_CHAMP: 1, WROTY: 1, FLAG_TITLE: 5, FIRST_TEAM: 4 } },
      { name: "breakxu", honors: { MVP: 2, DPOTY: 1, RBOTY: 1, LBOTY: 1, HCOTY: 1 }, bonus: 258 },
      { name: "jvkethings", honors: { COTY: 2, QBOTY: 1, RBOTY: 1, CROWN: 2, FIRST_TEAM: 3, SECOND_TEAM: 2 }, bonus: 125 },
      { name: "130kami", honors: { COTY: 1, UFB_CHAMP: 2, UFB_MVP: 1, FIRST_TEAM: 2 } },
      { name: "rosewood", honors: { UFB_CHAMP: 2, UFB_MVP: 1, FIRST_TEAM: 1, SECOND_TEAM: 2 } },
      { name: "coaserh", honors: { COTY: 2, UFB_CHAMP: 3, FIRST_TEAM: 2 } },
      { name: "elim", honors: { COTY: 1, UFB_CHAMP: 2, TEOTY: 1, CROWN: 1, FIRST_TEAM: 1 } },
      { name: "synappseuser", honors: { UFB_CHAMP: 1, DPOTY: 1, DBOTY: 1, FLAG_TITLE: 1, FIRST_TEAM: 1 } },
      { name: "zach", honors: { COTY: 1, UFB_CHAMP: 2, FLAG_TITLE: 3, SECOND_TEAM: 1 } },
      { name: "hurdle", honors: { COTY: 1, UFB_CHAMP: 2, FIRST_TEAM: 2, SECOND_TEAM: 2, HCOTY: 1 } },
      { name: "wery", honors: { OPOTY: 1, QBOTY: 1, FLAG_TITLE: 2, FIRST_TEAM: 1, SECOND_TEAM: 2 } },
      { name: "fraeology", honors: { COTY: 2, UFB_CHAMP: 2, FIRST_TEAM: 1 } },
      { name: "hey", honors: { UFB_CHAMP: 1, DBOTY: 1, FIRST_TEAM: 2 } },
      { name: "sk8erboy111", honors: { UFB_CHAMP: 1, FLAG_TITLE: 2, FIRST_TEAM: 1, SECOND_TEAM: 2, ROTY: 1, EXEOTY: 1 } },
      { name: "ewikoro", honors: { COTY: 1, UFB_CHAMP: 2 } },
      { name: "romance", honors: { COTY: 1, UFB_CHAMP: 1, LBOTY: 1, FIRST_TEAM: 1 } },
      { name: "fooge", honors: { UFB_CHAMP: 1, RBOTY: 1, FLAG_TITLE: 1 } },
      { name: "knqq", honors: { DPOTY: 2, DEOTY: 2 }, bonus: 144 },
      { name: "knql", honors: { COTY: 1, LBOTY: 1, FLAG_TITLE: 2, FIRST_TEAM: 1, SECOND_TEAM: 1 } },
      { name: "soto", honors: { QBOTY: 1, FLAG_TITLE: 2, FIRST_TEAM: 1 } },
      { name: "pravings", honors: { UFB_CHAMP: 1, FIRST_TEAM: 1, SECOND_TEAM: 1 } },
      { name: "curfaw", honors: { WROTY: 1, FIRST_TEAM: 2, SECOND_TEAM: 1 } },
      { name: "stunaaaaaaaaaaaaa", honors: { FLAG_TITLE: 1, FIRST_TEAM: 2, SECOND_TEAM: 3 } },
      { name: "Kevskiiiiiii", honors: { COTY: 1, DBOTY: 1, FIRST_TEAM: 2, JRNOTY: 1 } },
      { name: "uufaailen", honors: { COTY: 1, UFB_CHAMP: 1, SECOND_TEAM: 1 } },
      { name: "Dear Diary", honors: { UFB_CHAMP: 1, SECOND_TEAM: 1 } },
      { name: "Nxstalgjc", honors: { COTY: 1, WROTY: 1, FIRST_TEAM: 1, SECOND_TEAM: 1, ROTY: 1 } },
      { name: "Descended", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "kuaz", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "lynnvxd", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "Omar", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "xjupp", honors: { COTY: 4, UFB_CHAMP: 1 } },
      { name: "ty balla", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "10", honors: { UFB_CHAMP: 1 } },
      { name: "5kaiju", honors: { UFB_CHAMP: 1 } },
      { name: "seaboy", honors: { UFB_CHAMP: 1 } },
      { name: "influx", honors: { UFB_CHAMP: 1 } },
      { name: "offline9178393958402", honors: { UFB_CHAMP: 1 } },
      { name: "xoxo", honors: { UFB_CHAMP: 1 } },
      { name: "シシシシシシシシシシシシシシシシ", honors: { UFB_CHAMP: 1 } },
      { name: "130", honors: { UFB_CHAMP: 1 } },
      { name: "Mar", honors: { UFB_CHAMP: 1 } },
      { name: "reapadread", honors: { UFB_CHAMP: 1 } },
      { name: "youngvtee", honors: { FIRST_TEAM: 2, SECOND_TEAM: 2, HCOTY: 1 } },
      { name: "phentric", honors: { TEOTY: 1, FIRST_TEAM: 1 } },
      { name: "vboppppppppppp", honors: { FIRST_TEAM: 2, SECOND_TEAM: 2, MOTY: 1 } },
      { name: "SUPERKARBFULBOY9999", honors: { FIRST_TEAM: 3 } },
      { name: "Lance6i", honors: { CROWN: 1, SECOND_TEAM: 1 } },
      { name: "Jadnlations", honors: { SECOND_TEAM: 2 } },
      { name: "ggglory", honors: { SECOND_TEAM: 2 } },
      { name: "Made Her Suffer.", honors: { FIRST_TEAM: 1 } },
      { name: "gabe08130", honors: { SECOND_TEAM: 1 } },
      { name: "rip", honors: { SECOND_TEAM: 1 } },
      { name: "goatnotgood", honors: { SECOND_TEAM: 1 } },
      { name: "vampviolences", honors: { ROTY: 1 } },
      { name: "AncientDark", honors: { SOTY: 1 } },
      { name: "discoversoul", honors: { COTY: 2, SOTY: 1, MOTY: 1 } },
      { name: "sinsession", honors: { COTY: 1 } }
    ]
  },
  // coach = the team's head coach (shown on the team page and the Teams list)
  conferences: [
    {
      name: "Grand Central Conference",
      divisions: [
        {
          name: "North Division",
          teams: [
            { name: "Pittsburg Sentinels", coach: "2 trey", logo: "logos/pittsburg-sentinels.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Kansas City Jazz", coach: "rekid", logo: "logos/kansas-city-jazz.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Seattle Skyclaws", coach: "a1w", logo: "logos/seattle-skyclaws.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Havana Toroccoros", coach: "freudiah", logo: "logos/havana-toroccoros.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Baltimore Bluejays", coach: "breakxu", logo: "logos/baltimore-bluejays.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" }
          ]
        },
        {
          name: "South Division",
          teams: [
            { name: "New Orleans Raiders", coach: "BIGGIECHEESE", logo: "logos/new-orleans-raiders.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "San Jose Scarecrows", coach: "zay balla", logo: "logos/san-jose-scarecrows.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Detroit Dynasty", coach: "fox balla", logo: "logos/detroit-dynasty.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Sarnia City Broncos", coach: "desiredsantana", logo: "logos/sarnia-city-broncos.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Toronto Maples", coach: "zlssei", logo: "logos/toronto-maples.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" }
          ]
        }
      ]
    },
    {
      name: "The Ridge Conference",
      divisions: [
        {
          name: "North Division",
          teams: [
            { name: "Olympia Owls", coach: "fooge", logo: "logos/olympia-owls.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "San Francisco Miners", coach: "sk8erboy111", logo: "logos/san-francisco-miners.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Novasota Wolf Pack", coach: "Yacht", logo: "logos/novasota-wolf-pack.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Long Beach Pirates", coach: "splndd", logo: "logos/long-beach-pirates.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Vienna Angels", coach: "Kamil08", logo: "logos/vienna-angels.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" }
          ]
        },
        {
          name: "South Division",
          teams: [
            { name: "Columbus Colts", coach: "9kb2", logo: "logos/columbus-colts.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Costa Rica Pumas", coach: "msuede", logo: "logos/costa-rica-pumas.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Rose City Reapers", coach: "ACTIVIST000", logo: "logos/rose-city-reapers.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Shiroishi Samurai", coach: "Vljla6i", logo: "logos/shiroishi-samurai.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Plymouth Huskies", coach: "248", logo: "logos/plymouth-huskies.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" }
          ]
        }
      ]
    }
  ]
};
