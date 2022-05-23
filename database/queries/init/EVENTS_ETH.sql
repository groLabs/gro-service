-- ETH TABLES

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
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "EV_STAKER_CLAIMS_pkey" PRIMARY KEY (
        "transaction_id",
        "log_index",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_STAKER_CLAIMS" OWNER to postgres;