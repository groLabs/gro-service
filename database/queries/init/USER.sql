CREATE TABLE gro."ETH_BLOCKS" (
    block_number INTEGER NOT NULL,
    block_timestamp INTEGER NULL,
    block_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "ETH_BLOCKS_pkey" PRIMARY KEY (block_number) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."ETH_BLOCKS" OWNER to postgres;

CREATE TABLE gro."SYS_USER_LOADS" (
    table_name CHARACTER VARYING (50) NOT NULL,
    network_id SMALLINT NULL,
    target_date TIMESTAMP (6) NULL,
    records_loaded INTEGER NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."SYS_USER_LOADS" OWNER to postgres;

CREATE TABLE gro."TOKEN_PRICE" (
   price_date       TIMESTAMP (6) NOT NULL,
   network_id       SMALLINT NULL,
   gvt_value        NUMERIC (20, 8) NULL,
   pwrd_value       NUMERIC (20, 8) NULL,
   gro_value        NUMERIC (20, 8) NULL,
   weth_value       NUMERIC (20, 8) NULL,
   avax_value       NUMERIC (20, 8) NULL,
   bal_value        NUMERIC (20, 8) NULL,
   creation_date    TIMESTAMP (6) NULL,
   CONSTRAINT "TOKEN_PRICE_pkey" PRIMARY KEY (price_date)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."TOKEN_PRICE" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_APPROVALS" (
    block_number INTEGER NOT NULL,
    block_timestamp INTEGER NULL,
    approval_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    stablecoin_id SMALLINT NULL,
    tx_hash CHARACTER VARYING (66) NOT NULL,
    sender_address CHARACTER VARYING (42) NOT NULL,
    spender_address CHARACTER VARYING (42) NULL,
    coin_amount NUMERIC (20, 8) NULL,
    coin_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_FACT_APPROVALS_pkey" 
        PRIMARY KEY (block_number, tx_hash, sender_address) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_APPROVALS" OWNER to postgres;

CREATE TABLE gro."USER_STD_TMP_APPROVALS" (
    block_number INTEGER NOT NULL,
    network_id SMALLINT NULL,
    stablecoin_id SMALLINT NULL,
    tx_hash CHARACTER VARYING (66) NOT NULL,
    sender_address CHARACTER VARYING (42) NOT NULL,
    spender_address CHARACTER VARYING (42) NULL,
    coin_amount NUMERIC (20, 8) NULL,
    coin_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_TMP_APPROVALS_pkey" 
        PRIMARY KEY (block_number, tx_hash, sender_address) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_TMP_APPROVALS" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_TRANSFERS" (
    block_number INTEGER NOT NULL,
    block_timestamp INTEGER NULL,
    transfer_date TIMESTAMP (6) NULL,
    tx_hash CHARACTER VARYING (66) NOT NULL,
    network_id SMALLINT NULL,
    transfer_type CHARACTER VARYING (20) NOT NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    referral_address CHARACTER VARYING (42) NULL,
    usd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_amount NUMERIC (20, 8) NULL,
    pwrd_amount NUMERIC (20, 8) NULL,
    usd_deduct NUMERIC (20, 8) NULL,
    usd_return NUMERIC (20, 8) NULL,
    lp_amount NUMERIC (20, 8) NULL,
    stable_amount NUMERIC (20, 8) NULL,
    dai_amount NUMERIC (20, 8) NULL,
    usdc_amount NUMERIC (20, 8) NULL,
    usdt_amount NUMERIC (20, 8) NULL,
    gro_amount NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_FACT_TRANSFERS_pkey" PRIMARY KEY (
        block_number,
        tx_hash,
        transfer_type,
        user_address
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_TRANSFERS" OWNER to postgres;

CREATE TABLE gro."USER_STD_TMP_DEPOSITS" (
    block_number INTEGER NOT NULL,
    tx_hash CHARACTER VARYING (66) NOT NULL,
    network_id SMALLINT NULL,
    transfer_type CHARACTER VARYING (20) NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    referral_address CHARACTER VARYING (42) NULL,
    usd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_amount NUMERIC (20, 8) NULL,
    pwrd_amount NUMERIC (20, 8) NULL,
    stable_amount NUMERIC (20, 8) NULL,
    dai_amount NUMERIC (20, 8) NULL,
    usdc_amount NUMERIC (20, 8) NULL,
    usdt_amount NUMERIC (20, 8) NULL,
    gro_amount NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_TMP_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."USER_STD_TMP_WITHDRAWALS" (
    block_number INTEGER NOT NULL,
    tx_hash CHARACTER VARYING (66) NOT NULL,
    network_id SMALLINT NULL,
    transfer_type CHARACTER VARYING (20) NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    referral_address CHARACTER VARYING (42) NULL,
    usd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_amount NUMERIC (20, 8) NULL,
    pwrd_amount NUMERIC (20, 8) NULL,
    usd_deduct NUMERIC (20, 8) NULL,
    usd_return NUMERIC (20, 8) NULL,
    lp_amount NUMERIC (20, 8) NULL,
    stable_amount NUMERIC (20, 8) NULL,
    dai_amount NUMERIC (20, 8) NULL,
    usdc_amount NUMERIC (20, 8) NULL,
    usdt_amount NUMERIC (20, 8) NULL,
    gro_amount NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_TMP_WITHDRAWALS" OWNER to postgres;

-- CREATE TABLE gro."USER_STD_FACT_BALANCES_OLD" (
--     balance_date TIMESTAMP (6) NOT NULL,
--     network_id SMALLINT NULL,
--     user_address CHARACTER VARYING (42) NOT NULL,
--     usd_value NUMERIC (20, 8) NULL,
--     pwrd_value NUMERIC (20, 8) NULL,
--     gvt_value NUMERIC (20, 8) NULL,
--     creation_date TIMESTAMP (6) NULL,
--     CONSTRAINT "USER_STD_FACT_BALANCES_OLD_pkey" PRIMARY KEY (balance_date, user_address) NOT DEFERRABLE INITIALLY IMMEDIATE
-- ) WITH (OIDS = FALSE);

-- ALTER TABLE gro."USER_STD_FACT_BALANCES_OLD" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_BALANCES" (
    balance_date     TIMESTAMP (6) NOT NULL,
    network_id       SMALLINT NULL,
    user_address     CHARACTER VARYING (42) NOT NULL,
    gvt_unstaked_amount NUMERIC (20, 8) NULL,
    pwrd_unstaked_amount NUMERIC (20, 8) NULL,
    gro_unstaked_amount NUMERIC (20, 8) NULL,
    pool0_lp_staked_amount NUMERIC (20, 8) NULL,    -- GRO 100% in MC
    pool1_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in pool
    pool1_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in MC
    pool1_gvt_amount NUMERIC (20, 8) NULL,          -- GVT
    pool1_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool2_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in pool
    pool2_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in MC
    pool2_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool2_usdc_amount NUMERIC (20, 8) NULL,         -- USDC
    pool3_lp_staked_amount NUMERIC (20, 8) NULL,    -- GVT 100%
    pool4_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP PWRD 100% in pool
    pool4_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP PWRD 100% in MC
    pool4_pwrd_amount NUMERIC (20, 8) NULL,         -- PWRD
    pool5_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in pool
    pool5_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in MC
    pool5_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool5_weth_amount NUMERIC (20, 8) NULL,         -- WETH
    creation_date    TIMESTAMP (6) NULL,
   CONSTRAINT "USER_STD_FACT_BALANCES_pkey" PRIMARY KEY (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_BALANCES" OWNER to postgres;

-- Same as USER_STD_FACT_BALANCES: intended to do on-demand extractions at a specific date & time
CREATE TABLE gro."USER_STD_FACT_BALANCES_SNAPSHOT" (
    balance_date TIMESTAMP (6) NOT NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    gvt_unstaked_amount NUMERIC (20, 8) NULL,
    pwrd_unstaked_amount NUMERIC (20, 8) NULL,
    gro_unstaked_amount NUMERIC (20, 8) NULL,
    pool0_lp_staked_amount NUMERIC (20, 8) NULL,    -- GRO 100% in MC
    pool1_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in pool
    pool1_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in MC
    pool1_gvt_amount NUMERIC (20, 8) NULL,          -- GVT
    pool1_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool2_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in pool
    pool2_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in MC
    pool2_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool2_usdc_amount NUMERIC (20, 8) NULL,         -- USDC
    pool3_lp_staked_amount NUMERIC (20, 8) NULL,    -- GVT 100%
    pool4_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP PWRD 100% in pool
    pool4_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP PWRD 100% in MC
    pool4_pwrd_amount NUMERIC (20, 8) NULL,         -- PWRD
    pool5_lp_pooled_amount NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in pool
    pool5_lp_staked_amount NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in MC
    pool5_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool5_weth_amount NUMERIC (20, 8) NULL,         -- WETH
    creation_date    TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_FACT_BALANCES_SNAPSHOT_pkey" PRIMARY KEY (balance_date, user_address) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_BALANCES_SNAPSHOT" OWNER to postgres;

-- CREATE TABLE gro."USER_STD_FACT_NET_RETURNS_OLD" (
--    balance_date        TIMESTAMP (6) NOT NULL,
--    network_id          SMALLINT NULL,
--    user_address        CHARACTER VARYING (42) NOT NULL,
--    total_value         NUMERIC (20, 8) NULL,
--    pwrd_value          NUMERIC (20, 8) NULL,
--    gvt_value           NUMERIC (20, 8) NULL,
--    creation_date       TIMESTAMP (6) NULL,
--    CONSTRAINT "USER_STD_FACT_NET_RETURNS_OLD_pkey" PRIMARY KEY
--       (balance_date, user_address)
--       NOT DEFERRABLE INITIALLY IMMEDIATE
-- ) WITH (OIDS = FALSE);

-- ALTER TABLE gro."USER_STD_FACT_NET_RETURNS_OLD" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_NET_RETURNS" (
    balance_date TIMESTAMP (6) NOT NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    total_unstaked_value NUMERIC (20, 8) NULL,
    pwrd_unstaked_value NUMERIC (20, 8) NULL,
    gvt_unstaked_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_FACT_NET_RETURNS_pkey" PRIMARY KEY (balance_date, user_address) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_NET_RETURNS" OWNER to postgres;

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

