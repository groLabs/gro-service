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

CREATE TABLE gro."EV_LAB_DROPS" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "merkle_root" CHARACTER VARYING (66) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_DROPS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_DROPS" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITIONS" (
    "position_id" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "block_number" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "want_open" NUMERIC (20, 8) NULL,
    "want_close" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITIONS_pkey" PRIMARY KEY (
        "position_id",
        "transaction_id"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_POSITIONS" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITION_OPENED" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "position_id" INTEGER NOT NULL,
    "block_number" INTEGER NOT NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "amount" NUMERIC (20, 8) [] NULL,
    "collateral_size" NUMERIC (24, 12) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITION_OPENED_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_POSITION_OPENED" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITION_CLOSED" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "position_id" INTEGER NOT NULL,
    "block_number" INTEGER NOT NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "amount" NUMERIC (20, 8) [] NULL,
    "want_received" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITION_CLOSED_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_AH_POSITION_CLOSED" OWNER to postgres;

CREATE TABLE gro."EV_LAB_AH_POSITION_ADJUSTED" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "position_id" INTEGER NOT NULL,
    "block_number" INTEGER NOT NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "amount" NUMERIC (20, 8) [] NULL,
    "collateral_size" NUMERIC (24, 12) NULL,
    "withdraw" BOOLEAN NULL,
    "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
    CONSTRAINT "EV_LAB_AH_POSITION_ADJUSTED_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
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

CREATE TABLE gro."EV_LAB_STRATEGY_HARVEST" (
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
    CONSTRAINT "EV_LAB_STRATEGY_HARVEST_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_STRATEGY_HARVEST" OWNER to postgres;

CREATE TABLE gro."EV_LAB_VAULT_HARVEST" (
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "block_timestamp" INTEGER NULL,
    "log_name" CHARACTER VARYING (100) NOT NULL,
    "loss" BOOLEAN NULL,
    "change" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_LAB_VAULT_HARVEST_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_LAB_VAULT_HARVEST" OWNER to postgres;