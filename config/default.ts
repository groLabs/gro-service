require('dotenv').config();
export const private_transaction = false;
export const stats_bot_event_sending = true;
export const bot_balance = {
    warn: '1000000000000000000',
    critial: '200000000000000000',
};
export const curve_balance = {
    emery: 1000,
    crit: 1300,
    warn: 1500,
};
export const chainlink_price_pair = {
    emery: { high: 14000, low: 7000 },
    crit: { high: 12500, low: 8000 },
    warn: { high: 11000, low: 9000 },
};
export const etherscan_api_key = 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H';
export const base_gas = [50000000000, 75000000000, 100000000000];
export const timeout_retry = 2;
export const timeout_retry_staller = 1000;
export const pagerduty = {
    token: process.env.PAGERDUTY_TOKEN,
    from: process.env.PAGERDUTY_TRIGGER_FROM,
    service: 'PH3EY5S',
    policy: 'PV2RP80',
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
export const harvest_callcost = {
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
export const harvest_strategies = ['harvest', 'curveXpool', 'genericLender'];
export const stats = {
    amount_decimal_place: 7,
    ratio_decimal_place: 4,
};
