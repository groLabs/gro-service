#!/bin/bash

# CORE
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_TRANSACTIONS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_PRICE.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_APPROVALS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_TRANSFERS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STRATEGY_REPORTED.sql" postgres

# ETH
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_DEPOSITS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_WITHDRAWALS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_EMERGENCY_WITHDRAWALS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_HODLER_CLAIMS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_AIRDROP_CLAIMS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_VESTS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_EXITS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_DEPOSITS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_WITHDRAWALS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_CLAIMS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_USERS_MIGRATED.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_ADD_POOL.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_SET_POOL.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_MAX_GRO_PER_BLOCK.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_STAKER_GRO_PER_BLOCK.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_PNL_EXECUTION.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_STRATEGY_HARVEST.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_GRO_STRATEGY_UPDATE_RATIO.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_POOL_BAL_SWAP.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_POOL_BAL_LIQUIDITY.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_POOL_UNI_SWAP.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_POOL_UNI_LIQUIDITY.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_POOL_META_SWAP.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_POOL_META_LIQUIDITY.sql" postgres

# AVAX
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_DEPOSITS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_WITHDRAWALS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_NEW_RELEASE_FACTOR.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_CLAIMS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_DROPS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_AH_POSITIONS.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_AH_POSITION_OPENED.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_AH_POSITION_CLOSED.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_AH_POSITION_ADJUSTED.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_AH_LATEST_STRATEGY.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_STRATEGY_HARVEST.sql" postgres
psql -h "gro-stats-testnet-db1.cph9sdnas43h.eu-west-2.rds.amazonaws.com" -U postgres -f "EV_LAB_VAULT_HARVEST.sql" postgres