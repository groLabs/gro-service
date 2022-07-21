CREATE TABLE gro."EV_G2_ROUTER_DEPOSITS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "sender" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "index" INTEGER NULL,
    "amounts" NUMERIC (20, 8) [] NULL,
    "tranche" BOOLEAN NULL,
    "slippage" INTEGER NULL,
    "shares" NUMERIC (20, 8) NULL,
    "calc_amount" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_ROUTER_DEPOSITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_ROUTER_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_G2_ROUTER_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "sender" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "index" INTEGER NULL,
    "tranche" BOOLEAN NULL,
    "slippage" INTEGER NULL,
    "calc_amount" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_ROUTER_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_ROUTER_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_G2_TRACHE_DEPOSITS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "sender" CHARACTER VARYING (42) NULL,
    "recipient" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "index" INTEGER NULL,
    "tranche" BOOLEAN NULL,
    "calc_amount" NUMERIC (20, 8) NULL,
    "pwrd_total_supply_base" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_TRACHE_DEPOSITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_TRACHE_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_G2_TRANCHE_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "sender" CHARACTER VARYING (42) NULL,
    "recipient" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "index" INTEGER NULL,
    "tranche" BOOLEAN NULL,
    "calc_amount" NUMERIC (20, 8) NULL,
    "pwrd_total_supply_base" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_TRANCHE_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_TRANCHE_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_G2_TRANCHE_BALANCES" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "balances" NUMERIC(20,8)[2] NULL,
    "utilisation" NUMERIC(20,8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_TRANCHE_BALANCES_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_TRANCHE_BALANCES" OWNER to postgres;

CREATE TABLE gro."EV_G2_VAULT_DEPOSITS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "caller" CHARACTER VARYING (42) NULL,
    "owner" CHARACTER VARYING (42) NULL,
    "assets" NUMERIC (20, 8) NULL,
    "share" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_VAULT_DEPOSITS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_VAULT_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_G2_VAULT_WITHDRAWALS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "caller" CHARACTER VARYING (42) NULL,
    "owner" CHARACTER VARYING (42) NULL,
    "receiver" CHARACTER VARYING (42) NULL,
    "assets" NUMERIC (20, 8) NULL,
    "share" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_VAULT_WITHDRAWALS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_VAULT_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_G2_VAULT_STRATEGY_CHANGES" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "strategy" CHARACTER VARYING (42) NULL,
    "total_gain" NUMERIC (20, 8) NULL,
    "total_loss" NUMERIC (20, 8) NULL,
    "total_debt" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_VAULT_STRATEGY_CHANGES_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_VAULT_STRATEGY_CHANGES" OWNER to postgres;

CREATE TABLE gro."EV_G2_VAULT_STRATEGY_ADDED" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "strategy" CHARACTER VARYING (42) NULL,
    "strategy_id" INTEGER NULL,
    "pos" INTEGER NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_G2_VAULT_STRATEGY_ADDED_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_G2_VAULT_STRATEGY_ADDED" OWNER to postgres;