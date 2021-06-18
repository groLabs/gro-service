const { loadGroStatsDB } = require('./handler/personalHandler');

loadGroStatsDB();

/*
npm i pg
MODE_ENV=kovan BOT_ENV=STATS node ./stats_db/app.js
*/ 