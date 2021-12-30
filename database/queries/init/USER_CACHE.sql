CREATE TABLE gro."USER_APPROVALS_CACHE" (
    "block_number" INTEGER NOT NULL,
    "block_timestamp" INTEGER NULL,
    "approval_date" TIMESTAMP (6) NULL,
    "network_id" INTEGER NULL,
    "stablecoin_id" SMALLINT NULL,
    "tx_hash" CHARACTER VARYING (66) NOT NULL,
    "sender_address" CHARACTER VARYING (42) NOT NULL,
    "spender_address" CHARACTER VARYING (42) NULL,
    "coin_amount" NUMERIC (20, 8) NULL,
    "coin_value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL,
    CONSTRAINT "USER_APPROVALS_CACHE_pkey" 
        PRIMARY KEY (block_number, network_id, tx_hash, sender_address) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_APPROVALS_CACHE" OWNER to postgres;

CREATE TABLE gro."USER_APPROVALS_TMP_CACHE" (
    "block_number" INTEGER NOT NULL,
    "network_id" INTEGER NULL,
    "stablecoin_id" SMALLINT NULL,
    "tx_hash" CHARACTER VARYING (66) NOT NULL,
    "sender_address" CHARACTER VARYING (42) NOT NULL,
    "spender_address" CHARACTER VARYING (42) NULL,
    "coin_amount" NUMERIC (20, 8) NULL,
    "coin_value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_APPROVALS_TMP_CACHE" OWNER to postgres;

CREATE TABLE gro."USER_TRANSFERS_CACHE" (
    "block_number" INTEGER NOT NULL,
    "block_timestamp" INTEGER NULL,
    "transfer_date" TIMESTAMP (6) NULL,
    "tx_hash" CHARACTER VARYING (66) NOT NULL,
    "network_id" INTEGER NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user_address" CHARACTER VARYING (42) NOT NULL,
    "referral_address" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL,
    CONSTRAINT "USER_TRANSFERS_CACHE_pkey" PRIMARY KEY (
        "block_number",
        "tx_hash",
        "network_id",
        "transfer_id",
        "token_id",
        "user_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_TRANSFERS_CACHE" OWNER to postgres;

CREATE TABLE gro."USER_DEPOSITS_CACHE" (
    "block_number" INTEGER NOT NULL,
    "tx_hash" CHARACTER VARYING (66) NOT NULL,
    "network_id" INTEGER NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user_address" CHARACTER VARYING (42) NOT NULL,
    "referral_address" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_DEPOSITS_CACHE" OWNER to postgres;

CREATE TABLE gro."USER_WITHDRAWALS_CACHE" (
    "block_number" INTEGER NOT NULL,
    "tx_hash" CHARACTER VARYING (66) NOT NULL,
    "network_id" INTEGER NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "token_id" SMALLINT NOT NULL,
    "user_address" CHARACTER VARYING (42) NOT NULL,
    "referral_address" CHARACTER VARYING (42) NULL,
    "amount" NUMERIC (20, 8) NULL,
    "value" NUMERIC (20, 8) NULL,
    "creation_date" TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_WITHDRAWALS_CACHE" OWNER to postgres;

--intended to do on-demand extractions at a specific date & time
CREATE TABLE gro."USER_BALANCES_CACHE" (
    "balance_date" TIMESTAMP (6) NOT NULL,
    "network_id" INTEGER NULL,
    "user_address" CHARACTER VARYING (42) NOT NULL,
    "contract_id" SMALLINT NULL,
    "gvt_unstaked_amount" NUMERIC (20, 8) NULL,
    "pwrd_unstaked_amount" NUMERIC (20, 8) NULL,
    "gro_unstaked_amount" NUMERIC (20, 8) NULL,
    "gro_total_amount" NUMERIC (20, 8) NULL,          -- GRO unstaked, staked, vesting, vested, in pools
    "usdc_e_amount" NUMERIC (20,8) NULL,              -- USDC in AH2 on AVAX
    "usdt_e_amount" NUMERIC (20,8) NULL,              -- USDT in AH2 on AVAX
    "dai_e_amount" NUMERIC (20,8) NULL,               -- DAI in AH2 on AVAX
    "pool0_lp_staked_amount" NUMERIC (20, 8) NULL,    -- GRO 100% in MC
    "pool1_lp_pooled_amount" NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in pool
    "pool1_lp_staked_amount" NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in MC
    "pool1_gvt_amount" NUMERIC (20, 8) NULL,          -- GVT
    "pool1_gro_amount" NUMERIC (20, 8) NULL,          -- GRO
    "pool2_lp_pooled_amount" NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in pool
    "pool2_lp_staked_amount" NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in MC
    "pool2_gro_amount" NUMERIC (20, 8) NULL,          -- GRO
    "pool2_usdc_amount" NUMERIC (20, 8) NULL,         -- USDC
    "pool3_lp_staked_amount" NUMERIC (20, 8) NULL,    -- GVT 100%
    "pool4_lp_pooled_amount" NUMERIC (20, 8) NULL,    -- LP PWRD 100% in pool
    "pool4_lp_staked_amount" NUMERIC (20, 8) NULL,    -- LP PWRD 100% in MC
    "pool4_pwrd_amount" NUMERIC (20, 8) NULL,         -- PWRD
    "pool5_lp_pooled_amount" NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in pool
    "pool5_lp_staked_amount" NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in MC
    "pool5_gro_amount" NUMERIC (20, 8) NULL,          -- GRO
    "pool5_weth_amount" NUMERIC (20, 8) NULL,         -- WETH
    "creation_date" TIMESTAMP (6) NULL,
   CONSTRAINT "USER_BALANCES_CACHE_pkey" 
        PRIMARY KEY (balance_date, network_id, user_address)
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_BALANCES_CACHE" OWNER to postgres;

CREATE TABLE gro."USER_NET_RETURNS_CACHE" (
    "balance_date" TIMESTAMP (6) NOT NULL,
    "network_id" INTEGER NULL,
    "user_address" CHARACTER VARYING (42) NOT NULL,
    "total_unstaked_value" NUMERIC (20, 8) NULL,
    "pwrd_unstaked_value" NUMERIC (20, 8) NULL,
    "gvt_unstaked_value" NUMERIC (20, 8) NULL,
    "usdc_e_value" NUMERIC (20,8) NULL,
    "usdt_e_value" NUMERIC (20,8) NULL,
    "dai_e_value" NUMERIC (20,8) NULL,
    "creation_date" TIMESTAMP (6) NULL,
    CONSTRAINT "USER_NET_RETURNS_CACHE_pkey"
        PRIMARY KEY (balance_date, network_id, user_address) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_NET_RETURNS_CACHE" OWNER to postgres;

/*
CREATE OR REPLACE VIEW gro."USER_STD_FACT_V_BALANCES" AS
SELECT bal."balance_date",
    bal."user_address",
    bal."network_id",
    bal."gvt_unstaked_amount" as "gvt_unstaked_amount",
    bal."pwrd_unstaked_amount" as "pwrd_unstaked_amount",
    bal."gro_unstaked_amount" as "gro_unstaked_amount",
    bal."gvt_unstaked_amount" * pri."gvt_value" as "gvt_unstaked_value",
    bal."pwrd_unstaked_amount" * pri."pwrd_value" as "pwrd_unstaked_value",
    bal."gro_unstaked_amount" * pri."gro_value" as "gro_unstaked_value"
FROM gro."USER_STD_FACT_BALANCES" bal
    LEFT JOIN gro."TOKEN_PRICE" pri ON bal."balance_date" = pri."price_date";

ALTER VIEW gro."USER_STD_FACT_V_BALANCES" OWNER to postgres;
*/
