module.exports = {
    bot_balance: {
        warn: '1000000000000000000',
        critial: '200000000000000000',
    },
    curve_balance: {
        emery: 1000,
        crit: 1300,
        warn: 1500,
    },
    chainlink_price_pair: {
        emery: { high: 14000, low: 7000 },
        crit: { high: 12500, low: 8000 },
        warn: { high: 11000, low: 9000 },
    },
    airdrop_csv_folder: '../airdrop',
    etherscan_api_key: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
    pagerduty: {
        token: process.env.PAGERDUTY_TOKEN,
        from: process.env.PAGERDUTY_TRIGGER_FROM,
        service: 'P22YTVG', // Protocol
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
    },
    harvest_callcost: {
        vault_0: {
            strategy_0: '1641125000000000',
            strategy_1: '849125000000000',
        },
        vault_1: {
            strategy_0: '1637552000000000',
            strategy_1: '895790000000000',
        },
        vault_2: {
            strategy_0: '1396042000000000',
            strategy_1: '878427000000000',
        },
        vault_3: {
            strategy_0: '1044516000000000',
        },
    },
    harvest_strategies: ['harvest', 'curveXpool', 'genericLender'],
    stats: {
        amount_decimal_place: 7,
        ratio_decimal_place: 4,
    },
};
