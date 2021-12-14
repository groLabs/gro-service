CREATE TABLE gro."AIRDROP4" (
    a4_block INTEGER NOT NULL,
    a4_date TIMESTAMP (6) NOT NULL,
    a4_timestamp INTEGER NOT NULL,
    network_id INTEGER NOT NULL,
    user_address CHARACTER VARYING (42) NOT NULL,
    staked_gro NUMERIC (20, 8) NULL,
    staked_gro_gvt NUMERIC (20, 8) NULL,
    staked_gro_usdc NUMERIC (20, 8) NULL,
    staked_gvt NUMERIC (20, 8) NULL,
    staked_pwrd NUMERIC (20, 8) NULL,
    staked_gro_weth NUMERIC (20, 8) NULL,
    unstaked_gro NUMERIC (20, 8) NULL,
    unstaked_gro_gvt NUMERIC (20, 8) NULL,
    unstaked_gro_usdc NUMERIC (20, 8) NULL,
    unstaked_gvt NUMERIC (20, 8) NULL,
    unstaked_pwrd NUMERIC (20, 8) NULL,
    unstaked_pwrd_pool NUMERIC (20, 8) NULL,
    unstaked_gro_weth NUMERIC (20, 8) NULL,
    creation_date TIMESTAMP (6) NULL,
    CONSTRAINT "AIRDROP4_pkey" PRIMARY KEY (network_id, user_address) NOT DEFERRABLE INITIALLY IMMEDIATE
) TABLESPACE pg_default;

ALTER TABLE gro."AIRDROP4" OWNER to postgres;