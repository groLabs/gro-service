CREATE TABLE gro."MD_TOKENS" (
    "token_id" SMALLINT NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT "MD_TOKENS_pkey" PRIMARY KEY ("token_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_TOKENS" OWNER to postgres;

CREATE TABLE gro."MD_TRANSFERS" (
    "transfer_id" INTEGER NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT "MD_TRANSFERS_pkey" PRIMARY KEY ("transfer_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_TRANSFERS" OWNER to postgres;

CREATE TABLE gro."TOKEN_PRICE" (
   "price_date" TIMESTAMP (6) NOT NULL,
   "gvt_value" NUMERIC (20, 8) NULL,
   "pwrd_value" NUMERIC (20, 8) NULL,
   "gro_value" NUMERIC (20, 8) NULL,
   "weth_value" NUMERIC (20, 8) NULL,
   "avax_value" NUMERIC (20, 8) NULL,
   "bal_value" NUMERIC (20, 8) NULL,
   "usdc_e_1_0_value" NUMERIC (20, 8) NULL,
   "usdt_e_1_0_value" NUMERIC (20, 8) NULL,
   "dai_e_1_0_value" NUMERIC (20, 8) NULL,
   "usdc_e_1_5_value" NUMERIC (20, 8) NULL,
   "usdt_e_1_5_value" NUMERIC (20, 8) NULL,
   "dai_e_1_5_value" NUMERIC (20, 8) NULL,
   "usdc_e_1_6_value" NUMERIC (20, 8) NULL,
   "usdt_e_1_6_value" NUMERIC (20, 8) NULL,
   "dai_e_1_6_value" NUMERIC (20, 8) NULL,
   "creation_date" TIMESTAMP (6) NULL,
   CONSTRAINT "TOKEN_PRICE_pkey" PRIMARY KEY ("price_date")
      NOT DEFERRABLE INITIALLY IMMEDIATE
) TABLESPACE pg_default;

ALTER TABLE gro."TOKEN_PRICE" OWNER to postgres;