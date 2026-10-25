// League data. Update records here when new standings come in.
// w = wins, l = losses, pf = points for, pa = points against, streak e.g. "W2" or "L1"
// Teams are listed in the order they appear in the standings.
// A team that folds gets disbanded: { date, time }. It stays listed with a Disbanded tag, a "Disbanded" row
// shows on Updates at that time, and its players become free agents.
const LEAGUE = {
  name: "United Flag Football",
  short: "UFF",
  season: 7,
  year: 2026,
  brandLogo: "logo-main.png", // sidebar + home page logo
  // Team logos: add logo: "logos/<file>.png" to a team. Teams without one use logo.png.
  // Change logoVersion whenever a logo file is replaced, so browsers load the new picture.
  logoVersion: "2026-10-18a",
  // United Flag Bowl logos by season (shown on Past Bowls above the score)
  bowlLogos: {
    2: "logos/bowls/ufb-2.png", 3: "logos/bowls/ufb-3.png", 4: "logos/bowls/ufb-4.png",
    5: "logos/bowls/ufb-5.png", 6: "logos/bowls/ufb-6.png", 7: "logos/bowls/ufb-7.png"
  },
  // Logos for teams from past seasons that aren't in the league now (Past Bowls, Team of the Year, brackets)
  pastTeams: {
    "Virginia Venom": "logos/past/virginia-venom.png",
    "Laredo Longhorns": "logos/past/laredo-longhorns.png",
    "Savannah Raiders": "logos/past/savannah-raiders.png",
    "Sinaloa Red Devils": "logos/past/sinaloa-red-devils.png",
    "Saskatoon Stampede": "logos/past/saskatoon-stampede.png",
    "New York Dragons": "logos/past/new-york-dragons.png",
    "Salem Snow Hawks": "logos/past/salem-snow-hawks.png",
    "Salem Snowhawks": "logos/past/salem-snow-hawks.png"
  },
  // Home page. Put graphics in the gfx/ folder (change logoVersion above when a picture is replaced).
  //   slides: the big rotating banner at the top. Best size 1920 x 600; keep the important part near the middle.
  //     { image: "gfx/ufb-7-banner.png", link: "#/playoff" }
  //     Optional text over the picture (leave it out if the text is in the graphic):
  //     kicker: "Road to the Bowl", title: "Sinaloa vs Salem", sub: "Toronto 2026", button: "View Bowl"
  //     No slides = the built-in league and bowl slides.
  //   gfx: the GFX panel at the bottom right of the home page (in place of Latest Moves) and the GFX page. The first one is the cover.
  //     { image: "gfx/<file>.jpg", title: "..." }  Put a small copy (560px wide) in gfx/thumbs/ with the same name.
  //   news: Latest News card (the first one shows). { title, sub, image, link, date: "2026-10-18", button: "Read More" }
  //     No news = the newest signing in that team's colors.
  //   powerRankings: team names (or codes) in order, 1-20 (top 10 show, "Show all" opens the rest). Empty = ranked by record.
  //   playoffCut: draws the predicted playoff cut line under that rank.
  //   social: links shown on the Latest Moves panel.
  home: {
    slides: [],
    gfx: [
      { image: "gfx/ea-flag-football-06.jpg", title: "EA Sports Flag Football 06" },
      { image: "gfx/season-four.jpg", title: "United Flag Football: Season Four" },
      { image: "gfx/tokyo-road-to-glory.jpg", title: "Tokyo: The Road to Glory" },
      { image: "gfx/flag-bowl-6-sinaloa-salem.jpg", title: "Flag Bowl VI: Sinaloa Red Devils vs Salem Snowhawks" },
      { image: "gfx/longhorns-champions.jpg", title: "Longhorns Lift the Trophy" },
      { image: "gfx/season-2-championship.jpg", title: "Season Two Championship: Chicago" },
      { image: "gfx/united-flag-bowl-spartans-blizzard.jpg", title: "United Flag Bowl: Spartans vs Blizzard" },
      { image: "gfx/united-flag-bowl-xx.jpg", title: "United Flag Bowl XX" },
      { image: "gfx/toronto-champions.jpg", title: "United Flag Bowl Champions: Toronto" },
      { image: "gfx/pro-bowl.jpg", title: "Pro Bowl: TRC vs GCC" },
      { image: "gfx/longhorns-halloween.jpg", title: "Longhorns: Halloween Edition" },
      { image: "gfx/bulldogs.jpg", title: "United Flag Football" },
      { image: "gfx/fooge-looking-for-revenge.jpg", title: "Fooge: Looking for Revenge" },
      { image: "gfx/milwaukee-legacy.jpg", title: "Milwaukee: A Legacy to Not Forget" },
      { image: "gfx/player-of-the-series.jpg", title: "Player of the Series" }
    ],
    news: [],
    powerRankings: [
      "San Francisco Miners", "Kansas City Jazz", "Toronto Maples", "Vienna Angels", "Olympia Owls",
      "Baltimore Bluejays", "Pittsburg Sentinels", "Costa Rica Pumas", "New Orleans Raiders", "San Jose Scarecrows",
      "Rose City Reapers", "Plymouth Huskies", "Shiroishi Samurai", "Seattle Skyclaws", "Novasota Wolf Pack",
      "Long Beach Pirates", "Detroit Dynasty", "Sarnia City Broncos", "Columbus Colts", "Havana Toroccoros"
    ],
    // A "Playoff cut (prediction)" line under this many teams in Power Rankings (0 = no line)
    playoffCut: 14,
    social: { discord: "", youtube: "", x: "", tiktok: "" },
    // VOD links to keep off the home page Featured Media (they stay on the VODs page)
    hideMedia: ["twitch.tv/videos/2900293561"]
  },
  // Team codes used in All-Flag posts (":SIN:") -> team name, for the logo. Current teams' codes work automatically.
  allFlagTeamCodes: { SIN: "Sinaloa Red Devils", SAV: "Savannah Raiders", SAL: "Salem Snowhawks", SHI: "Shiroishi Samurai" },
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
    // Defense lines also have YDA (yards allowed in coverage) and TDA (touchdowns allowed); lower is better.
    // Rushing lines go to RB. Receivers count as WR and defenders as DB unless listed here,
    // e.g. "sk8erboy111": "TE", "i56gwe": "LB", "knqq": "DE". Anyone with a sack, TFL, safety or pressure
    // on a defense line also shows on the DE tab.
    // A player who plays both sides can have two: "breakxu": ["TE", "LB"].
    positions: {},
    // `allTime` = how the All-Time tab looks (same layout as the old stat sheets). Its rows come from the
    // stats-alltime-*.js sheets plus this season's box scores; `fpts` scores this season's games the way the sheets did.
    categories: [
      { key: "QB", from: "passing", sort: "yds", columns: [["comp", "CMP"], ["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["int", "INT"], ["cmpPct", "CMP%"], ["lng", "LNG"], ["sacked", "SCKD"]],
        allTime: { sort: "fpts", fpts: { yds: 0.04, td: 4, int: -4 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["comp", "CMP"], ["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["int", "INT"]] } },
      { key: "RB", from: "rushing", sort: "yds", columns: [["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["ypc", "YPC"], ["fum", "FUM"], ["plus20", "20+"], ["lng", "LNG"]],
        allTime: { sort: "fpts", fpts: { yds: 1, td: 20 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["att", "ATT"], ["yds", "YDS"], ["td", "TD"], ["fum", "FUM"]] } },
      { key: "WR", from: "receiving", pos: "WR", sort: "yds", columns: [["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"], ["lng", "LNG"]],
        allTime: { sort: "fpts", fpts: { yds: 0.1, td: 6 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"]] } },
      { key: "TE", from: "receiving", pos: "TE", sort: "yds", columns: [["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"], ["lng", "LNG"]],
        allTime: { sort: "fpts", fpts: { yds: 0.1, td: 6 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tgt", "TGT"], ["rec", "REC"], ["yds", "YDS"], ["td", "TD"], ["drop", "DROP"]] } },
      { key: "Tackles", from: "defense", sort: "tak", columns: [["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["pbu", "PBU"], ["int", "INT"]],
        allTime: { sort: "fpts", fpts: { tak: 1, tfl: 2 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tak", "TAK"], ["tfl", "TFL"]] } },
      { key: "DE", from: "defense", pos: "DE", sort: "sck", columns: [["sck", "SCK"], ["tfl", "TFL"], ["pre", "PRE"], ["saf", "SAF"], ["tak", "TAK"], ["swat", "SWAT"]],
        allTime: { sort: "fpts", fpts: { sck: 1, saf: 2 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["sck", "SCK"], ["saf", "SAF"]] } },
      { key: "DB", from: "defense", pos: "DB", sort: "int", columns: [["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["saf", "SAF"], ["swat", "SWAT"], ["int", "INT"], ["pbu", "PBU"], ["pre", "PRE"], ["td", "TD"], ["yda", "YDA"], ["tda", "TDA"]],
        allTime: { sort: "fpts", fpts: { int: 1, pbu: 0.5 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["int", "INT"], ["pbu", "PBU"]] } },
      // The old LB sheet's FPTS used stats it didn't show, so this season's LB points are a best guess
      { key: "LB", from: "defense", pos: "LB", sort: "tak", columns: [["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["saf", "SAF"], ["swat", "SWAT"], ["int", "INT"], ["pbu", "PBU"], ["pre", "PRE"], ["td", "TD"], ["yda", "YDA"], ["tda", "TDA"]],
        allTime: { sort: "fpts", fpts: { tak: 1, tfl: 2, sck: 1, saf: 2, int: 1, pbu: 0.5 }, columns: [["fpts", "FPTS"], ["gp", "GP"], ["tak", "TAK"], ["tfl", "TFL"], ["sck", "SCK"], ["int", "INT"]] } }
    ],
    season: { QB: [], RB: [], WR: [], TE: [], Tackles: [], DE: [], DB: [], LB: [] },
    allTime: {} // filled from stats-alltime-*.js
  },
  // Same person, shown under the second name. Applied after the Discord bot's renames (like Admin -> Players renames),
  // so a bot roster sync under the first name still lands on the second.
  renames: { "bloodhownd": "i56gwe" },
  // Old Discord nicknames -> the name used on the site. Applied when pasting stats or transactions.
  // A player's site name is the Roblox account on their Bloxlink (from the ZevoraV2 bot) where the bot has one.
  aliases: {
    "IIIIIIIIIIII": "IlIIIllIllIIllIlI", "✷": "n4w", "✴": "n4w",
    "ella": "breakxu", "jmr": "JvkeThingz", "sla": "jumpbaI", "PrincessKitty5897": "xJupp",
    "DoobyDoo": "fooge", "sky": "zqju1", "big phil": "seaboy", "vmp": "vampviolences",
    "raskal": "sIicur", "User171718": "perkialtacc", "kamil08": "kamill08",
    // Same players under different names on the old all-time stat sheets
    "Drivxon": "breakxu", "soto1s": "dreamfolds",
    "coIdview": "hurdle", "3va8dkq1zafjmxtn": "3vo8dkq1zafjmxtn", "hello78alt3": "helloo78alt3",
    "gamerpony4182": "gamerpony4132", "settIe": "settle", "Iaddmcconkey": "seaboy", "laddmcconkey": "seaboy", "laddmconkey": "seaboy",
    "influencethekilI": "influencethekill", "depthqcfler": "depthacfler",
    "t1memanagement": "tlmemanagement", "maIikvrt": "maiikvrt", "nichelarpers": "vcoostwash", "cooks423": "cooks", "t8l": "SparkyFaceIsPunched",
    // Award winners listed under a shorter or misspelled name
    "biglester": "biglester1", "kevski": "Kevskiiiiiiii", "VampViolence": "vampviolences", "yavient": "PPspecialist",
    "affused": "IlIIIllIllIIllIlI", "2687affused982673260": "IlIIIllIllIIllIlI", "touchdenim": "denim", "xv89r12azk74m3a4": "stunaaaaaaaaaaaaa", "nskx": "curfaw", "GalanBlox2": "galan",
    "rip": "KrxticalLag", "ripb_ried": "KrxticalLag", "iluvphenom": "mr_devy1122", ".coaserh": "coaserh", "LightExe": "LighttExe",
    "sk8star": "sk8erboy111", "slazery": "Conaments", "UFF_HighRANK": "SparkyFaceIsPunched", "JpingRandySanchez": "SparkyFaceIsPunched",
    "jaylenyagami": "rosewood", "✴ 2223007": "n4w", "2223007": "n4w",
    "Nxstalgjc": "PPspecialist", "Made Her Suffer.": "PPspecialist", "Made Her Suffer": "PPspecialist", "hey": "2kaiju", "romance": "galan", "Galan101dragon20": "galan",
    "Lance6i": "Shyne6712", "5kaiju": "freebloodhill", "Dear Diary": "130liar", "coldview": "hurdle", "1021juice": "sk8erboy111", "vBopYuYt": "roblox_user_2363107116",
    "Lobstirz": "Marauderpress", "bcra n6kj": "n6kj",
    // Head coaches' usernames (from the Season 7 coaches list)
    "loverloverlover": "loverIoverlover",
    // Names the site used before -> the Roblox account on their Bloxlink
    "2 trey": "Aloneinnewyorkcity", "248": "loverIoverlover", "BIGGIECHEESE": "biglester1", "bloodhill": "freebloodhill",
    "CountTo5": "f84d", "day": "vcoostwash", "dictator 10": "SparkyFaceIsPunched", "goatnotgood": "perkialtacc",
    "hellraiser": "Hellraiser000", "hellraiser000": "Hellraiser000", "jvkethings": "JvkeThingz", "Kevskiiiiiii": "Kevskiiiiiiii",
    "liarliarliar": "130liar", "lord 9": "IlIIIllIllIIllIlI", "msuede": "marmersie", "phentric": "sIicur",
    "rcbkailer": "Marauderpress", "rekid": "bloodhownd", "ripburied": "KrxticalLag", "sec": "sec2v", "shazam": "shazamzq",
    "Sigma": "goodnoob9870", "soto": "dreamfolds", "splndd": "jumpbaI", "vboppppppppppp": "roblox_user_2363107116",
    "Vljla6i": "LighttExe", "xjupp": "xJupp", "Yavientt": "PPspecialist", "youngvtee": "zqju1"
  },
  // Fantasy points per stat, used to rank Award Candidates. Change these to match your league.
  fantasy: {
    passing: { yds: 0.04, td: 4, int: -2 },
    rushing: { yds: 0.1, td: 6, fum: -2, pre: 0.5 },
    receiving: { rec: 1, yds: 0.1, td: 6 },
    defense: { tak: 1, tfl: 1, sck: 2, saf: 2, swat: 1, int: 3, pbu: 1, pre: 0.5, td: 6 }
  },
  // Award Candidates: which box score sections count for each award, and (optional) position.
  candidates: [
    { code: "MVP", name: "Most Valuable Player", groups: ["passing", "rushing", "receiving", "defense"] },
    { code: "OPOTY", name: "Offensive Player of the Year", groups: ["passing", "receiving"] },
    { code: "DPOTY", name: "Defensive Player of the Year", groups: ["defense"] },
    { code: "QBOTY", name: "Quarterback of the Year", groups: ["passing"] },
    { code: "WROTY", name: "Wide Receiver of the Year", groups: ["receiving"], pos: "WR" },
    { code: "TEOTY", name: "Tight End of the Year", groups: ["receiving"], pos: "TE" },
    { code: "DBOTY", name: "Defensive Back of the Year", groups: ["defense"], pos: "DB" },
    { code: "RBOTY", name: "Running Back of the Year", groups: ["rushing"] },
    { code: "DEOTY", name: "Defensive End of the Year", groups: ["defense"], pos: "DE" },
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
    { date: "2026-10-17", time: "21:36", type: "promotion", player: "denim", team: "Baltimore Bluejays", role: "Assistant Coach" },
    { date: "2026-10-18", time: "00:44", type: "sign", player: "n4w", team: "Baltimore Bluejays" },
    { date: "2026-10-18", time: "15:27", type: "promotion", player: "n4w", team: "Columbus Colts", role: "Owner", note: "Left the Baltimore Bluejays" },
    { date: "2026-10-18", time: "15:38", type: "sign", player: "coaserh", team: "Columbus Colts" },
    { date: "2026-10-18", time: "15:38", type: "sign", player: "denim", team: "Columbus Colts" },
    { date: "2026-10-18", time: "15:38", type: "sign", player: "mr_devy1122", team: "Columbus Colts" },
    { date: "2026-10-18", time: "15:38", type: "sign", player: "ripburied", team: "Columbus Colts" },
    { date: "2026-10-18", time: "15:57", type: "sign", player: "lord 9", team: "Columbus Colts" },
    { date: "2026-10-18", time: "16:03", type: "promotion", player: "denim", team: "Columbus Colts", role: "Assistant Coach" },
    { date: "2026-10-19", time: "23:59", type: "sign", player: "sec", team: "Toronto Maples", by: "zlssei" },
    { date: "2026-10-19", time: "23:59", type: "promotion", player: "sec", team: "Toronto Maples", role: "Assistant Head Coach", by: "zlssei" },
    { date: "2026-10-19", time: "23:59", type: "sign", player: "lebrun", team: "Toronto Maples", by: "zlssei" },
    { date: "2026-10-19", time: "23:59", type: "sign", player: "phentric", team: "Toronto Maples", by: "zlssei" }
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
      FIRST_TEAM: "1st Team All-Flag", SECOND_TEAM: "2nd Team All-Flag", THIRD_TEAM: "3rd Team All-Flag"
    },
    // All-Flag teams entered on Admin -> All-Flag add to the 1st / 2nd / 3rd Team counts below starting with this
    // season (the counts below already include the seasons before it).
    allFlagCountsFrom: 7,
    // From the Discord roles (nicknames). Number = how many times they have it.
    // bonus = extra points on top of their roles (for totals set by the league).
    players: [
      { name: "n4w", honors: { COTY: 3, UFB_CHAMP: 2, UFB_MVP: 1, MVP: 1, OPOTY: 1, DPOTY: 1, CROWN: 1, FLAG_TITLE: 2, FIRST_TEAM: 2, SECOND_TEAM: 3 } },
      { name: "lord 9", honors: { COTY: 1, UFB_CHAMP: 3, MVP: 1, OPOTY: 1, DEOTY: 1, DBOTY: 1, CROWN: 2, FLAG_TITLE: 5, FIRST_TEAM: 4 } },
      { name: "dictator 10", honors: { UFB_CHAMP: 2, MVP: 2, QBOTY: 1, CROWN: 1, FIRST_TEAM: 2, SECOND_TEAM: 2, HCOTY: 1 } },
      { name: "shazam", honors: { UFB_CHAMP: 2, TEOTY: 2, DEOTY: 2, CROWN: 2, FIRST_TEAM: 4 } },
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
      { name: "2kaiju", honors: { UFB_CHAMP: 1, DBOTY: 1, FIRST_TEAM: 2 } },
      { name: "sk8erboy111", honors: { UFB_CHAMP: 1, FLAG_TITLE: 2, FIRST_TEAM: 1, SECOND_TEAM: 2, ROTY: 1, EXEOTY: 1 } },
      { name: "ewikoro", honors: { COTY: 1, UFB_CHAMP: 2 } },
      { name: "galan", honors: { COTY: 1, UFB_CHAMP: 1, LBOTY: 1, FIRST_TEAM: 1 } },
      { name: "fooge", honors: { UFB_CHAMP: 1, RBOTY: 1, FLAG_TITLE: 1 } },
      { name: "knqq", honors: { DPOTY: 2, DEOTY: 2, CROWN: 2, FIRST_TEAM: 2 }, bonus: 144 },
      { name: "knql", honors: { COTY: 1, LBOTY: 1, FLAG_TITLE: 2, FIRST_TEAM: 1, SECOND_TEAM: 1 } },
      { name: "soto", honors: { QBOTY: 1, FLAG_TITLE: 2, FIRST_TEAM: 1 } },
      { name: "pravings", honors: { UFB_CHAMP: 1, FIRST_TEAM: 1, SECOND_TEAM: 1 } },
      { name: "curfaw", honors: { WROTY: 1, FIRST_TEAM: 2, SECOND_TEAM: 1 } },
      { name: "stunaaaaaaaaaaaaa", honors: { FLAG_TITLE: 1, FIRST_TEAM: 2, SECOND_TEAM: 3 } },
      { name: "Kevskiiiiiii", honors: { COTY: 1, DBOTY: 1, FIRST_TEAM: 2, JRNOTY: 1 } },
      { name: "uufaailen", honors: { COTY: 1, UFB_CHAMP: 1, SECOND_TEAM: 1 } },
      { name: "liarliarliar", honors: { UFB_CHAMP: 1, SECOND_TEAM: 1 } },
      { name: "Yavientt", honors: { COTY: 1, WROTY: 1, FIRST_TEAM: 2, SECOND_TEAM: 1, ROTY: 1 } },
      { name: "Descended", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "kuaz", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "lynnvxd", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "Omar", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "xjupp", honors: { COTY: 4, UFB_CHAMP: 1 } },
      { name: "ty balla", honors: { COTY: 1, UFB_CHAMP: 1 } },
      { name: "10", honors: { UFB_CHAMP: 1 } },
      { name: "bloodhill", honors: { UFB_CHAMP: 1 } },
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
      { name: "Shyne6712", honors: { CROWN: 1, SECOND_TEAM: 1 } },
      { name: "Jadnlations", honors: { SECOND_TEAM: 2 } },
      { name: "ggglory", honors: { SECOND_TEAM: 2 } },
      { name: "gabe08130", honors: { SECOND_TEAM: 1 } },
      { name: "ripburied", honors: { SECOND_TEAM: 1 } },
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
            { name: "Kansas City Jazz", code: "KCJ", color: "#8e3fe0", color2: "#2ff5c8", coach: "rekid", logo: "logos/kansas-city-jazz.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Baltimore Bluejays", code: "BAL", color: "#1f6fd1", color2: "#0b2559", coach: "breakxu", logo: "logos/baltimore-bluejays.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Pittsburg Sentinels", code: "PIT", color: "#1d1d1f", color2: "#febe1f", coach: "2 trey", logo: "logos/pittsburg-sentinels.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Seattle Skyclaws", code: "SEA", color: "#c4161c", color2: "#f8b546", coach: "a1w", logo: "logos/seattle-skyclaws.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Havana Toroccoros", code: "HAV", color: "#0041dd", color2: "#e0e1e2", coach: "freudiah", logo: "logos/havana-toroccoros.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" }
          ]
        },
        {
          name: "South Division",
          teams: [
            { name: "Toronto Maples", code: "TOR", color: "#4b2381", color2: "#bab9bf", coach: "zlssei", logo: "logos/toronto-maples.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "New Orleans Raiders", code: "NO", color: "#2b2f36", color2: "#b7bcc0", coach: "BIGGIECHEESE", logo: "logos/new-orleans-raiders.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "San Jose Scarecrows", code: "SJS", color: "#f8aa02", color2: "#060707", coach: "zay balla", logo: "logos/san-jose-scarecrows.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Detroit Dynasty", code: "DET", color: "#4f1b84", color2: "#ffffff", coach: "fox balla", logo: "logos/detroit-dynasty.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Sarnia City Broncos", code: "SCB", color: "#db0028", color2: "#050505", coach: "desiredsantana", logo: "logos/sarnia-city-broncos.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" }
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
            { name: "San Francisco Miners", code: "SF", color: "#cf1d1d", color2: "#fcc00b", coach: "sk8erboy111", logo: "logos/san-francisco-miners.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Vienna Angels", code: "VIE", color: "#e5ad00", color2: "#050505", coach: "Kamil08", logo: "logos/vienna-angels.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Olympia Owls", code: "OLY", color: "#1e5b45", color2: "#aeafb1", coach: "fooge", logo: "logos/olympia-owls.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Novasota Wolf Pack", code: "NWP", color: "#2a5a3f", color2: "#e5dfc5", coach: "Yacht", logo: "logos/novasota-wolf-pack.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Long Beach Pirates", code: "LBP", color: "#2a8de0", color2: "#062c45", coach: "splndd", logo: "logos/long-beach-pirates.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" }
          ]
        },
        {
          name: "South Division",
          teams: [
            { name: "Costa Rica Pumas", code: "CR", color: "#1b2a5c", color2: "#ef1b3a", coach: "msuede", logo: "logos/costa-rica-pumas.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Rose City Reapers", code: "RCR", color: "#6a1fc4", color2: "#e3e2e3", coach: "ACTIVIST000", logo: "logos/rose-city-reapers.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Plymouth Huskies", code: "PLY", color: "#3a3d44", color2: "#c7b07a", coach: "248", logo: "logos/plymouth-huskies.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Shiroishi Samurai", code: "SHI", color: "#f08a12", color2: "#050505", coach: "Vljla6i", logo: "logos/shiroishi-samurai.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-" },
            { name: "Columbus Colts", code: "CLB", color: "#1d4fb0", color2: "#ffffff", coach: "9kb2", logo: "logos/columbus-colts.png", w: 0, l: 0, pf: 0, pa: 0, streak: "-", disbanded: { date: "2026-10-19", time: "17:53" } }
          ]
        }
      ]
    }
  ]
};
