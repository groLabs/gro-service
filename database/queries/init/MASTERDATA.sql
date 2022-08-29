/****************************************************
                    MD_POOLS 
 ****************************************************/

CREATE TABLE gro."MD_POOLS" (
    "pool_id" SMALLINT NOT NULL,
    "token_ids" INTEGER [] NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "MD_POOLS_pkey" PRIMARY KEY ("pool_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_POOLS" OWNER to postgres;

INSERT INTO gro."MD_POOLS"("pool_id", "token_ids", "contract_address", "name", "description")
VALUES (0, '{3}', '0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7', 'single_staking_100_gro_0', 'Single-sided Gro');

INSERT INTO gro."MD_POOLS"("pool_id", "token_ids", "contract_address", "name", "description")
VALUES (1, '{3,2}', '0x2ac5bC9ddA37601EDb1A5E29699dEB0A5b67E9bB', 'uniswap_v2_5050_gro_gvt_1', 'Uniswap v2 GRO / Vault');

INSERT INTO gro."MD_POOLS"("pool_id", "token_ids", "contract_address", "name", "description")
VALUES (2, '{3,7}', '0x21C5918CcB42d20A2368bdCA8feDA0399EbfD2f6', 'uniswap_v2_5050_gro_usdc_2', 'Uniswap v2 GRO / USDC');

INSERT INTO gro."MD_POOLS"("pool_id", "token_ids", "contract_address", "name", "description")
VALUES (3, '{2}', '0x3ADb04E127b9C0a5D36094125669d4603AC52a0c', 'single_staking_100_gvt_3', 'Single-sided Vault');

INSERT INTO gro."MD_POOLS"("pool_id", "token_ids", "contract_address", "name", "description")
VALUES (4, '{1,7,8,9}', '0xbcb91E689114B9Cc865AD7871845C95241Df4105', 'curve_meta_pwrd_3crv_4', 'Curve Meta PWRD-3CRV');

INSERT INTO gro."MD_POOLS"("pool_id", "token_ids", "contract_address", "name", "description")
VALUES (5, '{3,22}', '0x702605F43471183158938C1a3e5f5A359d7b31ba', 'balancer_v2_8020_gro_weth_5', 'Balancer V2 GRO / WETH');

INSERT INTO gro."MD_POOLS"("pool_id", "token_ids", "contract_address", "name", "description")
VALUES (6, '{1}', '0xF0a93d4994B3d98Fb5e3A2F90dBc2d69073Cb86b', 'single_staking_100_pwrd_6', 'Single-sided PWRD');

/****************************************************
                    MD_TOKENS 
 ****************************************************/

CREATE TABLE gro."MD_TOKENS" (
    "token_id" SMALLINT NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
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
VALUES (21, 'wavax', 'Wrapped Avax', '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (22, 'weth', 'Wrapped Ether', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (23, 'balancer_gro_weth', 'Balancer 80 GRO 20 WETH LP', '0x702605F43471183158938C1a3e5f5A359d7b31ba');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (24, 'uniswap_gvt_gro', 'Uniswap GVT/GRO LP', '0x2ac5bC9ddA37601EDb1A5E29699dEB0A5b67E9bB');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (25, 'uniswap_gro_usdc', 'Uniswap GRO/USDC LP', '0x21C5918CcB42d20A2368bdCA8feDA0399EbfD2f6');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (26, 'curve_pwrd3crv', 'Curve.fi DAI/USDC/USDT LP', '0xbcb91E689114B9Cc865AD7871845C95241Df4105');

INSERT INTO gro."MD_TOKENS"("token_id", "name", "description", "contract_address")
VALUES (27, 'curve_3crv', 'Curve.fi DAI/USDC/USDT (3Crv)', '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490');

/****************************************************
                    MD_TRANSFERS 
 ****************************************************/

--Perhaps not needed
CREATE TABLE gro."MD_TRANSFERS" (
    "transfer_id" INTEGER NOT NULL,
    "name" CHARACTER VARYING (255) NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "MD_TRANSFERS_pkey" PRIMARY KEY ("transfer_id")
) TABLESPACE pg_default;

ALTER TABLE gro."MD_TRANSFERS" OWNER to postgres;

/****************************************************
                    MD_FEATURES 
 ****************************************************/

CREATE TABLE gro."MD_FEATURES" (
    "feature_id" SMALLINT NOT NULL,
    "description" CHARACTER VARYING (255) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
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


/****************************************************
                    MD_VAULT_ADAPTERS
 ****************************************************/

CREATE TABLE gro."MD_VAULT_ADAPTERS" (
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "token_id" INTEGER NULL,
   "active" BOOLEAN NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
   CONSTRAINT fk_token_id FOREIGN KEY ("token_id")
      REFERENCES gro."MD_TOKENS" ("token_id")
         MATCH SIMPLE
         ON DELETE NO ACTION
         ON UPDATE NO ACTION
      NOT DEFERRABLE INITIALLY IMMEDIATE,
   CONSTRAINT "MD_VAULT_ADAPTERS_pkey" PRIMARY KEY ("contract_address")
      NOT DEFERRABLE INITIALLY IMMEDIATE
) TABLESPACE pg_default;

ALTER TABLE gro."MD_VAULT_ADAPTERS" OWNER to postgres;

INSERT INTO gro."MD_VAULT_ADAPTERS"("contract_address", "token_id", "active", "creation_date")
VALUES ('0x9B2688DA7d80641F6E46A76889EA7F8B59771724', 7, true, now()::timestamp);

INSERT INTO gro."MD_VAULT_ADAPTERS"("contract_address", "token_id", "active", "creation_date")
VALUES ('0x6419Cb544878E8C4faA5EaF22D59d4A96E5F12FA', 8, true, now()::timestamp);

INSERT INTO gro."MD_VAULT_ADAPTERS"("contract_address", "token_id", "active", "creation_date")
VALUES ('0x277947D84A2Ec370a636683799351acef97fec60', 9, true, now()::timestamp);


/****************************************************
                    MD_VAULTS 
 ****************************************************/

CREATE TABLE gro."MD_VAULTS" (
    "contract_address" CHARACTER VARYING (42) NOT NULL,
    "vault_adapter" CHARACTER VARYING (42) NULL,
    "creation_date" TIMESTAMP (6) WITHOUT TIME ZONE DEFAULT NOW(),
   CONSTRAINT "MD_VAULTS_pkey" PRIMARY KEY ("contract_address")
      NOT DEFERRABLE INITIALLY IMMEDIATE,
   CONSTRAINT fk_vault_adapter FOREIGN KEY
      (vault_adapter)
      REFERENCES gro."MD_VAULT_ADAPTERS" ("contract_address")
         MATCH SIMPLE
         ON DELETE NO ACTION
         ON UPDATE NO ACTION
      NOT DEFERRABLE INITIALLY IMMEDIATE
) TABLESPACE pg_default;

ALTER TABLE gro."MD_VAULTS" OWNER to postgres;

INSERT INTO gro."MD_VAULTS"("contract_address", "vault_adapter", "creation_date")
VALUES ('0x6a01bC748d71489372BD8fB743b23F63d99aac85', '0x277947D84A2Ec370a636683799351acef97fec60', now()::timestamp);

INSERT INTO gro."MD_VAULTS"("contract_address", "vault_adapter", "creation_date")
VALUES ('0x03b298D27b0426758cb70c4ADd6523927bD7cC8e', '0x9B2688DA7d80641F6E46A76889EA7F8B59771724', now()::timestamp);

INSERT INTO gro."MD_VAULTS"("contract_address", "vault_adapter", "creation_date")
VALUES ('0x9CD696A225d7a3c9Ce1ed71f5bDB031234a86D79', '0x6419Cb544878E8C4faA5EaF22D59d4A96E5F12FA', now()::timestamp);


/****************************************************
                    MD_STRATEGIES
 ****************************************************/

CREATE TABLE gro."MD_STRATEGIES" (
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "vault" CHARACTER VARYING (42) NULL,
   "active" BOOLEAN NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT fk_vault FOREIGN KEY ("vault")
      REFERENCES gro."MD_VAULTS" ("contract_address")
         MATCH SIMPLE
         ON DELETE NO ACTION
         ON UPDATE NO ACTION
      NOT DEFERRABLE INITIALLY IMMEDIATE,
   CONSTRAINT "MD_STRATEGIES_pkey" PRIMARY KEY (contract_address)
      NOT DEFERRABLE INITIALLY IMMEDIATE
) TABLESPACE pg_default;

ALTER TABLE gro."MD_STRATEGIES" OWNER to postgres;

INSERT INTO gro."MD_STRATEGIES"("contract_address", "vault", "active", "creation_date")
VALUES ('0x4d5b5376Cbcc001bb4F8930208828Ab87D121dA8', '0x6a01bC748d71489372BD8fB743b23F63d99aac85', true, now()::timestamp);

INSERT INTO gro."MD_STRATEGIES"("contract_address", "vault", "active", "creation_date")
VALUES ('0x8b335D3E266389Ae08A2F22b01D33813d40ED8Fd', '0x03b298D27b0426758cb70c4ADd6523927bD7cC8e', true, now()::timestamp);

INSERT INTO gro."MD_STRATEGIES"("contract_address", "vault", "active", "creation_date")
VALUES ('0xD370998b2E7941151E7BB9f6e337A12F337D0682', '0x03b298D27b0426758cb70c4ADd6523927bD7cC8e', true, now()::timestamp);

INSERT INTO gro."MD_STRATEGIES"("contract_address", "vault", "active", "creation_date")
VALUES ('0xDE5a25415C637b52d59Ef980b29a5fDa8dC3C70B', '0x9CD696A225d7a3c9Ce1ed71f5bDB031234a86D79', true, now()::timestamp);

INSERT INTO gro."MD_STRATEGIES"("contract_address", "vault", "active", "creation_date")
VALUES ('0xDea436e15B40E7B707A7002A749f416dFE5B383F', '0x6a01bC748d71489372BD8fB743b23F63d99aac85', true, now()::timestamp);

/****************************************************
                    MD_LABS
 ****************************************************/

CREATE TABLE gro."MD_LABS" (
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "token_id" INTEGER NULL,
   "active" BOOLEAN NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT fk_token_id FOREIGN KEY
      (token_id)
      REFERENCES gro."MD_TOKENS" ("token_id")
         MATCH SIMPLE
         ON DELETE NO ACTION
         ON UPDATE NO ACTION
      NOT DEFERRABLE INITIALLY IMMEDIATE,
   CONSTRAINT "MD_LABS_pkey" PRIMARY KEY ("contract_address")
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."MD_LABS" OWNER to postgres;

INSERT INTO gro."MD_LABS"("contract_address", "token_id", "active")
VALUES ('0x2Eb05cfFA24309b9aaf300392A4D8Db745d4E592', 11, true);

INSERT INTO gro."MD_LABS"("contract_address", "token_id", "active")
VALUES ('0x6FfF1e1140034897f5b370b931Fbd7e4970FE130', 11, true);

INSERT INTO gro."MD_LABS"("contract_address", "token_id", "active")
VALUES ('0x6EF44077a1F5e10cDfcCc30EFb7dCdb1d5475581', 12, true);

INSERT INTO gro."MD_LABS"("contract_address", "token_id", "active")
VALUES ('0xcc20CE15425A89614bD7a3B539a3c966FA7fFBC2', 12, true);

INSERT INTO gro."MD_LABS"("contract_address", "token_id", "active")
VALUES ('0x6063597B9356B246E706Fd6A48C780F897e3ef55', 13, true);

INSERT INTO gro."MD_LABS"("contract_address", "token_id", "active")
VALUES ('0x7b2f293B2164c70834C134Dc6bA61e6B6119f0b5', 13, true);

/****************************************************
                    MD_LAB_STRATEGIES
 ****************************************************/

CREATE TABLE gro."MD_LAB_STRATEGIES" (
   "contract_address" CHARACTER VARYING (42) NOT NULL,
   "lab" CHARACTER VARYING (42) NULL,
   "active" BOOLEAN NULL,
   "creation_date" TIMESTAMP (6) NULL DEFAULT now (),
   CONSTRAINT "MD_LAB_STRATEGIES_pkey" PRIMARY KEY ("contract_address")
      NOT DEFERRABLE INITIALLY IMMEDIATE,
   CONSTRAINT fk_lab FOREIGN KEY ("lab")
      REFERENCES gro."MD_LABS" ("contract_address")
         MATCH SIMPLE
         ON DELETE NO ACTION
         ON UPDATE NO ACTION
      NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS = FALSE);

ALTER TABLE gro."MD_LAB_STRATEGIES" OWNER to postgres;

INSERT INTO gro."MD_LAB_STRATEGIES"("contract_address", "lab", "active")
VALUES ('0x1A104793650684013c555d6ae07058f76E4679ef', '0x6EF44077a1F5e10cDfcCc30EFb7dCdb1d5475581', true);

INSERT INTO gro."MD_LAB_STRATEGIES"("contract_address", "lab", "active")
VALUES ('0x670EA3f675a332D561d5a9ECaa16c097Ac0b0ba5', '0x6063597B9356B246E706Fd6A48C780F897e3ef55', true);

INSERT INTO gro."MD_LAB_STRATEGIES"("contract_address", "lab", "active")
VALUES ('0x7053CdCfe9A6f8DB99768734939fCD6672470158', '0xcc20CE15425A89614bD7a3B539a3c966FA7fFBC2', true);

INSERT INTO gro."MD_LAB_STRATEGIES"("contract_address", "lab", "active")
VALUES ('0xa80ec1e57C5A37517a0F5912aCc7B30585EBff56', '0x2Eb05cfFA24309b9aaf300392A4D8Db745d4E592', true);

INSERT INTO gro."MD_LAB_STRATEGIES"("contract_address", "lab", "active")
VALUES ('0xCfd28f3afB79380eC6cD759F76eA0a5c5b56A9aC', '0x7b2f293B2164c70834C134Dc6bA61e6B6119f0b5', true);

INSERT INTO gro."MD_LAB_STRATEGIES"("contract_address", "lab", "active")
VALUES ('0xECBA3778357a7A448810D1D9a67025cD9BAf169A', '0x6FfF1e1140034897f5b370b931Fbd7e4970FE130', true);

