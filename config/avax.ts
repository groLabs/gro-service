export const blockchain = {
    network: 'mainnet',
    start_block: 12522788,
    start_timestamp: 1622204347,
    default_api_keys: {
        alchemy: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
        infura: 'a0c4911f680a4dd0bf3f7dfac2a4ba08',
        etherscan: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
        pocket: '8dbbeecc2126c14cbc48bf6b66f4a33850fa3537',
    },
    alchemy_api_keys: {
        default: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
        stats_personal: process.env.ALCHEMY_KEY_STATS_PERSONAL,
        stats_gro: process.env.ALCHEMY_KEY_STATS_GRO,
    },
    infura_api_keys: {
        default: {
            projectId:
                process.env[`INFURA_KEY_${process.env.BOT_ENV}_PROJECT_ID`],
            projectSecret:
                process.env[`INFURA_KEY_${process.env.BOT_ENV}_PROJECT_SECRET`],
        },
        stats_personal: {
            projectId: process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_ID,
            projectSecret: process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_SECRET,
        },
        stats_gro: {
            projectId: process.env.INFURA_KEY_STATS_GRO_PROJECT_ID,
            projectSecret: process.env.INFURA_KEY_STATS_GRO_PROJECT_SECRET,
        },
    },
    keystores: {
        default: {
            file_path: process.env[`KEY_STORE_${process.env.BOT_ENV}`],
            password: process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`],
            private_key: process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`],
        },
        regular: {
            low_file_path: process.env.KEY_STORE_REGULAR_LOW_GAS,
            low_password: process.env.KEY_PASSWORD_REGULAR_LOW_GAS,
            low_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_LOW_GAS,
            standard_file_path: process.env.KEY_STORE_REGULAR_STANDARD_GAS,
            standard_password: process.env.KEY_PASSWORD_REGULAR_STANDARD_GAS,
            standard_private_key:
                process.env.BOT_PRIVATE_KEY_REGULAR_STANDARD_GAS,
            fast_file_path: process.env.KEY_STORE_REGULAR_FAST_GAS,
            fast_password: process.env.KEY_PASSWORD_REGULAR_FAST_GAS,
            fast_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_FAST_GAS,
            rapid_file_path: process.env.KEY_STORE_REGULAR_RAPID_GAS,
            rapid_password: process.env.KEY_PASSWORD_REGULAR_RAPID_GAS,
            rapid_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_RAPID_GAS,
        },
        critical: {
            rapid_file_path: process.env.KEY_STORE_CRITICAL_RAPID_GAS,
            rapid_password: process.env.KEY_PASSWORD_CRITICAL_RAPID_GAS,
            rapid_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_CRITICAL_GAS,
        },
        avaxharvest: {
            dai_file_path: process.env.KEY_STORE_AVAX_DAI,
            dai_password: process.env.KEY_PASSWORD_AVAX_DAI,
            dai_private_key: process.env.BOT_PRIVATE_KEY_AVAX_DAI,
            usdc_file_path: process.env.KEY_STORE_AVAX_USDC,
            usdc_password: process.env.KEY_PASSWORD_AVAX_USDC,
            usdc_private_key: process.env.BOT_PRIVATE_KEY_AVAX_USDC,
            usdt_file_path: process.env.KEY_STORE_AVAX_USDT,
            usdt_password: process.env.KEY_PASSWORD_AVAX_USDT,
            usdt_private_key: process.env.BOT_PRIVATE_KEY_AVAX_USDT,
        },
    },
};
export const trigger_scheduler = {
    tend: '*/10 * * * * *',
    harvest: '*/10 * * * * *',
    force_close: '*/10 * * * * *',
};

export const emoji = {
    company: '<:GRO:834796096685211689>',
    regularBot: ':control_knobs:',
    criticalBot: ':ambulance:',
    statsBot: ':control_knobs:',
    error: ':x:',
    gvt: '<:Vault:834796096797802507>',
    pwrd: '<:PWRD:834796096915767306>',
    miniStatsPersonal: '<:graph:842393056321077299>',
    stats: '<:graph:842393056321077299>',
    depositEvent: '<:deposit:842398612846936074>',
    withdrawEvent: '<:withdraw:842398612873019402>',
    transferEvent: ':arrow_right:',
    reverted: ':warning:',
    investTrigger: ':inbox_tray:',
    curveInvestTrigger: ':inbox_tray:',
    invest: ':inbox_tray:',
    curveInvest: ':inbox_tray:',
    harvestTrigger: ':hammer_pick:',
    harvest: ':hammer_pick:',
    pnlTrigger: ':moneybag:',
    pnl: ':moneybag:',
    rebalanceTrigger: ':scales:',
    rebalance: ':scales:',
    curveCheck: ':loudspeaker:',
};

export const log_folder = '../logs';
export const limit_factor = 900000;
export const force_close_threshold = 950000;
export const contracts = {
    vaults: [
        {
            stable_coin: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            vault_adaptor: '0x0B2E717e1f11c8294A655D6A235F8D1AD7ef395a',
            strategy: '0x5D1294Eba42438C2742697f9Fc6aa455622C5292',
            gas_cost: '1000000',
            wallet_key: 'dai',
            vault_name: 'DAI yVault',
            strategy_name: 'AH',
        },
        {
            stable_coin: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
            vault_adaptor: '0x48cB6fD436D34A909523A74de8f82d6bF59E6A3C',
            strategy: '0xF446480a77A837353873078D209e571eF2293B31',
            gas_cost: '1000000',
            wallet_key: 'usdc',
            vault_name: 'USDC yVault',
            strategy_name: 'AH',
        },
        {
            stable_coin: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
            vault_adaptor: '0x720e5ecfe240a65ca236e5Ec626f91036Ecc260d',
            strategy: '0x5ee227C35ec7f70a2406e4b9D623a709277ee9aD',
            gas_cost: '1000000',
            wallet_key: 'usdt',
            vault_name: 'USDT yVault',
            strategy_name: 'AH',
        },
    ],
    crtoken: '0xb3c68d69E95B095ab4b33B4cB67dBc0fbF3Edf56',
    avax_aggregator: '0x0A77230d17318075983913bC2145DB16C7366156',
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
};

export const discord = {
    token: process.env[`DISCORD_TOKEN_${process.env.BOT_ENV}`],
    retry: 3,
    channel: {
        trades: '840219146277093456',
        protocol_assets: '840219248915120148',
        protocol_events: '840219356860514405',
        crit_action_events: '840219422509760522',
        bot_alerts: '840219078185713705',
        bot_logs: '840219541488402473',
    },
};
