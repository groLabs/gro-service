module.exports = {
    private_transaction: false,
    // lbp: {
    //     start_block: 12331109,
    //     end_block: 12350508,
    //     start_timestamp: 1619641800,
    //     lbp_start_date: 1619641800,
    //     lbp_end_date: 1619901900,
    //     gro_amount_total: 500000,
    //     gro_token: '0x33349b282065b0284d756f0577fb39c158f935e6',
    //     coin_token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    //     bp_pool: '0x29682CF1006Ad08EC6Ade56ae69Db94D4C940F86',
    //     crp_pool: '0x002083874F7455968993579688Dd25F58A912eBf',
    // },
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
    base_gas: [50000000000, 75000000000, 100000000000],
    timeout_retry: 2,
    timeout_retry_staller: 1000,
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
