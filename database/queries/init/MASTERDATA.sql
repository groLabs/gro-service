/****************************************************
                    MD_TOKENS 
 ****************************************************/

CREATE TABLE gro."MD_TOKENS" (
    "token_id" SMALLINT NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT "MD_TOKENS_pkey" PRIMARY KEY ("token_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_TOKENS" OWNER to postgres;

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "creation_date")
VALUES (0, 'unknown', 'Unknown token', now()::timestamp);

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "creation_date")
VALUES (1, 'pwrd', 'Rebasing stablecoin, native token of Gro protocol', now()::timestamp);

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "creation_date")
VALUES (2, 'gvt', 'Non-rebasing token, native token of Gro protocol', now()::timestamp);

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "creation_date")
VALUES (3, 'gro', 'Gro DAO Token', now()::timestamp);

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "creation_date")
VALUES (4, 'groUSDC.e_vault', 'USDC.e Leveraged Yield', now()::timestamp);

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "creation_date")
VALUES (5, 'groUSDT.e_vault', 'USDT.e Leveraged Yield', now()::timestamp);

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "creation_date")
VALUES (6, 'groDAI.e_vault', 'DAI.e Leveraged Yield', now()::timestamp);

/****************************************************
                    MD_TRANSFERS 
 ****************************************************/

--Perhaps not needed
CREATE TABLE gro."MD_TRANSFERS" (
    "transfer_id" INTEGER NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT "MD_TRANSFERS_pkey" PRIMARY KEY ("transfer_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_TRANSFERS" OWNER to postgres;

/****************************************************
                    MD_FEATURES 
 ****************************************************/

CREATE TABLE gro."MD_FEATURES" (
    "feature_id" SMALLINT NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT "MD_FEATURES_pkey" PRIMARY KEY ("feature_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_FEATURES" OWNER to postgres;

INSERT INTO gro."MD_FEATURES"("feature_id", "description", "creation_date")
VALUES (1, 'PERSONAL_STATS', now()::timestamp);

INSERT INTO gro."MD_FEATURES"("feature_id", "description", "creation_date")
VALUES (2, 'VESTING_BONUS', now()::timestamp);


/****************************************************
                    MD_STATUS 
 ****************************************************/

CREATE TABLE gro."MD_STATUS" (
    "status_id" SMALLINT NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT "MD_STATUS_pkey" PRIMARY KEY ("status_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_STATUS" OWNER to postgres;

INSERT INTO gro."MD_STATUS"("status_id", "description", "creation_date")
VALUES (1, 'ACTIVE', now()::timestamp);

INSERT INTO gro."MD_STATUS"("status_id", "description", "creation_date")
VALUES (2, 'INACTIVE', now()::timestamp);
