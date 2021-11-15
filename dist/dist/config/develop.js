"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.discord = exports.contracts = exports.fail_percentage_pre_price = exports.fail_percentage_total = exports.before_block = exports.lifeguard_name = exports.ratioLowerBond = exports.ratioUpperBond = exports.health_endpoint = exports.curve_strategy_dependency = exports.cream_strategy_dependency = exports.harvest_strategy_dependency = exports.strategy_default_apy = exports.strategy_name = exports.strategy_exposure = exports.stable_coin = exports.vault_name = exports.stats_latest = exports.blockNumberFile = exports.log_folder = exports.stats_folder = exports.keep_stats_file_number = exports.transaction_long_pending = exports.emoji = exports.trigger_scheduler = exports.blockchain = exports.buoy_start_block = exports.old_pnl = exports.withdraw_handler_history = exports.deposit_handler_history = void 0;
exports.deposit_handler_history = {
    '0x79b14d909381D79B655C0700d0fdc2C7054635b9': {
        abi: 'old',
        event_fragment: [
            'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[] tokens)',
        ],
    },
    '0x9da6ad743F4F2A247A56350703A4B501c7f2C224': {},
};
exports.withdraw_handler_history = {
    '0xd89512Bdf570476310DE854Ef69D715E0e85B09F': {
        abi: 'old',
        event_fragment: [
            'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[] tokenAmounts)',
        ],
    },
    '0x59B6b763509198d07cF8F13a2dc6F2df98CB0a1d': {},
};
exports.old_pnl = ['0x4C4A81298CC85c5BBF8092bd241fCc5dD6Ec3f74'];
exports.buoy_start_block = 12837080;
exports.blockchain = {
    network: 'http://localhost:8545',
    start_block: 12522788,
    alchemy_api_keys: {
        default: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
        stats_personal: process.env.ALCHEMY_KEY_STATS_PERSONAL,
        stats_gro: process.env.ALCHEMY_KEY_STATS_GRO,
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
            standard_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_STANDARD_GAS,
            fast_file_path: process.env.KEY_STORE_REGULAR_FAST_GAS,
            fast_password: process.env.KEY_PASSWORD_REGULAR_FAST_GAS,
            fast_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_FAST_GAS,
            rapid_file_path: process.env.KEY_STORE_REGULAR_RAPID_GAS,
            rapid_password: process.env.KEY_PASSWORD_REGULAR_RAPID_GAS,
            rapid_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_RAPID_GAS,
        },
    },
    default_api_keys: {
        alchemy: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
        infura: 'a0c4911f680a4dd0bf3f7dfac2a4ba08',
        etherscan: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
        pocket: '8dbbeecc2126c14cbc48bf6b66f4a33850fa3537',
    },
};
exports.trigger_scheduler = {
    pending_transaction_check: '10 * * * * *',
    bot_balance_check: '10 * * * * *',
    invest: '*/1 * * * *',
    harvest: '*/2 * * * *',
    pnl: '*/3 * * * *',
    rebalance: '33 * * * * *',
    generate_stats: '10 * * *',
    remove_stats_file: '*/2 * * * *',
    bot_curve_check: '*/1 * * * *',
    deposit_withdraw_event: '*/2 * * * *',
    event_summary: '*/3 * * * *',
    bot_chainlink_check: '25,55 * * * * *',
};
exports.emoji = {
    regularBot: ':control_knobs:',
    criticalBot: ':ambulance:',
    statsBot: ':control_knobs:',
    error: ':x:',
    gvt: ':high_brightness:',
    pwrd: ':low_brightness:',
    company: ':jigsaw:',
    miniStatsPersonal: ':bar_chart:',
    stats: ':bar_chart:',
    depositEvent: ':chart_with_upwards_trend:',
    withdrawEvent: ':chart_with_downwards_trend:',
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
exports.transaction_long_pending = {
    invest: 1800000,
    investToCurveVault: 1800000,
    strategyHarvest: 900000,
    execPnL: 300000,
    rebalance: 120000,
};
exports.keep_stats_file_number = 80;
exports.stats_folder = '../stats';
exports.log_folder = './logs';
exports.blockNumberFile = './lastBlockNumber.json';
exports.stats_latest = '../stats/gro-latest.json';
exports.vault_name = ['DAI yVault', 'USDC yVault', 'USDT yVault', 'Curve yVault'];
exports.stable_coin = ['DAI', 'USDC', 'USDT'];
exports.strategy_exposure = [
    ['Idle', 'Compound'],
    ['Cream'],
    ['Idle', 'Compound'],
    ['Cream'],
    ['Idle', 'Compound'],
    ['Cream'],
    ['Curve'],
];
exports.strategy_name = ['Idle', 'Cream', 'Idle', 'Cream', 'Idle', 'Cream', 'XPool'];
exports.strategy_default_apy = [58500, 99000, 30700, 65000, 83000, 90278, 200000];
exports.harvest_strategy_dependency = [
    '0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C',
    '0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE',
    '0x053c80eA73Dc6941F518a68E2FC52Ac45BDE7c9C',
];
exports.cream_strategy_dependency = [
    '0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f',
    '0x44fbebd2f576670a6c33f6fc0b00aa8c5753b322',
    '0x797AAB1ce7c01eB727ab980762bA88e7133d2157',
];
exports.curve_strategy_dependency = {
    yearn: '0x1B5eb1173D2Bf770e50F10410C9a96F7a8eB6e75',
    curve: '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
};
exports.health_endpoint = {
    stats: process.env.STATS_BOT_HEALTH,
    critic: process.env.CRITICAL_BOT_HEALTH,
    harvest: process.env.REGULAR_BOT_HEALTH,
};
exports.ratioUpperBond = 14000;
exports.ratioLowerBond = 7000;
exports.lifeguard_name = '3CRV';
exports.before_block = 30;
exports.fail_percentage_total = 1000;
exports.fail_percentage_pre_price = 500;
exports.contracts = {
    controller: '0x514c3230F0b1C93e29Ea59fe8da3cEf0d4f1e0b7',
};
exports.discord = {
    token: process.env[`DISCORD_TOKEN_${process.env.BOT_ENV}`],
    retry: 3,
    channel: {
        trades: '825998630828638239',
        protocol_assets: '825998746696810536',
        protocol_events: '825998886249168896',
        crit_action_events: '825998966691987456',
        bot_alerts: '825999025487609927',
        bot_logs: '825999075971039283',
    },
};
exports.database = {
    host: process.env.DB_DEV_HOST,
    port: process.env.DB_DEV_PORT,
    user: process.env.DB_DEV_USER,
    password: process.env.DB_DEV_PASSWORD,
    database: process.env.DB_DEV_INSTANCE,
};
