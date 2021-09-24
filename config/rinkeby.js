module.exports = {
    // LBP V1
    // lbp: {
    //     start_block: 9260073,
    //     end_block: 12351817,
    //     start_timestamp: 1631155336,
    //     lbp_start_date: 1631155336,
    //     lbp_end_date: 1631673736,
    //     gro_amount_total: 5000000,
    //     gro_token: '0xD348b1F5872940901fcAF9aCD1b9785f4e12121A',
    //     coin_token: '0x9edF2989C22C5bF6675a4581E39D75a3C9BF8578',
    //     bp_pool: '0x86fa758a31ba14d1beea4a79eece71c2329d004b',
    //     crp_pool: '0xade0c1536e2053328b53a7b41b32289bce2cf65d',
    // },
    // LBP V2 - Ropsten 1st version (Gro with Copper)
    // lbp: {
    //     // Balancer V2:
    //     lbp_start_date: 1631638800,     // Official - 14 September 2021 17:00:00
    //     lbp_end_date: 1631898000,       // Official - 17 September 2021 17:00:00
    //     lbp_gro_start_weight: 0.96,
    //     lbp_gro_end_weight: 0.5,
    //     gro_amount_total: 5000,
    //     usdc_amount_total: 2000,
    //     balancerV2_graph_url: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
    //     balancerV2_pool_address: '0x34e7677c19d527519eb336d3860f612b9ca107ab',
    //     balancerV2_pool_id: '0x34e7677c19d527519eb336d3860f612b9ca107ab00020000000000000000017d',
    //     // Balancer V1
    //     start_block: 9260073,
    //     start_timestamp: 1631577600,
    //     gro_token: '0xD348b1F5872940901fcAF9aCD1b9785f4e12121A',
    //     coin_token: '0x9edF2989C22C5bF6675a4581E39D75a3C9BF8578',
    //     bp_pool: '0x86fa758a31ba14d1beea4a79eece71c2329d004b',
    //     crp_pool: '0xade0c1536e2053328b53a7b41b32289bce2cf65d',
    // },
    // LBP V2 - aKLIMA
    lbp: {
        // V2:
        start_block: 27191741,
        start_timestamp: 1631631600,
        lbp_start_date: 1631631600,
        lbp_end_date: 1631890800,
        lbp_gro_start_weight: 0.96,
        lbp_gro_end_weight: 0.1,
        gro_amount_total: 120000,
        usdc_amount_total: 579500,
        balancerV2_graph_url: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
        balancerV2_pool_address: '0x6Aa8A7B23F7B3875a966dDCc83D5b675cC9af54B',
        balancerV2_pool_id: '0x6aa8a7b23f7b3875a966ddcc83d5b675cc9af54b00020000000000000000008e',
        // V1
        gro_token: '0xD348b1F5872940901fcAF9aCD1b9785f4e12121A',
        coin_token: '0x9edF2989C22C5bF6675a4581E39D75a3C9BF8578',
        bp_pool: '0x86fa758a31ba14d1beea4a79eece71c2329d004b',
        crp_pool: '0xade0c1536e2053328b53a7b41b32289bce2cf65d',
    },
    blockchain: {
        network: 'rinkeby',
        default_api_keys: {
            alchemy: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
            infura: 'a0c4911f680a4dd0bf3f7dfac2a4ba08',
            etherscan: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
            pocket: '8dbbeecc2126c14cbc48bf6b66f4a33850fa3537',
        },
        alchemy_api_keys: {
            default: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
        },
        infura_api_keys: {
            default: {
                projectId:
                    process.env[`INFURA_KEY_${process.env.BOT_ENV}_PROJECT_ID`],
                projectSecret:
                    process.env[
                    `INFURA_KEY_${process.env.BOT_ENV}_PROJECT_SECRET`
                    ],
            },
        },
        keystores: {
            default: {
                file_path: process.env[`KEY_STORE_${process.env.BOT_ENV}`],
                password: process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`],
                private_key:
                    process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`],
            },
        },
    },
    trigger_scheduler: {},
    emoji: {},
    stats_folder: '../stats',
    log_folder: '../logs',
    blockNumberFile: '../lbp/lastBlockNumber.json',
    discord: {
        token: process.env[`DISCORD_TOKEN_${process.env.BOT_ENV}`],
        retry: 3,
        channel: {
            trades: '826415202160476201',
            protocol_assets: '826415552355762208',
            protocol_events: '826416102522355712',
            crit_action_events: '826416230898466826',
            bot_alerts: '826417081003671582',
            bot_logs: '826416451744825404',
        },
    },
    database: {
        host: process.env.DB_DEV_HOST,
        port: process.env.DB_DEV_PORT,
        user: process.env.DB_DEV_USER,
        password: process.env.DB_DEV_PASSWORD,
        database: process.env.DB_DEV_INSTANCE,
    },
};
