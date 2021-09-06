CREATE TABLE gro."LBP_PRICE" (
    price_date TIMESTAMP (6) NOT NULL,
    price_timestamp INTEGER NOT NULL,
    block_number INTEGER NOT NULL,
    network_id SMALLINT NOT NULL,
    spot_price NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
    --CONSTRAINT "LBP_PRICE_pkey" PRIMARY KEY (price_timestamp, network_id) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."LBP_PRICE" OWNER to postgres;

CREATE TABLE gro."LBP_TRADES_AGGR" (
    last_trade_date TIMESTAMP (6) NULL,
    last_trade_timestamp INTEGER NOT NULL,
    last_block_number INTEGER NOT NULL,
    network_id SMALLINT NOT NULL,
    usdc_amount_in NUMERIC (20, 8) NULL,
    gro_amount_out NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."LBP_TRADES_AGGR" OWNER to postgres;

CREATE TABLE gro."LBP_TRADES_USER" (
    trade_date TIMESTAMP (6) NULL,
    trade_timestamp INTEGER NOT NULL,
    block_number INTEGER NOT NULL,
    network_id SMALLINT NOT NULL,
    tx_hash CHARACTER VARYING (66) NOT NULL,
    tx_type CHARACTER VARYING (50) NOT NULL,
    user_address CHARACTER VARYING (42) NULL,
    token_addr_in CHARACTER VARYING (42) NULL,
    token_amount_in CHARACTER VARYING (50) NULL,
    token_addr_out CHARACTER VARYING (42) NULL,
    token_amount_out CHARACTER VARYING (50) NULL,
    parsed_target_amount NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."LBP_TRADES_USER" OWNER to postgres;

CREATE TABLE gro."SYS_LBP_LOADS" (
    table_name CHARACTER VARYING (50) NOT NULL,
    network_id SMALLINT NULL,
    last_date TIMESTAMP (6) NULL,
    last_timestamp INTEGER NOT NULL,
    last_block INTEGER NOT NULL,
    records_loaded INTEGER NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."SYS_LBP_LOADS" OWNER to postgres;