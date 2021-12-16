CREATE TABLE gro."USER_CACHE_TMP_APPROVALS" (
    block_number INTEGER NULL,
    network_id INTEGER NULL,
    stablecoin_id SMALLINT NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    sender_address CHARACTER VARYING (42) NULL,
    spender_address CHARACTER VARYING (42) NULL,
    coin_amount NUMERIC (20, 8) NULL,
    coin_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_TMP_APPROVALS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_APPROVALS" (
    block_number INTEGER NULL,
    block_timestamp INTEGER NULL,
    approval_date TIMESTAMP (6) NULL,
    network_id INTEGER NULL,
    stablecoin_id SMALLINT NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    sender_address CHARACTER VARYING (42) NULL,
    spender_address CHARACTER VARYING (42) NULL,
    coin_amount NUMERIC (20, 8) NULL,
    coin_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_APPROVALS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_TRANSFERS" (
    block_number INTEGER NULL,
    block_timestamp INTEGER NULL,
    transfer_date TIMESTAMP (6) NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    network_id INTEGER NULL,
    transfer_type CHARACTER VARYING (20) NULL,
    user_address CHARACTER VARYING (42) NULL,
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

ALTER TABLE gro."USER_CACHE_FACT_TRANSFERS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_TMP_DEPOSITS" (
    block_number INTEGER NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    network_id INTEGER NULL,
    transfer_type CHARACTER VARYING (20) NULL,
    user_address CHARACTER VARYING (42) NULL,
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

ALTER TABLE gro."USER_CACHE_TMP_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_TMP_WITHDRAWALS" (
    block_number INTEGER NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    network_id INTEGER NULL,
    transfer_type CHARACTER VARYING (20) NULL,
    user_address CHARACTER VARYING (42) NULL,
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

ALTER TABLE gro."USER_CACHE_TMP_WITHDRAWALS" OWNER to postgres;

-- CREATE TABLE gro."USER_CACHE_FACT_BALANCES_OLD" (
--     balance_date TIMESTAMP (6) NULL,
--     network_id INTEGER NULL,
--     user_address CHARACTER VARYING (42) NULL,
--     usd_value NUMERIC (20, 8) NULL,
--     pwrd_value NUMERIC (20, 8) NULL,
--     gvt_value NUMERIC (20, 8) NULL,
--     creation_date TIMESTAMP (6) NULL
-- ) WITH (OIDS = FALSE);

-- ALTER TABLE gro."USER_CACHE_FACT_BALANCES_OLD" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_BALANCES" (
    balance_date TIMESTAMP (6) NOT NULL,
    network_id INTEGER NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    gvt_unstaked_amount NUMERIC (20, 8) NULL,
    pwrd_unstaked_amount NUMERIC (20, 8) NULL,
    gro_unstaked_amount NUMERIC (20, 8) NULL,
    gro_total_amount NUMERIC (20, 8) NULL,          -- GRO unstaked, staked, vesting, vested, in pools
    usdc_e_amount NUMERIC (20,8) NULL,              -- USDC in AH2 on AVAX
    usdt_e_amount NUMERIC (20,8) NULL,              -- USDT in AH2 on AVAX
    dai_e_amount NUMERIC (20,8) NULL,               -- DAI in AH2 on AVAX
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
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_CACHE_FACT_BALANCES_pkey" PRIMARY KEY (balance_date, network_id, user_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_BALANCES" OWNER to postgres;

-- CREATE TABLE gro."USER_CACHE_FACT_NET_RETURNS_OLD" (
--     balance_date TIMESTAMP (6) NULL,
--     network_id INTEGER NULL,
--     user_address CHARACTER VARYING (42) NULL,
--     usd_value NUMERIC (20, 8) NULL,
--     pwrd_value NUMERIC (20, 8) NULL,
--     gvt_value NUMERIC (20, 8) NULL,
--     usd_ratio_value NUMERIC (20, 8) NULL,
--     pwrd_ratio_value NUMERIC (20, 8) NULL,
--     gvt_ratio_value NUMERIC (20, 8) NULL,
--     creation_date TIMESTAMP (6) NULL
-- ) WITH (OIDS = FALSE);

-- ALTER TABLE gro."USER_CACHE_FACT_NET_RETURNS_OLD" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_NET_RETURNS" (
    balance_date TIMESTAMP (6) NOT NULL,
    network_id INTEGER NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    total_unstaked_value NUMERIC (20, 8) NULL,
    pwrd_unstaked_value NUMERIC (20, 8) NULL,
    gvt_unstaked_value NUMERIC (20, 8) NULL,
    usdc_e_value NUMERIC (20,8) NULL,
    usdt_e_value NUMERIC (20,8) NULL,
    dai_e_value NUMERIC (20,8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_CACHE_FACT_NET_RETURNS_pkey" PRIMARY KEY (balance_date, network_id, user_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_NET_RETURNS" OWNER to postgres;

CREATE OR REPLACE VIEW gro."USER_CACHE_FACT_V_BALANCES" AS
SELECT bal."balance_date",
    bal."user_address",
    bal."network_id",
    bal."gvt_unstaked_amount",
    bal."pwrd_unstaked_amount",
    bal."gro_unstaked_amount",
    (bal."gvt_unstaked_amount" * pri."gvt_value") AS "gvt_unstaked_value",
    (bal."pwrd_unstaked_amount" * pri."pwrd_value") AS "pwrd_unstaked_value",
    (bal."gro_unstaked_amount" * pri."gro_value") AS "gro_unstaked_value"
FROM gro."USER_CACHE_FACT_BALANCES" bal,
    (
        SELECT bal."price_date" as "price_date",
            bal."gvt_value" as "gvt_value",
            bal."pwrd_value" as "pwrd_value",
            bal."gro_value" as "gro_value"
        FROM gro."TOKEN_PRICE" bal,
            (
                SELECT max("price_date") as "max_price_date"
                FROM gro."TOKEN_PRICE"
            ) max_price
        WHERE bal."price_date" = max_price."max_price_date"
    ) pri;

ALTER TABLE gro."USER_CACHE_FACT_V_BALANCES" OWNER to postgres;
