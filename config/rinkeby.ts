require('dotenv').config();
export const blockchain = {
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
            projectId: process.env[`INFURA_KEY_${process.env.BOT_ENV}_PROJECT_ID`],
            projectSecret: process.env[`INFURA_KEY_${process.env.BOT_ENV}_PROJECT_SECRET`],
        },
    },
    keystores: {
        default: {
            file_path: process.env[`KEY_STORE_${process.env.BOT_ENV}`],
            password: process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`],
            private_key: process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`],
        },
    },
};
export const trigger_scheduler = {};
export const emoji = {};
export const stats_folder = '../stats';
export const log_folder = '../logs';
export const blockNumberFile = '../lbp/lastBlockNumber.json';
export const discord = {
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
};
export const database = {
    host: process.env.DB_DEV_HOST,
    port: process.env.DB_DEV_PORT,
    user: process.env.DB_DEV_USER,
    password: process.env.DB_DEV_PASSWORD,
    database: process.env.DB_DEV_INSTANCE,
};
export const lbp = {
    start_block: 13289180,
    start_timestamp: 1632496215,
    lbp_start_date: 1632844800,
    lbp_end_date: 1633104000,
    lbp_gro_start_weight: 0.95,
    lbp_gro_end_weight: 0.5,
    gro_amount_total: 5000000,
    usdc_amount_total: 2650000,
    balancerV2_graph_url: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    balancerV2_pool_address: '0x64e2c43cA952BA01E32E8cFA05c1E009Bc92E06c',
    balancerV2_pool_id: '0x64e2c43ca952ba01e32e8cfa05c1e009bc92e06c00020000000000000000009b',
    // Balancer V1 (Not used)
    gro_token: '0xD348b1F5872940901fcAF9aCD1b9785f4e12121A',
    coin_token: '0x9edF2989C22C5bF6675a4581E39D75a3C9BF8578',
    bp_pool: '0x86fa758a31ba14d1beea4a79eece71c2329d004b',
    crp_pool: '0xade0c1536e2053328b53a7b41b32289bce2cf65d',
};
