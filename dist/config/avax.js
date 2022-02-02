"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discord = exports.contracts = exports.force_close_threshold = exports.limit_factor = exports.log_folder = exports.emoji = exports.trigger_scheduler = exports.blockchain = void 0;
exports.blockchain = {
    network: 'mainnet',
    start_block: 12522788,
    start_timestamp: 1622204347,
    keystores: {
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
exports.trigger_scheduler = {
    tend: '10 * * * * *',
    harvest: '20 * * * * *',
    force_close: '*/10 * * * * *',
    bot_balance_check: '*/5 * * * *',
};
exports.emoji = {
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
exports.log_folder = '../logs';
exports.limit_factor = 950000;
exports.force_close_threshold = 990000;
exports.contracts = {
    vaults: [
        {
            stable_coin: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            vault_adaptor: '0xA36fb886B458688C05616DbDB819Eb34b6FbbBa3',
            strategy: '0x35322B1ebcfCC5533fcb2B55a06d2c63865F393f',
            gas_cost: '1000000',
            wallet_key: 'dai',
            vault_name: 'DAI.e yVault v1.7 external',
            strategy_name: 'AH',
            decimals: 18,
        },
        {
            stable_coin: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
            vault_adaptor: '0x2388977399CE436Cf902d43A75C6d078898c0F33',
            strategy: '0x85b1d53B528991f46D83bA321D02d07FDC47FbC3',
            gas_cost: '1000000',
            wallet_key: 'usdc',
            vault_name: 'USDC.e yVault v1.7 external',
            strategy_name: 'AH',
            decimals: 6,
        },
        {
            stable_coin: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
            vault_adaptor: '0x8dbd821B96498a8a7a05024b23D6b58c8a0DF98C',
            strategy: '0x17A5D3e919166134E511A242015A67B06ef1D319',
            gas_cost: '1000000',
            wallet_key: 'usdt',
            vault_name: 'USDT.e yVault v1.7 external',
            strategy_name: 'AH',
            decimals: 6,
        },
    ],
    crtoken: '0xb3c68d69E95B095ab4b33B4cB67dBc0fbF3Edf56',
    avax_aggregator: '0x0A77230d17318075983913bC2145DB16C7366156',
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    joe: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
};
exports.discord = {
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