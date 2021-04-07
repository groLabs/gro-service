module.exports = {
    blockchain: {
        network: 'http://localhost:8545',
        start_block: 12083864,
        launch_timestamp: '1617679356',
    },
    trigger_scheduler: {
        pending_transaction_check: '5 * * * * *',
        bot_balance_check: '10 * * * * *',
        invest: '*/3 * * * * *',
        harvest: '*/4 * * * * *',
        pnl: '*/5 * * * * *',
        rebalance: '*/6 * * * * *',
        generate_stats: '1 * * * *',
        bot_curve_check: '*/15 * * * * *',
    },
    stats_folder: '../stats',
    log_folder: '../logs',
    stats_latest: '../stats/gro-latest.json',
    vault_name: ['DAI', 'USDC', 'USDT'],
    strategy_name: ['Harvest', 'Yearn Metapool', 'Generic Lending'],
    lifeguard_name: 'Curve-3pool',
    contracts: {
        controller: '0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650',
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
