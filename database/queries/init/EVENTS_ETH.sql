-- Core protocol

CREATE TABLE gro."EV_GRO_DEPOSITS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "referral" CHARACTER VARYING (42) NULL,
    "usd_amount" NUMERIC (20, 8) NULL,
    "amount1" NUMERIC (20, 8) NULL,
    "amount2" NUMERIC (20, 8) NULL,
    "amount3" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_GRO_DEPOSITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_GRO_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "referral" CHARACTER VARYING (42) NULL,
    "balanced" BOOLEAN NULL,
    "all" BOOLEAN NULL,
    "deduct_usd" NUMERIC (20, 8) NULL,
    "return_usd" NUMERIC (20, 8) NULL,
    "lp_amount" NUMERIC (20, 8) NULL,
    "amount1" NUMERIC (20, 8) NULL,
    "amount2" NUMERIC (20, 8) NULL,
    "amount3" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_GRO_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_GRO_EMERGENCY_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "pwrd" BOOLEAN NULL,
    "account" CHARACTER VARYING (42) NULL,
    "asset" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "price" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_GRO_EMERGENCY_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_EMERGENCY_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_HODLER_CLAIMS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "vest" BOOLEAN NULL,
    "amount" NUMERIC (24, 12) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_HODLER_CLAIMS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_HODLER_CLAIMS" OWNER to postgres;

CREATE TABLE gro."EV_AIRDROP_CLAIMS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "account" CHARACTER VARYING (42) NULL,
    "vest" BOOLEAN NULL,
    "tranche_id" NUMERIC (20, 8) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_AIRDROP_CLAIMS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_AIRDROP_CLAIMS" OWNER to postgres;






CREATE TABLE gro."EV_GRO_VESTS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "total_locked_amount" NUMERIC (20, 8) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "vesting_total" NUMERIC (20, 8) NULL,
    "vesting_start_time" INTEGER NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_GRO_VESTS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_VESTS" OWNER to postgres;

CREATE TABLE gro."EV_GRO_EXITS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "total_locked_amount" NUMERIC (20, 8) NULL,
    "unlocked" NUMERIC (20, 8) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "minting_amount" NUMERIC (20, 8) NULL,
    "penalty" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_GRO_EXITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_EXITS" OWNER to postgres;




-- STAKER TABLES

CREATE TABLE gro."EV_STAKER_DEPOSITS" (
    "transaction_id" CHARACTER VARYING (256) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "pid" INTEGER NULL,
    "amount" NUMERIC (24, 12) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_DEPOSITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_STAKER_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "pids" INTEGER [] NULL,
    "amounts" NUMERIC (24, 12) [] NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_STAKER_CLAIMS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "vest" BOOLEAN NULL,
    "pids" INTEGER [] NULL,
    "amount" NUMERIC (24, 12) NULL,
    "amounts" NUMERIC (24, 12) [] NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_CLAIMS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_CLAIMS" OWNER to postgres;

CREATE TABLE gro."EV_STAKER_USERS_MIGRATED" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "account" CHARACTER VARYING (42) NULL,
    "pids" INTEGER [] NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_USERS_MIGRATED_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_USERS_MIGRATED" OWNER to postgres;

CREATE TABLE gro."EV_STAKER_ADD_POOL" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "pid" INTEGER NULL,
    "alloc_point" INTEGER NULL,
    "lp_token" CHARACTER VARYING (42) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_ADD_POOL_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_ADD_POOL" OWNER to postgres;

CREATE TABLE gro."EV_STAKER_SET_POOL" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "pid" INTEGER NULL,
    "alloc_point" INTEGER NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_SET_POOL_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_SET_POOL" OWNER to postgres;

CREATE TABLE gro."EV_STAKER_MAX_GRO_PER_BLOCK" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "max_gro_per_block" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_MAX_GRO_PER_BLOCK_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_MAX_GRO_PER_BLOCK" OWNER to postgres;

CREATE TABLE gro."EV_STAKER_GRO_PER_BLOCK" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "new_gro" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_GRO_PER_BLOCK_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_GRO_PER_BLOCK" OWNER to postgres;

-- pnl

CREATE TABLE gro."EV_GRO_PNL_EXECUTION" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "deducted_assets" NUMERIC (20, 8) NULL,
    "total_pnl" NUMERIC (20, 8) NULL,
    "invest_pnl" NUMERIC (20, 8) NULL,
    "price_pnl" NUMERIC (20, 8) NULL,
    "withdrawal_bonus" NUMERIC (20, 8) NULL,
    "performance_bonus" NUMERIC (20, 8) NULL,
    "before_gvt_assets" NUMERIC (20, 8) NULL,
    "before_pwrd_assets" NUMERIC (20, 8) NULL,
    "after_gvt_assets" NUMERIC (20, 8) NULL,
    "after_pwrd_assets" NUMERIC (20, 8) NULL,
    "gvt_factor" NUMERIC (20, 12) NULL,
    "pwrd_factor" NUMERIC (20, 12) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_GRO_PNL_EXECUTION_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_PNL_EXECUTION" OWNER to postgres;

CREATE TABLE gro."EV_GRO_STRATEGY_HARVEST" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "profit" NUMERIC (20, 8) NULL,
    "loss" NUMERIC (20, 8) NULL,
    "debt_payment" NUMERIC (20, 8) NULL,
    "debt_outstanding" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_GRO_STRATEGY_HARVEST_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_STRATEGY_HARVEST" OWNER to postgres;

CREATE TABLE gro."EV_GRO_STRATEGY_UPDATE_RATIO" (
   "transaction_id" CHARACTER VARYING (66) NOT NULL,
   "log_index" INTEGER NOT NULL,
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "block_timestamp" INTEGER NULL,
   "log_name" CHARACTER VARYING (100) NOT NULL,
   "strategy" CHARACTER VARYING (42) NOT NULL,
   "debt_ratio" NUMERIC (20, 8) NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "EV_GRO_STRATEGY_UPDATE_RATIO_pkey" PRIMARY KEY
      (transaction_id, log_index, contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_GRO_STRATEGY_UPDATE_RATIO" OWNER to postgres;

-- pools

CREATE TABLE gro."EV_POOL_BAL_SWAP" (
   "transaction_id" CHARACTER VARYING (66) NOT NULL,
   "log_index" INTEGER NOT NULL,
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "block_timestamp" INTEGER NULL,
   "log_name" CHARACTER VARYING (100) NOT NULL,
   "pool_id" CHARACTER VARYING (66) NULL,
   "token_in" CHARACTER VARYING (42) NULL,
   "token_out" CHARACTER VARYING (42) NULL,
   "amount_in" NUMERIC (20, 8) NULL,
   "amount_out" NUMERIC (20, 8) NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "EV_POOL_BAL_SWAP_pkey" PRIMARY KEY
      (transaction_id, log_index, contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_POOL_BAL_SWAP" OWNER to postgres;

CREATE TABLE gro."EV_POOL_BAL_LIQUIDITY" (
   "transaction_id" CHARACTER VARYING (66) NOT NULL,
   "log_index" INTEGER NOT NULL,
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "block_timestamp" INTEGER NULL,
   "log_name" CHARACTER VARYING (100) NOT NULL,
   "pool_id" CHARACTER VARYING (66) NULL,
   "liquidity_provider" CHARACTER VARYING (42) NULL,
   "tokens" CHARACTER VARYING (42) [] NULL,
   "deltas" NUMERIC (20, 8) [] NULL,
   "protocol_fee_amounts" NUMERIC (20, 8) [] NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "EV_POOL_BAL_LIQUIDITY_pkey" PRIMARY KEY
      (transaction_id, log_index, contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_POOL_BAL_LIQUIDITY" OWNER to postgres;

CREATE TABLE gro."EV_POOL_UNI_SWAP" (
   "transaction_id" CHARACTER VARYING (66) NOT NULL,
   "log_index" INTEGER NOT NULL,
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "block_timestamp" INTEGER NULL,
   "log_name" CHARACTER VARYING (100) NOT NULL,
   "sender" CHARACTER VARYING (42) NULL,
   "amount0_in" NUMERIC (20, 8) NULL,
   "amount1_in" NUMERIC (20, 8) NULL,
   "amount0_out" NUMERIC (20, 8) NULL,
   "amount1_out" NUMERIC (20, 8) NULL,
   "to" CHARACTER VARYING (42) NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "EV_POOL_UNI_SWAP_pkey" PRIMARY KEY
      (transaction_id, log_index, contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_POOL_UNI_SWAP" OWNER to postgres;

CREATE TABLE gro."EV_POOL_UNI_LIQUIDITY" (
   "transaction_id" CHARACTER VARYING (66) NOT NULL,
   "log_index" INTEGER NOT NULL,
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "block_timestamp" INTEGER NULL,
   "log_name" CHARACTER VARYING (100) NOT NULL,
   "sender" CHARACTER VARYING (42) NULL,
   "amount0" NUMERIC (20, 8) NULL,
   "amount1" NUMERIC (20, 8) NULL,
   "to" CHARACTER VARYING (42) NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "EV_POOL_UNI_LIQUIDITY_pkey" PRIMARY KEY
      (transaction_id, log_index, contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_POOL_UNI_LIQUIDITY" OWNER to postgres;

CREATE TABLE gro."EV_POOL_META_SWAP" (
   "transaction_id" CHARACTER VARYING (66) NOT NULL,
   "log_index" INTEGER NOT NULL,
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "block_timestamp" INTEGER NULL,
   "log_name" CHARACTER VARYING (100) NOT NULL,
   "buyer" CHARACTER VARYING (42) NULL,
   "sold_id" SMALLINT NULL,
   "tokens_sold" NUMERIC (20, 8) NULL,
   "bought_id" SMALLINT NULL,
   "tokens_bought" NUMERIC (20, 8) NULL,
   "virtual_price" NUMERIC (20, 18) NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "EV_POOL_META_SWAP_pkey" PRIMARY KEY
      (transaction_id, log_index, contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_POOL_META_SWAP" OWNER to postgres;

CREATE TABLE gro."EV_POOL_META_LIQUIDITY" (
   "transaction_id" CHARACTER VARYING (66) NOT NULL,
   "log_index" INTEGER NOT NULL,
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "block_timestamp" INTEGER NULL,
   "log_name" CHARACTER VARYING (100) NOT NULL,
   "provider" CHARACTER VARYING (42) NULL,
   "token_amounts" NUMERIC (20, 8) [] NULL,
   "fees" NUMERIC (20, 8) [] NULL,
   "coin_amount"  NUMERIC (20, 8) NULL,
   "invariant" NUMERIC (20, 8) NULL,
   "token_supply" NUMERIC (20, 8) NULL,
   "virtual_price" NUMERIC (20, 18) NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "EV_POOL_META_LIQUIDITY_pkey" PRIMARY KEY
      (transaction_id, log_index, contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_POOL_META_LIQUIDITY" OWNER to postgres;