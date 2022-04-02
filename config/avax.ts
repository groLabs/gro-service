export const blockchain = {
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
export const trigger_scheduler = {
    tend: '10 * * * * *',
    harvest: '20 * * * * *',
    force_close: '*/10 * * * * *',
    bot_balance_check: '*/5 * * * *',
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
export const limit_factor = 950000;
export const force_close_threshold = 990000;
export const contracts = {
    vaults: [
        {
            stable_coin: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            vault_adaptor: '0x7b2f293B2164c70834C134Dc6bA61e6B6119f0b5',
            strategy: '0xCfd28f3afB79380eC6cD759F76eA0a5c5b56A9aC',
            gas_cost: '1000000',
            wallet_key: 'dai',
            vault_name: 'DAI.e yVault v1.8',
            strategy_name: 'AH',
            decimals: 18,
        },
        {
            stable_coin: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
            vault_adaptor: '0x6FfF1e1140034897f5b370b931Fbd7e4970FE130',
            strategy: '0xECBA3778357a7A448810D1D9a67025cD9BAf169A',
            gas_cost: '1000000',
            wallet_key: 'usdc',
            vault_name: 'USDC.e yVault v1.8',
            strategy_name: 'AH',
            decimals: 6,
        },
        {
            stable_coin: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
            vault_adaptor: '0xcc20CE15425A89614bD7a3B539a3c966FA7fFBC2',
            strategy: '0x7053CdCfe9A6f8DB99768734939fCD6672470158',
            gas_cost: '1000000',
            wallet_key: 'usdt',
            vault_name: 'USDT.e yVault v1.8',
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
