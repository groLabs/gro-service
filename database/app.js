const { loadGroStatsDB } = require('./loader/personalLoader');
const { loadGroStatsLiveDB } = require('./loader/personalLiveLoader');
const { loadGroStatsDBAll } = require('./loader/personalLoaderALL');

loadGroStatsDB();
//loadGroStatsLiveDB('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//loadGroStatsDBAll();

/*
npm i pg
MODE_ENV=kovan BOT_ENV=STATS node ./stats_db/app.js
*/ 