module.exports = {
    blockchain: {
        network: 'http://localhost:8545',
        start_block: 12144512,
        launch_timestamp: '1617157103',
    },
    stats_folder: '../stats',
    stats_latest: '../stats/gro-latest.json',
    vault_name: ['DAI', 'USDC', 'USDT'],
    strategy_name: ['Harvest', 'Yearn Metapool', 'Generic Lending'],
    contracts: {
        controller: '0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf',
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
