CREATE TABLE IF NOT EXISTS gro."PROTOCOL_APY" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    product_id integer NOT NULL,
    apy_last24h numeric(20, 8),
    apy_last7d numeric(20, 8),
    apy_daily numeric(20, 8),
    apy_weekly numeric(20, 8),
    apy_monthly numeric(20, 8),
    apy_all_time numeric(20, 8),
    apy_current numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_APY_pkey" PRIMARY KEY ("current_timestamp", network_id, product_id)
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_APY" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_EXPOSURE_PROTOCOLS" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(100) COLLATE pg_catalog."default",
    concentration numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_EXPOSURE_PROTOCOLS_pkey" PRIMARY KEY ("current_timestamp", network_id, name)
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_EXPOSURE_PROTOCOLS" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_EXPOSURE_STABLES" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(100) COLLATE pg_catalog."default",
    concentration numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_EXPOSURE_STABLES_pkey" PRIMARY KEY ("current_timestamp", network_id, name)
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_EXPOSURE_STABLES" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_LIFEGUARD" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(100) COLLATE pg_catalog."default",
    amount numeric(20, 8),
    share numeric(20, 8),
    last3d_apy numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_LIFEGUARD_pkey" PRIMARY KEY ("current_timestamp", network_id, name)
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_LIFEGUARD" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_RESERVES" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    vault_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    reserve_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(100) COLLATE pg_catalog."default",
    amount numeric(20, 8),
    share numeric(20, 8),
    last3d_apy numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_RESERVES_pkey" PRIMARY KEY (
        "current_timestamp",
        network_id,
        vault_name,
        reserve_name
    )
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_RESERVES" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_STRATEGIES" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    vault_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    strategy_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(100) COLLATE pg_catalog."default",
    address character varying(42) COLLATE pg_catalog."default",
    amount numeric(20, 8),
    share numeric(20, 8),
    last3d_apy numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_STRATEGIES_pkey" PRIMARY KEY (
        "current_timestamp",
        network_id,
        vault_name,
        strategy_name
    )
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_STRATEGIES" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_SYSTEM" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    total_share numeric(20, 8),
    total_amount numeric(20, 8),
    last3d_apy numeric(20, 8),
    hodl_bonus numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_SYSTEM_pkey" PRIMARY KEY ("current_timestamp", network_id)
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_SYSTEM" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_TVL" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    tvl_pwrd numeric(20, 8),
    tvl_gvt numeric(20, 8),
    tvl_total numeric(20, 8),
    util_ratio numeric(20, 8),
    util_ratio_limit_pwrd numeric(20, 8),
    util_ratio_limit_gvt numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_TVL_pkey" PRIMARY KEY ("current_timestamp", network_id)
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_TVL" OWNER to postgres;

CREATE TABLE IF NOT EXISTS gro."PROTOCOL_VAULTS" (
    "current_timestamp" integer NOT NULL,
    "current_date" timestamp(6) without time zone,
    network_id smallint NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(100) COLLATE pg_catalog."default",
    amount numeric(20, 8),
    share numeric(20, 8),
    last3d_apy numeric(20, 8),
    creation_date timestamp(6) without time zone,
    CONSTRAINT "PROTOCOL_VAULTS_pkey" PRIMARY KEY ("current_timestamp", network_id, name)
) TABLESPACE pg_default;

ALTER TABLE gro."PROTOCOL_VAULTS" OWNER to postgres;

-- TODO: PKs
CREATE TABLE IF NOT EXISTS gro."SYS_PROTOCOL_LOADS" (
    table_name character varying(256) NULL,
    last_timestamp integer NOT NULL,
    network_id smallint,
    update_date timestamp(6) without time zone
) TABLESPACE pg_default;

ALTER TABLE gro."SYS_PROTOCOL_LOADS" OWNER to postgres;

-- TODO: Send network by parameter
INSERT INTO gro."SYS_PROTOCOL_LOADS"(table_name, last_timestamp, network_id, update_date)
VALUES ('GRO_STATS', 1, 3, now()::timestamp);

INSERT INTO gro."SYS_PROTOCOL_LOADS"(table_name, last_timestamp, network_id, update_date)
VALUES ('PRICE_CHECK', 1, 3, now()::timestamp);

CREATE TABLE gro."PROTOCOL_PRICE_CHECK_GLOBAL" (
    block_number INTEGER NOT NULL,
    block_timestamp INTEGER NULL,
    block_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    safety_check_bound NUMERIC (20, 8) NULL,
    safety_check BOOLEAN NULL,
    creation_date TIMESTAMP (6) NULL,
    oracle_check_tolerance NUMERIC (20, 8) NULL,
    curve_check_tolerance NUMERIC (20, 8) NULL,
    CONSTRAINT "PROTOCOL_PRICE_CHECK_GLOBAL_pkey" PRIMARY KEY (block_number) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."PROTOCOL_PRICE_CHECK_GLOBAL" OWNER to postgres;

CREATE TABLE gro."PROTOCOL_PRICE_CHECK_DETAILED" (
    block_number INTEGER NOT NULL,
    block_timestamp INTEGER NULL,
    block_date TIMESTAMP (6) NULL,
    network_id SMALLINT NULL,
    stablecoin_pair_id SMALLINT NOT NULL,
    curve_price NUMERIC (20, 8) NULL,
    curve_cache_price NUMERIC (20, 8) NULL,
    curve_cache_diff NUMERIC (20, 8) NULL,
    curve_cache_check BOOLEAN NULL,
    chainlink_price NUMERIC (20, 8) NULL,
    curve_chainlink_diff NUMERIC (20, 8) NULL,
    curve_chainlink_check BOOLEAN NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "PROTOCOL_PRICE_CHECK_DETAILED_pkey" PRIMARY KEY (block_number, stablecoin_pair_id) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."PROTOCOL_PRICE_CHECK_DETAILED" OWNER to postgres;

CREATE TABLE gro."MD_STABLECOIN_PAIRS" (
    pair_id INTEGER NOT NULL,
    "name" CHARACTER VARYING (20) NULL,
    description CHARACTER VARYING (256) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "MD_STABLECOIN_PAIRS_pkey" PRIMARY KEY (pair_id) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."MD_STABLECOIN_PAIRS" OWNER to postgres;

INSERT INTO gro."MD_STABLECOIN_PAIRS"(pair_id, "name", "description", creation_date)
VALUES (0, 'undefined', 'Undefined', now()::timestamp);

INSERT INTO gro."MD_STABLECOIN_PAIRS"(pair_id, "name", "description", creation_date)
VALUES (1, 'dai_usdc', 'DAI - USDC', now()::timestamp);

INSERT INTO gro."MD_STABLECOIN_PAIRS"(pair_id, "name", "description", creation_date)
VALUES (2, 'dai_usdt', 'DAI - USDT', now()::timestamp);

INSERT INTO gro."MD_STABLECOIN_PAIRS"(pair_id, "name", "description", creation_date)
VALUES (3, 'usdt_usdc', 'USDT - USDC', now()::timestamp);

