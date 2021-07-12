const { query } = require('./queryHandler');
// const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const {
    QUERY_ERROR,
} = require('../common/personalUtil');

const DIFF_5m = 300;
const DIFF_1h = 3600;
const DIFF_1d = 86400;
const DIFF_1w = 604800;
const MARGIN = 200;
const NA = 'NA';

const getTimeTransformations = (target) => {
    return {
        "MIN_5m": target - (DIFF_5m - MARGIN),
        "MAX_5m": target - (DIFF_5m + MARGIN),
        "MIN_1h": target - (DIFF_1h - MARGIN),
        "MAX_1h": target - (DIFF_1h + MARGIN),
        "MIN_1d": target - (DIFF_1d - MARGIN),
        "MAX_1d": target - (DIFF_1d + MARGIN),
        "MIN_1w": target - (DIFF_1w - MARGIN),
        "MAX_1w": target - (DIFF_1w + MARGIN),
    }
}

const getTimestamps = async (target, table) => {
    try {
        const delta = getTimeTransformations(target);
        const [
            current,
            diff_5m,
            diff_1h,
            diff_1d,
            diff_1w,
        ] = await Promise.all([
            query(`select_max_timestamp_${table}.sql`, [target, target]),
            query(`select_max_timestamp_${table}.sql`, [delta.MAX_5m, delta.MIN_5m]),
            query(`select_max_timestamp_${table}.sql`, [delta.MAX_1h, delta.MIN_1h]),
            query(`select_max_timestamp_${table}.sql`, [delta.MAX_1d, delta.MIN_1d]),
            query(`select_max_timestamp_${table}.sql`, [delta.MAX_1w, delta.MIN_1w]),
        ]);

        if (current === QUERY_ERROR || diff_5m === QUERY_ERROR || diff_1h === QUERY_ERROR
            || diff_1d === QUERY_ERROR || diff_1w === QUERY_ERROR)
            throw `Query error in getTimestamps [target: ${target}]`;

        return {
            "current": current.rows[0],
            "diff_5m": diff_5m.rows[0],
            "diff_1h": diff_1h.rows[0],
            "diff_1d": diff_1d.rows[0],
            "diff_1w": diff_1w.rows[0],
        }
    } catch (err) {
        console.log(err);
    }
}

const getTVL = async (targetTimestamp) => {
    const tvl = await getTimestamps(targetTimestamp, 'protocol_tvl');
    if (tvl.current) {
        return {
            "launch_timestamp": tvl.current.launch_timestamp,
            "launch_date": tvl.current.launch_date,
            "tvl_total": tvl.current.tvl_total,
            "tvl_total_5m": (tvl.diff_5m) ? tvl.diff_5m.tvl_total : NA,
            "tvl_total_5m_dif": (tvl.diff_5m) ? tvl.current.tvl_total - tvl.diff_5m.tvl_total : NA,
            "tvl_total_1h": (tvl.diff_1h) ? tvl.diff_1h.tvl_total : NA,
            "tvl_total_1h_dif": (tvl.diff_1h) ? tvl.current.tvl_total - tvl.diff_1h.tvl_total : NA,
            "tvl_total_1d": (tvl.diff_1d) ? tvl.diff_1d.tvl_total : NA,
            "tvl_total_1d_dif": (tvl.diff_1d) ? tvl.current.tvl_total - tvl.diff_1d.tvl_total : NA,
            "tvl_total_1w": (tvl.diff_1w) ? tvl.diff_1w.tvl_total : NA,
            "tvl_total_1w_dif": (tvl.diff_1w) ? tvl.current.tvl_total - tvl.diff_1w.tvl_total : NA,
            "tvl_pwrd": tvl.current.tvl_pwrd,
            "tvl_pwrd_5m": (tvl.diff_5m) ? tvl.diff_5m.tvl_pwrd : NA,
            "tvl_pwrd_5m_dif": (tvl.diff_5m) ? tvl.current.tvl_pwrd - tvl.diff_5m.tvl_pwrd : NA,
            "tvl_pwrd_1h": (tvl.diff_1h) ? tvl.diff_1h.tvl_pwrd : NA,
            "tvl_pwrd_1h_dif": (tvl.diff_1h) ? tvl.current.tvl_pwrd - tvl.diff_1h.tvl_pwrd : NA,
            "tvl_pwrd_1d": (tvl.diff_1d) ? tvl.diff_1d.tvl_pwrd : NA,
            "tvl_pwrd_1d_dif": (tvl.diff_1d) ? tvl.current.tvl_pwrd - tvl.diff_1d.tvl_pwrd : NA,
            "tvl_pwrd_1w": (tvl.diff_1w) ? tvl.diff_1w.tvl_pwrd : NA,
            "tvl_pwrd_1w_dif": (tvl.diff_1w) ? tvl.current.tvl_pwrd - tvl.diff_1w.tvl_pwrd : NA,
            "tvl_gvt": tvl.current.tvl_gvt,
            "tvl_gvt_5m": (tvl.diff_5m) ? tvl.diff_5m.tvl_gvt : NA,
            "tvl_gvt_5m_dif": (tvl.diff_5m) ? tvl.current.tvl_gvt - tvl.diff_5m.tvl_gvt : NA,
            "tvl_gvt_1h": (tvl.diff_1h) ? tvl.diff_1h.tvl_gvt : NA,
            "tvl_gvt_1h_dif": (tvl.diff_1h) ? tvl.current.tvl_gvt - tvl.diff_1h.tvl_gvt : NA,
            "tvl_gvt_1d": (tvl.diff_1d) ? tvl.diff_1d.tvl_gvt : NA,
            "tvl_gvt_1d_dif": (tvl.diff_1d) ? tvl.current.tvl_gvt - tvl.diff_1d.tvl_gvt : NA,
            "tvl_gvt_1w": (tvl.diff_1w) ? tvl.diff_1w.tvl_gvt : NA,
            "tvl_gvt_1w_dif": (tvl.diff_1w) ? tvl.current.tvl_gvt - tvl.diff_1w.tvl_gvt : NA,
            "util_ratio_5m": (tvl.diff_5m) ? tvl.diff_5m.util_ratio : NA,
            "util_ratio_5m_dif": (tvl.diff_5m) ? tvl.current.util_ratio - tvl.diff_5m.util_ratio : NA,
            "util_ratio_1h": (tvl.diff_1h) ? tvl.diff_1h.util_ratio : NA,
            "util_ratio_1h_dif": (tvl.diff_1h) ? tvl.current.util_ratio - tvl.diff_1h.util_ratio : NA,
            "util_ratio_1d": (tvl.diff_1d) ? tvl.diff_1d.util_ratio : NA,
            "util_ratio_1d_dif": (tvl.diff_1d) ? tvl.current.util_ratio - tvl.diff_1d.util_ratio : NA,
            "util_ratio_1w": (tvl.diff_1w) ? tvl.diff_1w.util_ratio : NA,
            "util_ratio_1w_dif": (tvl.diff_1w) ? tvl.current.util_ratio - tvl.diff_1w.util_ratio : NA,
            "util_ratio_limit_pwrd_5m": (tvl.diff_5m) ? tvl.diff_5m.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_pwrd_5m_dif": (tvl.diff_5m) ? tvl.current.util_ratio_limit_pwrd - tvl.diff_5m.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_pwrd_1h": (tvl.diff_1h) ? tvl.diff_1h.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_pwrd_1h_dif": (tvl.diff_1h) ? tvl.current.util_ratio_limit_pwrd - tvl.diff_1h.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_pwrd_1d": (tvl.diff_1d) ? tvl.diff_1d.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_pwrd_1d_dif": (tvl.diff_1d) ? tvl.current.util_ratio_limit_pwrd - tvl.diff_1d.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_pwrd_1w": (tvl.diff_1w) ? tvl.diff_1w.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_pwrd_1w_dif": (tvl.diff_1w) ? tvl.current.util_ratio_limit_pwrd - tvl.diff_1w.util_ratio_limit_pwrd : NA,
            "util_ratio_limit_gvt_5m": (tvl.diff_5m) ? tvl.diff_5m.util_ratio_limit_gvt : NA,
            "util_ratio_limit_gvt_5m_dif": (tvl.diff_5m) ? tvl.current.util_ratio_limit_gvt - tvl.diff_5m.util_ratio_limit_gvt : NA,
            "util_ratio_limit_gvt_1h": (tvl.diff_1h) ? tvl.diff_1h.util_ratio_limit_gvt : NA,
            "util_ratio_limit_gvt_1h_dif": (tvl.diff_1h) ? tvl.current.util_ratio_limit_gvt - tvl.diff_1h.util_ratio_limit_gvt : NA,
            "util_ratio_limit_gvt_1d": (tvl.diff_1d) ? tvl.diff_1d.util_ratio_limit_gvt : NA,
            "util_ratio_limit_gvt_1d_dif": (tvl.diff_1d) ? tvl.current.util_ratio_limit_gvt - tvl.diff_1d.util_ratio_limit_gvt : NA,
            "util_ratio_limit_gvt_1w": (tvl.diff_1w) ? tvl.diff_1w.util_ratio_limit_gvt : NA,
            "util_ratio_limit_gvt_1w_dif": (tvl.diff_1w) ? tvl.current.util_ratio_limit_gvt - tvl.diff_1w.util_ratio_limit_gvt : NA,
        }
    } else {
        return {};
    }
}


const groStatsHandler = async (targetTimestamp) => {
    console.log('Hello from groStatsHandler');
    const res = await getTVL(1624826772);
    console.log(res);
    process.exit();
}

module.exports = {
    groStatsHandler,
}