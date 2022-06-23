#!/bin/bash

# CORE
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_TRANSACTIONS"' postgres > EV_TRANSACTIONS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_PRICE"' postgres > EV_PRICE.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_APPROVALS"' postgres > EV_APPROVALS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_TRANSFERS"' postgres > EV_TRANSFERS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STRATEGY_REPORTED"' postgres > EV_STRATEGY_REPORTED.sql

# ETH
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_DEPOSITS"' postgres > EV_GRO_DEPOSITS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_WITHDRAWALS"' postgres > EV_GRO_WITHDRAWALS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_EMERGENCY_WITHDRAWALS"' postgres > EV_GRO_EMERGENCY_WITHDRAWALS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_HODLER_CLAIMS"' postgres > EV_HODLER_CLAIMS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_AIRDROP_CLAIMS"' postgres > EV_AIRDROP_CLAIMS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_VESTS"' postgres > EV_GRO_VESTS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_EXITS"' postgres > EV_GRO_EXITS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_DEPOSITS"' postgres > EV_STAKER_DEPOSITS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_WITHDRAWALS"' postgres > EV_STAKER_WITHDRAWALS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_CLAIMS"' postgres > EV_STAKER_CLAIMS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_USERS_MIGRATED"' postgres > EV_STAKER_USERS_MIGRATED.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_ADD_POOL"' postgres > EV_STAKER_ADD_POOL.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_SET_POOL"' postgres > EV_STAKER_SET_POOL.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_MAX_GRO_PER_BLOCK"' postgres > EV_STAKER_MAX_GRO_PER_BLOCK.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_STAKER_GRO_PER_BLOCK"' postgres > EV_STAKER_GRO_PER_BLOCK.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_PNL_EXECUTION"' postgres > EV_GRO_PNL_EXECUTION.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_STRATEGY_HARVEST"' postgres > EV_GRO_STRATEGY_HARVEST.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_GRO_STRATEGY_UPDATE_RATIO"' postgres > EV_GRO_STRATEGY_UPDATE_RATIO.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_POOL_BAL_SWAP"' postgres > EV_POOL_BAL_SWAP.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_POOL_BAL_LIQUIDITY"' postgres > EV_POOL_BAL_LIQUIDITY.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_POOL_UNI_SWAP"' postgres > EV_POOL_UNI_SWAP.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_POOL_UNI_LIQUIDITY"' postgres > EV_POOL_UNI_LIQUIDITY.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_POOL_META_SWAP"' postgres > EV_POOL_META_SWAP.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_POOL_META_LIQUIDITY"' postgres > EV_POOL_META_LIQUIDITY.sql

# AVAX
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_DEPOSITS"' postgres > EV_LAB_DEPOSITS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_WITHDRAWALS"' postgres > EV_LAB_WITHDRAWALS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_NEW_RELEASE_FACTOR"' postgres > EV_LAB_NEW_RELEASE_FACTOR.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_CLAIMS"' postgres > EV_LAB_CLAIMS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_DROPS"' postgres > EV_LAB_DROPS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_AH_POSITIONS"' postgres > EV_LAB_AH_POSITIONS.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_AH_POSITION_OPENED"' postgres > EV_LAB_AH_POSITION_OPENED.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_AH_POSITION_CLOSED"' postgres > EV_LAB_AH_POSITION_CLOSED.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_AH_POSITION_ADJUSTED"' postgres > EV_LAB_AH_POSITION_ADJUSTED.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_AH_LATEST_STRATEGY"' postgres > EV_LAB_AH_LATEST_STRATEGY.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_STRATEGY_HARVEST"' postgres > EV_LAB_STRATEGY_HARVEST.sql
pg_dump -h "gro-stats-mainnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U "postgres" -a -t 'gro."EV_LAB_VAULT_HARVEST"' postgres > EV_LAB_VAULT_HARVEST.sql