module.exports = {
    deposit_handler_history: {
        '0xa8eB347f14C9230637c608D6Fe64428CB15dc564': {
            abi: 'old',
            event_fragment: [
                'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[] tokens)',
            ],
        },
        '0x1d4e23A8da2571Ab3755329f9fc9BFA29E119b80': {},
    },
    withdraw_handler_history: {
        '0xdEA56F4e3096d524F432f6105537d89ae3641962': {
            abi: 'old',
            event_fragment: [
                'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[] tokenAmounts)',
            ],
        },
        '0x4b6a4FD1e9Bd9863BCF864eAB312Fd7f6FE4822C': {},
    },
    old_pnl: '0x156Ffb1A7CDc4207EF826335BB483E50cf7710A7',
    blockchain: {
        network: 'kovan',
        start_block: 25643447,
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
    stable_coin: ['DAI', 'USDC', 'USDT'],
    protocol: ['Compound', 'Cream', 'Curve', 'Idle'],
    strategy_name: ['Lev Comp', 'Cream', 'Lev Comp', 'Cream', 'Idle', 'Cream'],
    strategy_default_apy: [132800, 99000, 90000, 65000, 83000, 90278, 200000],
    curve_strategy_name: ['XPool'],
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
    ratioUpperBond: 14000,
    ratioLowerBond: 7000,
    lifeguard_name: '3CRV',
    before_block: 30,
    fail_percentage_total: 1000,
    fail_percentage_pre_price: 500,
    contracts: {
        controller: '0xBAab9Fbfcc3B8F44cFF9A8e8D7b0F5105F97F195',
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
};
