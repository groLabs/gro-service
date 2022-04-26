/****************************************************
                    MD_TOKENS 
 ****************************************************/

CREATE TABLE gro."MD_TOKENS" (
    "token_id" SMALLINT NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE  DEFAULT NOW(),
    CONSTRAINT "MD_TOKENS_pkey" PRIMARY KEY ("token_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_TOKENS" OWNER to postgres;

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (0, 'unknown', 'Unknown token');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (1, 'pwrd', 'Rebasing stablecoin, native token of Gro protocol');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (2, 'gvt', 'Non-rebasing token, native token of Gro protocol');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (3, 'gro', 'Gro DAO Token');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (4, 'groUSDC.e_vault v1.0', 'Gro USDC.e Leveraged Yield v1.0');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (5, 'groUSDT.e_vault v1.0', 'Gro USDT.e Leveraged Yield v1.0');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (6, 'groDAI.e_vault v1.0', 'Gro DAI.e Leveraged Yield v1.0');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (7, 'usdc', 'USD Coin');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (8, 'usdt', 'USD Tether');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (9, 'dai', 'DAI');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (10, 'usd', 'USD');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (11, 'usdc.e', 'USDC.e');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (12, 'usdt.e', 'USDT.e');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (13, 'dai.e', 'DAI.e');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (14, 'groUSDC.e_vault v1.8', 'Gro USDC.e Leveraged Yield v1.8');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (15, 'groUSDT.e_vault v1.8', 'Gro USDT.e Leveraged Yield v1.8');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (16, 'groDAI.e_vault v1.8', 'Gro DAI.e Leveraged Yield v1.8');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (17, 'groUSDC.e_vault v1.9 internal ', 'Gro USDC.e Leveraged Yield v1.9 Internal');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (18, 'groUSDT.e_vault v1.9 internal', 'Gro USDT.e Leveraged Yield v1.9 Internal');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (19, 'groDAI.e_vault v1.9 internal', 'Gro DAI.e Leveraged Yield v1.9 Internal');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (20, 'avax', 'Avalanche');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description")
VALUES (21, 'wavax', 'Wrapped Avax');

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
