module.exports = {
    blockchain: {
        start_block: 24142471,
        launch_timestamp: '1617442180',
    },
    trigger_scheduler: {
        pending_transaction_check: '5 30 * * * *',
        bot_balance_check: '10 00 * * * *',
        invest: '00 10 * * * * *',
        harvest: '15 20 * * * *',
        pnl: '30 30 * * * *',
        rebalance: '45 40 * * * *',
        generate_stats: '20 */15 * * * *',
        bot_curve_check: '00 50 * * * *',
    },
    bot_balance_warn: '20000000000000000000',
    harvest_callcost: {
        vault_0: {
            strategy_0: '10000000000',
            strategy_1: '10000000000',
            strategy_2: '10000000000',
        },
        vault_1: {
            strategy_0: '100000',
            strategy_1: '100000',
            strategy_2: '100000',
        },
        vault_2: {
            strategy_0: '100000',
            strategy_1: '100000',
            strategy_2: '100000',
        },
    },
    harvest_strategies: ['harvest', 'curveXpool', 'genericLender'],
    stats: {
        amount_decimal_place: 7,
        ratio_decimal_place: 4,
    },
};
