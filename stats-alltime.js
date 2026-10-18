// All-Time stats = every sheet below added together, plus this season's games (added automatically).
// Each stats-alltime-*.js file adds one sheet with ALL_TIME_SHEETS.push(...); index.html loads them after this file.
const ALL_TIME_SHEETS = [];

// Team abbreviations used on the sheets. Teams that aren't in the league now show as UFF.
const ALL_TIME_TEAMS = {
  ALB: "Alabama Bloom", ATL: "Atlantis Tridents", AUR: "Aurelius Angels", CC: "Columbus Colts",
  COL: "Colorado Thunderstorm", GB: "Green Bay Blizzard", LOU: "Louisville Lynx", MEX: "Mexico City Aztecs",
  NSH: "Nashville Nightmares", NY: "New York Dragons", OKC: "Oklahoma City Owls", ROS: "Rosewood Raptors",
  SA: "San Antonio Sabers", SD: "San Diego Devils", SEA: "Seattle Skyclaws", SEM: "Seminola Spartans",
  SHI: "Shiroishi Samurai", SJ: "San Jose Sharks", SSH: "Salem Snow Hawks", STL: "St Louis Battle Hawks",
  SUV: "Suva Stingrays", VIR: "Virginia Venom", WAS: "Washington Knights"
};
