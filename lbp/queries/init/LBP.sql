CREATE TABLE gro."LBP_BALANCER_HOST1" (
    lbp_date TIMESTAMP (6) NOT NULL,
    lbp_timestamp INTEGER NOT NULL,
    lbp_block_number INTEGER NOT NULL,
    network_id SMALLINT NOT NULL,
    spot_price NUMERIC (20, 8) NULL,
    current_balance NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."LBP_BALANCER_HOST1" OWNER to postgres;

CREATE TABLE gro."LBP_BALANCER_HOST2" (
    lbp_date TIMESTAMP (6) NOT NULL,
    lbp_timestamp INTEGER NOT NULL,
    lbp_block_number INTEGER NOT NULL,
    network_id SMALLINT NOT NULL,
    spot_price NUMERIC (20, 8) NULL,
    current_balance NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL
) WITH (OIDS = FALSE);

ALTER TABLE gro."LBP_BALANCER_HOST2" OWNER to postgres;