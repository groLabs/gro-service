module.exports = {
    blockchain: {
        network: 'http://localhost:8545',
        start_block: 12184452,
        launch_timestamp: '1617679356',
    },
    trigger_scheduler: {
        pending_transaction_check: '5 30 * * * *',
        bot_balance_check: '10 00 * * * *',
        invest: '*/30 * * * * *',
        harvest: '*/30 * * * * *',
        pnl: '*/30 * * * * *',
        rebalance: '*/30 * * * * *',
        generate_stats: '*/30 * * * * *',
        bot_curve_check: '*/30 * * * * *',
    },
    stats_folder: '../stats',
    stats_latest: '../stats/gro-latest.json',
    vault_name: ['DAI', 'USDC', 'USDT'],
    strategy_name: ['Harvest', 'Yearn Metapool', 'Generic Lending'],
    lifeguard_name: 'Curve-3pool',
    contracts: {
        controller: '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF',
    },
    discord: {
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
    },
};
