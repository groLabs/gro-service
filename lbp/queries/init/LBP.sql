CREATE TABLE gro."LBP_BALANCER_V1" (
    lbp_date TIMESTAMP (6) NOT NULL,
    lbp_timestamp INTEGER NOT NULL,
    lbp_block_number INTEGER NOT NULL,
    network_id SMALLINT NOT NULL,
    spot_price NUMERIC (20, 8) NULL,
    current_balance NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."LBP_BALANCER_V1" OWNER to postgres;

-- CREATE TABLE gro."SYS_LBP_LOADS" (
--     table_name CHARACTER VARYING (50) NOT NULL,
--     network_id SMALLINT NULL,
--     last_date TIMESTAMP (6) NULL,
--     last_timestamp INTEGER NOT NULL,
--     last_block INTEGER NOT NULL,
--     records_loaded INTEGER NULL,
--     creation_date TIMESTAMP (6) NULL
-- ) WITH (OIDS = FALSE);

-- ALTER TABLE gro."SYS_LBP_LOADS" OWNER to postgres;