CREATE TABLE gro."EV_TRANSACTIONS" (
    "transaction_id" CHARACTER VARYING (256) NOT NULL,
    "block_number" INTEGER NOT NULL,
    "block_timestamp" INTEGER NULL,
    "block_date" TIMESTAMP (6) NULL,
    "network_id" INTEGER NOT NULL,
    "tx_hash" CHARACTER VARYING (66) NOT NULL,
    "block_hash" CHARACTER VARYING (66) NOT NULL,
    "uncled" BOOLEAN NULL DEFAULT FALSE,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_TRANSACTIONS_pkey" PRIMARY KEY (
        "transaction_id"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_TRANSACTIONS" OWNER to postgres;

CREATE TABLE gro."EV_APPROVALS" (
    "log_index" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (256) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (42) NULL,
    "owner" CHARACTER VARYING (42) NULL,
    "spender" CHARACTER VARYING (42) NULL,
    "value" NUMERIC (20, 8) NULL,
    "token_id" SMALLINT NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_APPROVALS_pkey" PRIMARY KEY (
        "log_index",
        "transaction_id",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_APPROVALS" OWNER to postgres;

CREATE TABLE gro."EV_CLAIMS" (
    "log_index" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (256) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "vault_address" CHARACTER VARYING (42) NULL,
    "log_name" CHARACTER VARYING (42) NULL,
    "from" CHARACTER VARYING (42) NULL,
    "token_id" SMALLINT NULL,
    "pids" INTEGER [] NULL,
    "vest" BOOLEAN NULL,
    "tranche_id" NUMERIC (20, 8) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_CLAIMS_pkey" PRIMARY KEY (
        "log_index",
        "transaction_id",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_CLAIMS" OWNER to postgres;

-- CREATE TABLE gro."EV_MULTI_CLAIMS" (
--     "log_index" INTEGER NOT NULL,
--     "transaction_id" CHARACTER VARYING (66) NOT NULL,
--     "contract_address" CHARACTER VARYING (42) NOT NULL,
--     "log_name" CHARACTER VARYING (42) NULL,
--     "from" CHARACTER VARYING (42) NULL,
--     "pids" INTEGER [] NULL,
--     "vest" BOOLEAN NULL,
--     "amounts" NUMERIC (20, 8) [] NULL,
--     "creation_date" TIMESTAMP (6) DEFAULT NOW(),
--     CONSTRAINT "EV_MULTI_CLAIMS_pkey" PRIMARY KEY (
--         "log_index",
--         "transaction_id",
--         "contract_address"
--     ) NOT DEFERRABLE INITIALLY IMMEDIATE
-- ) WITH (OIDS = FALSE);

-- ALTER TABLE gro."EV_MULTI_CLAIMS" OWNER to postgres;

CREATE TABLE gro."EV_DEPOSITS" (
    "log_index" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (42) NULL,
    "from" CHARACTER VARYING (42) NULL,
    "referral" CHARACTER VARYING (42) NULL,
    "pid" SMALLINT NULL,
    "token_id" SMALLINT NULL,
    "allowance" NUMERIC (20, 8) NULL,
    "amount1" NUMERIC (20, 8) NULL,
    "amount2" NUMERIC (20, 8) NULL,
    "amount3" NUMERIC (20, 8) NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_DEPOSITS_pkey" PRIMARY KEY (
        "log_index",
        "transaction_id",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."EV_TRANSFERS" (
    "log_index" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (42) NULL,
    "from" CHARACTER VARYING (42) NULL,
    "to" CHARACTER VARYING (42) NULL,
    "token_id" SMALLINT NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_TRANSFERS_pkey" PRIMARY KEY (
        "log_index",
        "transaction_id",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_TRANSFERS" OWNER to postgres;

CREATE TABLE gro."EV_PNL_STRATEGY_REPORTED"
(
   "log_index"         INTEGER NOT NULL,
   "transaction_id"    CHARACTER VARYING (66) NOT NULL,
   "contract_address"  CHARACTER VARYING (42) NOT NULL,
   "log_name"          CHARACTER VARYING (255) NULL,
   "strategy"          CHARACTER VARYING (42) NULL,
   "gain"              NUMERIC (20, 8) NULL,
   "loss"              NUMERIC (20, 8) NULL,
   "debtPaid"          NUMERIC (20, 8) NULL,
   "totalGain"         NUMERIC (20, 8) NULL,
   "totalLoss"         NUMERIC (20, 8) NULL,
   "totalDebt"         NUMERIC (20, 8) NULL,
   "debtAdded"         NUMERIC (20, 8) NULL,
   "debtRatio"         NUMERIC (20, 8) NULL,
   "lockedProfit"      NUMERIC (20, 8) NULL,
   "totalAssets"       NUMERIC (20, 8) NULL,
   "totalSupply"       NUMERIC (20, 8) NULL,
   "creation_date"     TIMESTAMP (6) DEFAULT NOW(),
   CONSTRAINT "EV_PNL_STRATEGY_REPORTED_pkey" PRIMARY KEY (
       "log_index",
       "transaction_id",
       "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_PNL_STRATEGY_REPORTED" OWNER to postgres;

CREATE TABLE gro."EV_PNL_NEW_RELEASE_FACTOR"
(
   "log_index"         INTEGER NOT NULL,
   "transaction_id"    CHARACTER VARYING (66) NOT NULL,
   "contract_address"  CHARACTER VARYING (42) NOT NULL,
   "log_name"          CHARACTER VARYING (255) NULL,
   "factor"            NUMERIC (20, 8) NULL,
   "creation_date"     TIMESTAMP (6) DEFAULT NOW(),
   CONSTRAINT "EV_PNL_NEW_RELEASE_FACTOR_pkey" PRIMARY KEY (
       "log_index",
       "transaction_id",
       "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_PNL_NEW_RELEASE_FACTOR" OWNER to postgres;

CREATE TABLE gro."EV_WITHDRAWALS" (
    "log_index" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (42) NULL,
    "from" CHARACTER VARYING (42) NULL,
    "pid" INTEGER NULL,
    "amount1" NUMERIC (20, 8) NULL,
    "amount2" NUMERIC (20, 8) NULL,
    "amount3" NUMERIC (20, 8) NULL,
    "value" NUMERIC (20, 8) NULL,
    "referral" CHARACTER VARYING (42) NULL,
    "balanced" BOOLEAN NULL,
    "all" BOOLEAN NULL,
    "deductUsd" NUMERIC (20, 8) NULL,
    "lpAmount" NUMERIC (20, 8) NULL,
    "allowance" NUMERIC (20, 8) NULL,
    "totalLoss" NUMERIC (20, 8) NULL,
    "token_id" SMALLINT NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_WITHDRAWALS_pkey" PRIMARY KEY (
        "log_index",
        "transaction_id",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."EV_MULTI_WITHDRAWALS" (
    "log_index" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (42) NULL,
    "from" CHARACTER VARYING (42) NULL,
    "pids" INTEGER [] NULL,
    "amounts" NUMERIC (20, 8) [] NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "EV_MULTI_WITHDRAWALS_pkey" PRIMARY KEY (
        "log_index",
        "transaction_id",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."EV_MULTI_WITHDRAWALS" OWNER to postgres;
