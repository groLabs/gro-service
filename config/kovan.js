module.exports = {
    blockchain: {
        network: 'kovan',
        api_keys: {
            alchemy: 'eZY-IyppaOBeY66-RAEN2bl5Ja6I9fqF',
            infura: 'a0c4911f680a4dd0bf3f7dfac2a4ba08',
            etherscan: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
            pocket: '8dbbeecc2126c14cbc48bf6b66f4a33850fa3537',
        },
        start_block: 24102472,
        launch_timestamp: '1617104908',
    },
    stats_folder: '../stats',
    stats_latest: '../stats/gro-latest.json',
    vault_name: ['DAI', 'USDC', 'USDT'],
    strategy_name: ['Harvest', 'Yearn Metapool', 'Generic Lending'],
    contracts: {
        controller: '0xC42dB2005ADB6f579A3c4931c52139926E08F46C',
    },
    discord: {
        token: process.env[`DISCORD_TOKEN_${process.env.BOT_ENV}`],
        opt_channel: '819114874520993812',
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
