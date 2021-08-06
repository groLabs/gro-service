module.exports = {
    bot_balance_warn: '20000000000000000000',
    etherscan_api_key: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
    pagerduty: {
        token: process.env.PAGERDUTY_TOKEN,
        from: process.env.PAGERDUTY_TRIGGER_FROM,
        service: 'PCYAPT2', // Gro
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
