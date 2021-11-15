CREATE TABLE gro."USER_CACHE_FACT_APPROVALS" (
    block_number INTEGER NULL,
    block_timestamp INTEGER NULL,
    approval_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    stablecoin_id SMALLINT NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    sender_address CHARACTER VARYING (42) NULL,
    spender_address CHARACTER VARYING (42) NULL,
    coin_amount NUMERIC (20, 8) NULL,
    coin_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_APPROVALS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_BALANCES_OLD" (
    balance_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NULL,
    usd_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_BALANCES_OLD" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_NET_RETURNS" (
    balance_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NULL,
    usd_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    usd_ratio_value NUMERIC (20, 8) NULL,
    pwrd_ratio_value NUMERIC (20, 8) NULL,
    gvt_ratio_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_NET_RETURNS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_TRANSFERS" (
    block_number INTEGER NULL,
    block_timestamp INTEGER NULL,
    transfer_date TIMESTAMP (6) NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    network_id SMALLINT NULL,
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
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_TRANSFERS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_TMP_APPROVALS" (
    block_number INTEGER NULL,
    network_id SMALLINT NULL,
    stablecoin_id SMALLINT NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    sender_address CHARACTER VARYING (42) NULL,
    spender_address CHARACTER VARYING (42) NULL,
    coin_amount NUMERIC (20, 8) NULL,
    coin_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_TMP_APPROVALS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_TMP_DEPOSITS" (
    block_number INTEGER NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    network_id SMALLINT NULL,
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
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_TMP_DEPOSITS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_TMP_WITHDRAWALS" (
    block_number INTEGER NULL,
    tx_hash CHARACTER VARYING (66) NULL,
    network_id SMALLINT NULL,
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
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_TMP_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_BALANCES" (
    balance_date TIMESTAMP (6) NOT NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    gvt_amount_unstaked NUMERIC (20, 8) NULL,
    pwrd_amount_unstaked NUMERIC (20, 8) NULL,
    gro_amount_unstaked NUMERIC (20, 8) NULL,
    pool0_lp_amount_staked NUMERIC (20, 8) NULL,    -- GRO 100% in MC
    pool1_lp_amount_pooled NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in pool
    pool1_lp_amount_staked NUMERIC (20, 8) NULL,    -- LP GVT 50% / GRO 50% in MC
    pool1_gvt_amount NUMERIC (20, 8) NULL,          -- GVT
    pool1_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool2_lp_amount_pooled NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in pool
    pool2_lp_amount_staked NUMERIC (20, 8) NULL,    -- LP GRO 50% / USDC 50% in MC
    pool2_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool2_usdc_amount NUMERIC (20, 8) NULL,         -- USDC
    pool3_lp_amount_staked NUMERIC (20, 8) NULL,    -- GVT 100%
    pool4_lp_amount_pooled NUMERIC (20, 8) NULL,    -- LP PWRD 100% in pool
    pool4_lp_amount_staked NUMERIC (20, 8) NULL,    -- LP PWRD 100% in MC
    pool4_pwrd_amount NUMERIC (20, 8) NULL,         -- PWRD
    pool5_lp_amount_pooled NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in pool
    pool5_lp_amount_staked NUMERIC (20, 8) NULL,    -- LP GRO 80% / WETH 20% in MC
    pool5_gro_amount NUMERIC (20, 8) NULL,          -- GRO
    pool5_weth_amount NUMERIC (20, 8) NULL,         -- WETH
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_CACHE_FACT_BALANCES_pkey" PRIMARY KEY (balance_date, user_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_BALANCES" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_NET_RETURNS_UNSTAKED" (
   balance_date        TIMESTAMP (6) NOT NULL,
   network_id          SMALLINT NULL,
   user_address        CHARACTER VARYING (42) NOT NULL,
   total_value         NUMERIC (20, 8) NULL,
   pwrd_value          NUMERIC (20, 8) NULL,
   gvt_value           NUMERIC (20, 8) NULL,
   creation_date       TIMESTAMP (6) NULL,
   CONSTRAINT "USER_CACHE_FACT_NET_RETURNS_UNSTAKED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_NET_RETURNS_UNSTAKED" OWNER to postgres;

CREATE OR REPLACE VIEW gro."USER_CACHE_FACT_V_BALANCES_UNSTAKED" AS
SELECT bal.balance_date,
    bal.user_address,
    bal.network_id,
    bal.gvt_amount,
    bal.pwrd_amount,
    bal.gro_amount,
    (bal.gvt_amount * pri.gvt_value) AS gvt_value,
    (bal.pwrd_amount * pri.pwrd_value) AS pwrd_value,
    (bal.gro_amount * pri.gro_value) AS gro_value
FROM (
        gro."USER_CACHE_FACT_BALANCES_UNSTAKED" bal
        LEFT JOIN gro."TOKEN_PRICE" pri ON (
            (
                to_char(bal.balance_date, 'DD/MM/YYYY') = to_char(pri.price_date, 'DD/MM/YYYY')
            )
        )
    );

ALTER TABLE gro."USER_CACHE_FACT_V_BALANCES_UNSTAKED" OWNER to postgres;