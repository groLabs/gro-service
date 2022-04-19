CREATE TABLE gro."CORE_PRICE" (
    "log_index" INTEGER NOT NULL,
    "transaction_id" CHARACTER VARYING (66) NOT NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "log_name" CHARACTER VARYING (255) NULL,
    "token1_id" SMALLINT NULL,
    "token2_id" SMALLINT NULL,
    "price" NUMERIC (20, 8) NULL,
    "address" CHARACTER VARYING (42) NULL,
    "round_id" INTEGER NULL,
    "updated_at" INTEGER NULL,
    "creation_date" TIMESTAMP (6) DEFAULT NOW(),
    CONSTRAINT "CORE_PRICE_pkey" PRIMARY KEY (
        "log_index",
        "transaction_id",
        "contract_address"
    ) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."CORE_PRICE" OWNER to postgres;