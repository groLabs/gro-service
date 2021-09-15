module.exports = {
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
    // Testing fill LBP for 1h in Rinkeby on 10/09/2021
    lbp: {
        // start_block: 9265175,
        // end_block: 9270925,
        start_block: 9260073,           // Block when the LBP contract was deployed
        start_timestamp: 1631577600,    // Timestamp when the LBP contract was deployed
        lbp_start_date: 1631638800,     // 14.09.2021 17:00:00
        lbp_end_date: 1631898000,       // 17.09.2021 17:00:00
        // lbp_start_date: 1631577600,     // Timestamp for the LBP start  => eg: 1631577600 (14.09.2021 00:00:00)
        // lbp_end_date: 1631664000,       // Timestamp for the LBP end    => eg: 1631664000 (15.09.2021 00:00:00)
        start_price: 10,
        gro_amount_total: 5000000.00000000,
        gro_token: '0xD348b1F5872940901fcAF9aCD1b9785f4e12121A',
        coin_token: '0x9edF2989C22C5bF6675a4581E39D75a3C9BF8578',
        bp_pool: '0x86fa758a31ba14d1beea4a79eece71c2329d004b',
        crp_pool: '0xade0c1536e2053328b53a7b41b32289bce2cf65d',
        balancerv2_url: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
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
