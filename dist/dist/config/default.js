"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stats = exports.harvest_strategies = exports.harvest_callcost = exports.pagerduty = exports.timeout_retry_staller = exports.timeout_retry = exports.base_gas = exports.etherscan_api_key = exports.chainlink_price_pair = exports.curve_balance = exports.bot_balance = exports.private_transaction = void 0;
exports.private_transaction = false;
exports.bot_balance = {
    warn: '1000000000000000000',
    critial: '200000000000000000',
};
exports.curve_balance = {
    emery: 1000,
    crit: 1300,
    warn: 1500,
};
exports.chainlink_price_pair = {
    emery: { high: 14000, low: 7000 },
    crit: { high: 12500, low: 8000 },
    warn: { high: 11000, low: 9000 },
};
exports.etherscan_api_key = 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H';
exports.base_gas = [50000000000, 75000000000, 100000000000];
exports.timeout_retry = 2;
exports.timeout_retry_staller = 1000;
exports.pagerduty = {
    token: process.env.PAGERDUTY_TOKEN,
    from: process.env.PAGERDUTY_TRIGGER_FROM,
    service: 'P22YTVG',
    policy: 'PD1HPMI',
    urgency: {
        high: 'high',
        low: 'low',
    },
    priority: {
        p1: 'PM0DQIR',
        p2: 'PIRSQ61',
        p3: 'PEF4PTB',
        p4: 'PB5GOEO',
        p5: 'PXWVO1L',
    },
};
exports.harvest_callcost = {
    vault_0: {
        strategy_0: '1641125',
        strategy_1: '849125',
    },
    vault_1: {
        strategy_0: '1637552',
        strategy_1: '895790',
    },
    vault_2: {
        strategy_0: '1396042',
        strategy_1: '878427',
    },
    vault_3: {
        strategy_0: '1044516',
    },
};
exports.harvest_strategies = ['harvest', 'curveXpool', 'genericLender'];
exports.stats = {
    amount_decimal_place: 7,
    ratio_decimal_place: 4,
};
