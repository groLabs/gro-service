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

CREATE TABLE gro."EV_STRATEGY_REPORTED" (
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
    CONSTRAINT "EV_STRATEGY_REPORTED_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STRATEGY_REPORTED" OWNER to postgres;
