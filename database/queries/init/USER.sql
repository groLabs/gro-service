CREATE TABLE gro."ETH_BLOCKS" (
    block_number INTEGER NOT NULL,
    block_timestamp INTEGER NULL,
    block_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "ETH_BLOCKS_pkey" PRIMARY KEY (block_number) NOT DEFERRABLE INITIALLY IMMEDIATE
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

CREATE TABLE gro."USER_CACHE_FACT_BALANCES" (
    balance_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NULL,
    usd_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_BALANCES" OWNER to postgres;

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
    CONSTRAINT "USER_STD_FACT_APPROVALS_pkey" PRIMARY KEY (block_number, tx_hash, sender_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_APPROVALS" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_BALANCES" (
    balance_date TIMESTAMP (6) NOT NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    usd_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_FACT_BALANCES_pkey" PRIMARY KEY (balance_date, user_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_BALANCES" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_NET_RETURNS" (
    balance_date TIMESTAMP (6) NOT NULL,
    network_id SMALLINT NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    usd_value NUMERIC (20, 8) NULL,
    pwrd_value NUMERIC (20, 8) NULL,
    gvt_value NUMERIC (20, 8) NULL,
    usd_ratio_value NUMERIC (20, 8) NULL,
    pwrd_ratio_value NUMERIC (20, 8) NULL,
    gvt_ratio_value NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_FACT_NET_RETURNS_pkey" PRIMARY KEY (balance_date, user_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_NET_RETURNS" OWNER to postgres;

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
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "USER_STD_FACT_TRANSFERS_pkey" PRIMARY KEY (
        block_number,
        tx_hash,
        transfer_type,
        user_address
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_TRANSFERS" OWNER to postgres;

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
    CONSTRAINT "USER_STD_TMP_APPROVALS_pkey" PRIMARY KEY (block_number, tx_hash, sender_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_TMP_APPROVALS" OWNER to postgres;

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
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_TMP_WITHDRAWALS" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_BALANCES_POOLED" (
   balance_date         TIMESTAMP (6) NOT NULL,
   network_id           SMALLINT NULL,
   user_address         CHARACTER VARYING (42) NOT NULL,
   pool1_lp_amount      NUMERIC (20, 8) NULL,
   pool1_gro_amount     NUMERIC (20, 8) NULL,
   pool1_gvt_amount     NUMERIC (20, 8) NULL,
   pool2_lp_amount      NUMERIC (20, 8) NULL,
   pool2_gro_amount     NUMERIC (20, 8) NULL,
   pool2_usdc_amount    NUMERIC (20, 8) NULL,
   pool4_lp_amount      NUMERIC (20, 8) NULL,
   pool4_pwrd_amount    NUMERIC (20, 8) NULL,
   pool5_lp_amount      NUMERIC (20, 8) NULL,
   pool5_gro_amount     NUMERIC (20, 8) NULL,
   pool5_weth_amount    NUMERIC (20, 8) NULL,
   creation_date        TIMESTAMP (6) NULL,
   CONSTRAINT "USER_STD_FACT_BALANCES_POOLED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_BALANCES_POOLED" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_BALANCES_STAKED" (
   balance_date     TIMESTAMP (6) NOT NULL,
   network_id       SMALLINT NULL,
   user_address     CHARACTER VARYING (42) NOT NULL,
   pool0_amount     NUMERIC (20, 8) NULL,
   pool1_amount     NUMERIC (20, 8) NULL,
   pool2_amount     NUMERIC (20, 8) NULL,
   pool3_amount     NUMERIC (20, 8) NULL,
   pool4_amount     NUMERIC (20, 8) NULL,
   pool5_amount     NUMERIC (20, 8) NULL,
   creation_date    TIMESTAMP (6) NULL,
   CONSTRAINT "USER_STD_FACT_BALANCES_STAKED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_BALANCES_STAKED" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_BALANCES_UNSTAKED" (
   balance_date     TIMESTAMP (6) NOT NULL,
   network_id       SMALLINT NULL,
   user_address     CHARACTER VARYING (42) NOT NULL,
   gvt_amount       NUMERIC (20, 8) NULL,
   pwrd_amount      NUMERIC (20, 8) NULL,
   gro_amount       NUMERIC (20, 8) NULL,
   creation_date    TIMESTAMP (6) NULL,
   CONSTRAINT "USER_STD_FACT_BALANCES_UNSTAKED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_BALANCES_UNSTAKED" OWNER to postgres;

CREATE TABLE gro."USER_STD_FACT_NET_RETURNS_UNSTAKED" (
   balance_date        TIMESTAMP (6) NOT NULL,
   network_id          SMALLINT NULL,
   user_address        CHARACTER VARYING (42) NOT NULL,
   total_value         NUMERIC (20, 8) NULL,
   pwrd_value          NUMERIC (20, 8) NULL,
   gvt_value           NUMERIC (20, 8) NULL,
   creation_date       TIMESTAMP (6) NULL,
   CONSTRAINT "USER_STD_FACT_NET_RETURNS_UNSTAKED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_STD_FACT_NET_RETURNS_UNSTAKED" OWNER to postgres;

CREATE TABLE gro."TOKEN_PRICE" (
   price_date       TIMESTAMP (6) NOT NULL,
   network_id       SMALLINT NULL,
   gvt_value        NUMERIC (20, 8) NULL,
   pwrd_value       NUMERIC (20, 8) NULL,
   gro_value        NUMERIC (20, 8) NULL,
   creation_date    TIMESTAMP (6) NULL,
   CONSTRAINT "TOKEN_PRICE_pkey" PRIMARY KEY (price_date)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."TOKEN_PRICE" OWNER to postgres;


CREATE OR REPLACE VIEW gro."USER_STD_FACT_V_BALANCES_UNSTAKED" AS
SELECT bal."balance_date",
    bal."user_address",
    bal."network_id",
    bal."gvt_amount" as "gvt_amount",
    bal."pwrd_amount" as "pwrd_amount",
    bal."gro_amount" as "gro_amount",
    bal."gvt_amount" * pri."gvt_value" as "gvt_value",
    bal."pwrd_amount" * pri."pwrd_value" as "pwrd_value",
    bal."gro_amount" * pri."gro_value" as "gro_value"
FROM gro."USER_STD_FACT_BALANCES_UNSTAKED" bal
    LEFT JOIN gro."TOKEN_PRICE" pri ON bal."balance_date" = pri."price_date";

ALTER VIEW gro."USER_STD_FACT_V_BALANCES_UNSTAKED" OWNER to postgres;

---------

CREATE TABLE gro."USER_CACHE_FACT_BALANCES_POOLED" (
   balance_date         TIMESTAMP (6) NOT NULL,
   network_id           SMALLINT NULL,
   user_address         CHARACTER VARYING (42) NOT NULL,
   pool1_lp_amount      NUMERIC (20, 8) NULL,
   pool1_gro_amount     NUMERIC (20, 8) NULL,
   pool1_gvt_amount     NUMERIC (20, 8) NULL,
   pool2_lp_amount      NUMERIC (20, 8) NULL,
   pool2_gro_amount     NUMERIC (20, 8) NULL,
   pool2_usdc_amount    NUMERIC (20, 8) NULL,
   pool4_lp_amount      NUMERIC (20, 8) NULL,
   pool4_pwrd_amount    NUMERIC (20, 8) NULL,
   pool5_lp_amount      NUMERIC (20, 8) NULL,
   pool5_gro_amount     NUMERIC (20, 8) NULL,
   pool5_weth_amount    NUMERIC (20, 8) NULL,
   creation_date        TIMESTAMP (6) NULL,
   CONSTRAINT "USER_CACHE_FACT_BALANCES_POOLED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_BALANCES_POOLED" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_BALANCES_STAKED" (
   balance_date     TIMESTAMP (6) NOT NULL,
   network_id       SMALLINT NULL,
   user_address     CHARACTER VARYING (42) NOT NULL,
   pool0_amount     NUMERIC (20, 8) NULL,
   pool1_amount     NUMERIC (20, 8) NULL,
   pool2_amount     NUMERIC (20, 8) NULL,
   pool3_amount     NUMERIC (20, 8) NULL,
   pool4_amount     NUMERIC (20, 8) NULL,
   pool5_amount     NUMERIC (20, 8) NULL,
   creation_date    TIMESTAMP (6) NULL,
   CONSTRAINT "USER_CACHE_FACT_BALANCES_STAKED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_BALANCES_STAKED" OWNER to postgres;

CREATE TABLE gro."USER_CACHE_FACT_BALANCES_UNSTAKED" (
   balance_date     TIMESTAMP (6) NOT NULL,
   network_id       SMALLINT NULL,
   user_address     CHARACTER VARYING (42) NOT NULL,
   gvt_amount       NUMERIC (20, 8) NULL,
   pwrd_amount      NUMERIC (20, 8) NULL,
   gro_amount       NUMERIC (20, 8) NULL,
   creation_date    TIMESTAMP (6) NULL,
   CONSTRAINT "USER_CACHE_FACT_BALANCES_UNSTAKED_pkey" PRIMARY KEY
      (balance_date, user_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."USER_CACHE_FACT_BALANCES_UNSTAKED" OWNER to postgres;

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