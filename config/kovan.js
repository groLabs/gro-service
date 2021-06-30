module.exports = {
    blockchain: {
        network: 'kovan',
        api_keys: {
            alchemy: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
            infura: 'a0c4911f680a4dd0bf3f7dfac2a4ba08',
            etherscan: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
            pocket: '8dbbeecc2126c14cbc48bf6b66f4a33850fa3537',
        },
        start_block: 25082399,
        keystore: process.env[`KEY_STORE_${process.env.BOT_ENV}`],
        keystore_password: process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`],
        alchemy_api_keys: {
            stats_personal: process.env.ALCHEMY_KEY_STATS_PERSONAL,
            stats_gro: process.env.ALCHEMY_KEY_STATS_GRO,
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
    blockNumberFile: './lastBlockNumber.json',
    stats_latest: '../stats/gro-latest.json',
    vault_name: ['DAI yVault', 'USDC yVault', 'USDT yVault', 'Curve yVault'],
    stable_coin: ['DAI', 'USDC', 'USDT'],
    strategy_exposure: [
        ['Compound'],
        ['Cream'],
        ['Compound'],
        ['Cream'],
        ['Idle', 'Compound'],
        ['Cream'],
        ['Curve'],
    ],
    strategy_name: ['Lev Comp', 'Cream', 'Lev Comp', 'Cream', 'Idle', 'Cream'],
    strategy_default_apy: [58500, 99000, 30700, 65000, 83000, 90278, 200000],
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
        controller: '0x0bBc524f29aeA87E7df378D0Bb09905Cda57c4fF',
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
