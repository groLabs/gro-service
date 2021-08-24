module.exports = {
    registry_address: '0x5dF979799065F9c10860Ce3E2ac3e62627c6A3A5',
    deposit_handler_history: {
        '0x4246529D7168FE98F0530d99d93d346092bf50F1': {},
        '0xB2a9B574cD0ABD2E24E7F2B412B21d49B87a3CD1': {},
    },
    withdraw_handler_history: {
        '0x50B325c2d97CfC88c79E051d2d2A9E3D9C0ac3A8': {},
        '0xb8082aAeE3fC604FB5E09d895297B138973fA981': {},
    },
    old_pnl: ['0x6E50c4d3b3917a4aa4196F4F90C2533C2d2e1634'],
    buoy_start_block: 10633347,
    blockchain: {
        network: 'ropsten',
        start_block: 10525267,
        start_timestamp: 1624827717,
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
                    process.env[
                        `INFURA_KEY_${process.env.BOT_ENV}_PROJECT_SECRET`
                    ],
            },
            stats_personal: {
                projectId: process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_ID,
                projectSecret:
                    process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_SECRET,
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
                private_key:
                    process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`],
            },
            regular: {
                low_file_path: process.env.KEY_STORE_REGULAR_LOW_GAS,
                low_password: process.env.KEY_PASSWORD_REGULAR_LOW_GAS,
                low_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_LOW_GAS,
                standard_file_path: process.env.KEY_STORE_REGULAR_STANDARD_GAS,
                standard_password:
                    process.env.KEY_PASSWORD_REGULAR_STANDARD_GAS,
                standard_private_key:
                    process.env.BOT_PRIVATE_KEY_REGULAR_STANDARD_GAS,
                fast_file_path: process.env.KEY_STORE_REGULAR_FAST_GAS,
                fast_password: process.env.KEY_PASSWORD_REGULAR_FAST_GAS,
                fast_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_FAST_GAS,
                rapid_file_path: process.env.KEY_STORE_REGULAR_RAPID_GAS,
                rapid_password: process.env.KEY_PASSWORD_REGULAR_RAPID_GAS,
                rapid_private_key:
                    process.env.BOT_PRIVATE_KEY_REGULAR_RAPID_GAS,
            },
            critical: {
                rapid_file_path: process.env.KEY_STORE_CRITICAL_RAPID_GAS,
                rapid_password: process.env.KEY_PASSWORD_CRITICAL_RAPID_GAS,
                rapid_private_key:
                    process.env.BOT_PRIVATE_KEY_REGULAR_CRITICAL_GAS,
            },
        },
    },
    trigger_scheduler: {
        pending_transaction_check: '5 30 * * * *',
        bot_balance_check: '10 00 * * * *',
        invest: '00 10 * * * *',
        harvest: '15 20 * * * *',
        pnl: '30 30 * * * *',
        rebalance: '45 40 * * * *',
        generate_stats: '00 */5 * * * *',
        remove_stats_file: '00 00 * * * *',
        bot_curve_check: '00 */5 * * * *',
        deposit_withdraw_event: '30 */5 * * * *',
        event_summary: '00 * * * *',
        bot_chainlink_check: '00 00 * * * *',
        safety_check: '*/2 * * * *',
    },
    emoji: {
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
    },
    transaction_long_pending: {
        invest: 120000,
        investToCurveVault: 120000,
        strategyHarvest: 120000,
        execPnL: 60000,
        rebalance: 60000,
    },
    keep_stats_file_number: 250,
    stats_folder: '../stats',
    log_folder: '../logs',
    blockNumberFile: '../stats/lastBlockNumber.json',
    stats_latest: '../stats/gro-latest.json',
    vault_name: ['DAI yVault', 'USDC yVault', 'USDT yVault', 'Curve yVault'],
    vault_display_name: ['DAI', 'USDC', 'USDT', '3CRVUSDx'],
    stable_coin: ['DAI', 'USDC', 'USDT'],
    strategy_name: [
        'Lev Comp',
        'Cream',
        'Lev Comp',
        'Cream',
        'Idle',
        'Cream',
        'XPool',
    ],
    strategy_display_name: [
        'Lev Comp - DAI',
        'CREAM - DAI',
        'Lev Comp - USDC',
        'CREAM - USDC',
        'Idle - USDT',
        'CREAM - USDT',
        'Curve - XPool',
    ],
    strategy_default_apy: [106000, 41334, 98500, 49956, 45343, 49513, 117589],
    harvest_strategy_dependency: [
        '0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C',
        '0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE',
        '0x053c80eA73Dc6941F518a68E2FC52Ac45BDE7c9C',
    ],
    cream_strategy_dependency: [
        '0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f',
        '0x44fbebd2f576670a6c33f6fc0b00aa8c5753b322',
        '0x797AAB1ce7c01eB727ab980762bA88e7133d2157',
    ],
    curve_strategy_dependency: {
        yearn: '0x1B5eb1173D2Bf770e50F10410C9a96F7a8eB6e75',
        curve: '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
    },
    health_endpoint: {
        stats: process.env.STATS_BOT_HEALTH,
        critic: process.env.CRITICAL_BOT_HEALTH,
        harvest: process.env.REGULAR_BOT_HEALTH,
    },
    ratioUpperBond: 14000,
    ratioLowerBond: 7000,
    curveRatioLowerBond: 1000,
    lifeguard_name: '3CRV',
    before_block: 30,
    fail_percentage_total: 1000,
    fail_percentage_pre_price: 500,
    contracts: {
        controller: '0x8A59743BBC178063BE23603B39059e1DFE9edD22',
    },
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
    route: {
        gro_stats: {
            hostname: process.env.BOT_DEV_HOST,
            path: '/stats/gro_stats?network=ropsten',
            port: process.env.BOT_DEV_PORT,
        },
        historical_gro_stats: {
            hostname: process.env.BOT_DEV_HOST,
            path: '/stats/historical_gro_stats',
            port: process.env.BOT_DEV_PORT,
        },
        personal_stats: {
            hostname: process.env.BOT_DEV_HOST,
            path: '/stats/gro_personal_position?network=ropsten&address=',
            port: process.env.BOT_DEV_PORT,
        },
    },
};
