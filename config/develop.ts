export const blockchain = {
    network: 'http://localhost:8545',
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
    harvest: '50 * * * * *',
    force_close: '*/50 * * * * *',
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
export const limit_factor = 900000;
export const force_close_threshold = 990000;
export const contracts = {
    vaults: [
        {
            stable_coin: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            vault_adaptor: '0x82e40E1626ebb4076419b49b9403d9Ce2425B956',
            strategy: '0xE0d6EFf0F64dA98B2c0e47102d59709B24cFc76f',
            gas_cost: '1000000',
            wallet_key: 'dai',
            vault_name: 'V1.5 DAI.e yVault',
            strategy_name: 'AH',
            decimals: 18,
        },
        // {
        //     stable_coin: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
        //     vault_adaptor: '0x6518becA1c20221cF6e8ba6F77B85818d1a298E7',
        //     strategy: '0x45Fa601854326DE028B982Df9839a27d22f36344',
        //     gas_cost: '1000000',
        //     wallet_key: 'usdc',
        //     vault_name: 'V1.5 USDC.e yVault',
        //     strategy_name: 'AH',
        //     decimals: 6,
        // },
        // {
        //     stable_coin: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
        //     vault_adaptor: '0x95284D91e69BEAcAaf90AD6Fd3d6C959Eb900BA4',
        //     strategy: '0xB29380360A44a7630f404C7609114e48Fde0DDEE',
        //     gas_cost: '1000000',
        //     wallet_key: 'usdt',
        //     vault_name: 'V1.5 USDT.e yVault',
        //     strategy_name: 'AH',
        //     decimals: 6,
        // },
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
        trades: '825998630828638239',
        protocol_assets: '825998746696810536',
        protocol_events: '825998886249168896',
        crit_action_events: '825998966691987456',
        bot_alerts: '825999025487609927',
        bot_logs: '825999075971039283',
    },
};
