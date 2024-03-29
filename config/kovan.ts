require('dotenv').config();
export const deposit_handler_history = {
    '0xa8eB347f14C9230637c608D6Fe64428CB15dc564': {
        abi: 'old',
        event_fragment: [
            'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[] tokens)',
        ],
    },
    '0xE123035EAB51dF44425733905230d9bdB09B5549': {
        event_fragment: [
            'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[3] tokens)',
        ],
    },
    '0x4AD396529f0b13d41F8a835D0c1ba84fb2AEd0FB': {},
};
export const withdraw_handler_history = {
    '0xdEA56F4e3096d524F432f6105537d89ae3641962': {
        abi: 'old',
        event_fragment: [
            'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[] tokenAmounts)',
        ],
    },
    '0x1703dF0282aa8a8A55E0a03F1714e2e9A5301ef1': {
        event_fragment: [
            'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[3] tokenAmounts)',
        ],
    },
    '0x72De5A334b984A0663701275c5ea6D3c14A5a74A': {},
};
export const old_pnl = [
    '0x156Ffb1A7CDc4207EF826335BB483E50cf7710A7',
    '0xea1bb475650cac3701d9b1f12765ee0ecce02c0c',
];
export const blockchain = {
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
        critical: {
            rapid_file_path: process.env.KEY_STORE_CRITICAL_RAPID_GAS,
            rapid_password: process.env.KEY_PASSWORD_CRITICAL_RAPID_GAS,
            rapid_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_CRITICAL_GAS,
        },
    },
};
export const trigger_scheduler = {
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
export const transaction_long_pending = {
    invest: 120000,
    investToCurveVault: 120000,
    strategyHarvest: 120000,
    execPnL: 60000,
    rebalance: 60000,
};
export const keep_stats_file_number = 250;
export const stats_folder = '../stats';
export const log_folder = '../logs';
export const blockNumberFile = '../stats/lastBlockNumber.json';
export const stats_latest = '../stats/gro-latest.json';
export const vault_name = ['DAI yVault', 'USDC yVault', 'USDT yVault', 'Curve yVault'];
export const stable_coin = ['DAI', 'USDC', 'USDT'];
export const strategy_exposure = [
    ['Idle', 'Compound'],
    ['Cream'],
    ['Idle', 'Compound'],
    ['Cream'],
    ['Idle', 'Compound'],
    ['Cream'],
    ['Curve'],
];
export const strategy_name = ['Idle', 'Cream', 'Idle', 'Cream', 'Idle', 'Cream', 'XPool'];
export const strategy_default_apy = [58500, 99000, 30700, 65000, 83000, 90278, 200000];
export const harvest_strategy_dependency = [
    '0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C',
    '0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE',
    '0x053c80eA73Dc6941F518a68E2FC52Ac45BDE7c9C',
];
export const cream_strategy_dependency = [
    '0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f',
    '0x44fbebd2f576670a6c33f6fc0b00aa8c5753b322',
    '0x797AAB1ce7c01eB727ab980762bA88e7133d2157',
];
export const curve_strategy_dependency = {
    yearn: '0x1B5eb1173D2Bf770e50F10410C9a96F7a8eB6e75',
    curve: '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
};
export const ratioUpperBond = 14000;
export const ratioLowerBond = 7000;
export const lifeguard_name = '3CRV';
export const before_block = 30;
export const fail_percentage_total = 1000;
export const fail_percentage_pre_price = 500;
export const contracts = {
    controller: '0x9C809a3Ae4017F4f9cF515961EB8b09Fc7bc72D6',
};
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
