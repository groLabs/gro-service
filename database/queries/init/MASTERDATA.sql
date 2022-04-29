/****************************************************
                    MD_TOKENS 
 ****************************************************/

CREATE TABLE gro."MD_TOKENS" (
    "token_id" SMALLINT NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE  DEFAULT NOW(),
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    CONSTRAINT "MD_TOKENS_pkey" PRIMARY KEY ("token_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_TOKENS" OWNER to postgres;

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (0, 'unknown', 'Unknown token', '0x0000000000000000000000000000000000000000');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (1, 'pwrd', 'Rebasing stablecoin, native token of Gro protocol', '0xF0a93d4994B3d98Fb5e3A2F90dBc2d69073Cb86b');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (2, 'gvt', 'Non-rebasing token, native token of Gro protocol', '0x3ADb04E127b9C0a5D36094125669d4603AC52a0c');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (3, 'gro', 'Gro DAO Token', '0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (4, 'groUSDC.e_vault v1.0', 'Gro USDC.e Leveraged Yield v1.0', '0x57DaED1ee021BE9991F5d30CF494b6B09B5B449E');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (5, 'groUSDT.e_vault v1.0', 'Gro USDT.e Leveraged Yield v1.0', '0x471F4B4b9A97F82C3a25b034B33A8E306eE9Beb5');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (6, 'groDAI.e_vault v1.0', 'Gro DAI.e Leveraged Yield v1.0', '0x5E57E11483A3F60A76af3045303604522059dA2a');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (7, 'usdc', 'USD Coin', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (8, 'usdt', 'USD Tether', '0xdAC17F958D2ee523a2206206994597C13D831ec7');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (9, 'dai', 'DAI', '0x6B175474E89094C44Da98b954EedeAC495271d0F');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (10, 'usd', 'USD', '0x0000000000000000000000000000000000000000');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (11, 'usdc.e', 'USDC.e', '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (12, 'usdt.e', 'USDT.e', '0xc7198437980c041c805A1EDcbA50c1Ce5db95118');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (13, 'dai.e', 'DAI.e', '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (14, 'groUSDC.e_vault v1.8', 'Gro USDC.e Leveraged Yield v1.8', '0x2Eb05cfFA24309b9aaf300392A4D8Db745d4E592');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (15, 'groUSDT.e_vault v1.8', 'Gro USDT.e Leveraged Yield v1.8', '0x6EF44077a1F5e10cDfcCc30EFb7dCdb1d5475581');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (16, 'groDAI.e_vault v1.8', 'Gro DAI.e Leveraged Yield v1.8', '0x6063597B9356B246E706Fd6A48C780F897e3ef55');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (17, 'groUSDC.e_vault v1.9 internal ', 'Gro USDC.e Leveraged Yield v1.9 Internal', '0x6FfF1e1140034897f5b370b931Fbd7e4970FE130');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (18, 'groUSDT.e_vault v1.9 internal', 'Gro USDT.e Leveraged Yield v1.9 Internal', '0xcc20CE15425A89614bD7a3B539a3c966FA7fFBC2');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (19, 'groDAI.e_vault v1.9 internal', 'Gro DAI.e Leveraged Yield v1.9 Internal', '0x7b2f293B2164c70834C134Dc6bA61e6B6119f0b5');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (20, 'avax', 'Avalanche', '0x0000000000000000000000000000000000000000');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (21, 'wavax', 'Wrapped Avax', '0x0000000000000000000000000000000000000000');

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
