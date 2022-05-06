-- CORE tables

CREATE TABLE gro."EV_TRANSACTIONS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "block_number" INTEGER NOT NULL,
    "block_timestamp" INTEGER NULL,
    "block_date" TIMESTAMP (6) WITHOUT TIME ZONE NULL,
    "network_id" INTEGER NOT NULL,
    "tx_hash" CHARACTER VARYING (66) NOT NULL,
    "block_hash" CHARACTER VARYING (66) NOT NULL,
    "uncle_block" BOOLEAN NULL DEFAULT FALSE,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_TRANSACTIONS_pkey" PRIMARY KEY (
        "transaction_id"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_TRANSACTIONS" OWNER to postgres;

CREATE TABLE gro."EV_PRICE" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token1_id" SMALLINT NULL,
    "token2_id" SMALLINT NULL,
    "price" NUMERIC (20, 8) NULL,
    "round_id" INTEGER NULL,
    "updated_at" INTEGER NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_PRICE_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_PRICE" OWNER to postgres;

CREATE TABLE gro."EV_APPROVALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "owner" CHARACTER VARYING (42) NULL,
    "spender" CHARACTER VARYING (42) NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_APPROVALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_APPROVALS" OWNER to postgres;

CREATE TABLE gro."EV_TRANSFERS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "from" CHARACTER VARYING (42) NULL,
    "to" CHARACTER VARYING (42) NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_TRANSFERS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_TRANSFERS" OWNER to postgres;

-- LAB TABLES

CREATE TABLE gro."EV_LAB_DEPOSITS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "from" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "shares" NUMERIC (20, 8) NULL,
    "allowance" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_LAB_DEPOSITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_LAB_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "from" CHARACTER VARYING (42) NULL,
    "value" NUMERIC (20, 8) NULL,
    "shares" NUMERIC (20, 8) NULL,
    "total_loss" NUMERIC (20, 8) NULL,
    "allowance" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_LAB_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_LAB_STRATEGY_REPORTED" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "strategy" CHARACTER VARYING (42) NULL,
    "gain" NUMERIC (20, 8) NULL,
    "loss" NUMERIC (20, 8) NULL,
    "debt_paid" NUMERIC (20, 8) NULL,
    "total_gain" NUMERIC (20, 8) NULL,
    "total_loss" NUMERIC (20, 8) NULL,
    "total_debt" NUMERIC (20, 8) NULL,
    "debt_added" NUMERIC (20, 8) NULL,
    "debt_ratio" NUMERIC (20, 8) NULL,
    "locked_profit" NUMERIC (20, 8) NULL,
    "total_assets" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_LAB_STRATEGY_REPORTED_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_STRATEGY_REPORTED" OWNER to postgres;

CREATE TABLE gro."EV_LAB_NEW_RELEASE_FACTOR" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "factor" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_LAB_NEW_RELEASE_FACTOR_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_NEW_RELEASE_FACTOR" OWNER to postgres;

CREATE TABLE gro."EV_LAB_CLAIMS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "account" CHARACTER VARYING (42) NULL,
    "vault" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_CLAIMS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_CLAIMS" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITIONS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "position_id" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "want_open" NUMERIC (20, 8) NULL,
    "want_close" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITIONS_pkey" PRIMARY KEY (
        "transaction_id"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_POSITIONS" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITION_OPENED" (
    "position_id" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "amount" NUMERIC (20, 8) [] NULL,
    "collateral_size" NUMERIC (24, 12) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITION_OPENED_pkey" PRIMARY KEY (
        "position_id"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_POSITION_OPENED" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITION_CLOSED" (
    "position_id" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "amount" NUMERIC (20, 8) [] NULL,
    "want_received" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITION_CLOSED_pkey" PRIMARY KEY (
        "position_id"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_POSITION_CLOSED" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITION_ADJUSTED" (
    "position_id" INTEGER NOT NULL,
    "transaction_hash" CHARACTER VARYING (66) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "amount" NUMERIC (20, 8) [] NULL,
    "collateral_size" NUMERIC (24, 12) NULL,
    "withdraw" BOOLEAN NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITION_ADJUSTED_pkey" PRIMARY KEY (
        "position_id",
        "transaction_hash"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_POSITION_ADJUSTED" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_LATEST_STRATEGY" (
    "position_id" INTEGER NOT NULL,
    "transaction_hash" CHARACTER VARYING (66) NOT NULL,
    "block_number" INTEGER NOT NULL,
    "block_timestamp" INTEGER NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "estimated_total_assets" NUMERIC (20, 8) NULL,
    "avax_exposure" NUMERIC (20, 12) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_LATEST_STRATEGY_pkey" PRIMARY KEY (
        "position_id",
        "transaction_hash"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_LATEST_STRATEGY" OWNER to postgres;

-- GRO TABLES

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

-- DAO TABLES

CREATE TABLE gro."EV_DAO_DEPOSITS" (
    "transaction_id" CHARACTER VARYING (256) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "pid" INTEGER NULL,
    "amount" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_DAO_DEPOSITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_DAO_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_DAO_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "pids" INTEGER [] NULL,
    "amounts" NUMERIC (20, 8) [] NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_DAO_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_DAO_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_DAO_CLAIMS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user" CHARACTER VARYING (42) NULL,
    "vest" BOOLEAN NULL,
    "pids" INTEGER [] NULL,
    "amount" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_DAO_CLAIMS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_DAO_CLAIMS" OWNER to postgres;