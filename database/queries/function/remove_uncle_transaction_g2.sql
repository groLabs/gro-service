CREATE OR REPLACE FUNCTION g2.delete_uncle_data()
  RETURNS trigger AS
$$
BEGIN
         delete from g2."EV_GRO_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_AIRDROP_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_APPROVALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_GRO_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_GRO_EMERGENCY_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_GRO_PNL_EXECUTION" where transaction_id=NEW.transaction_id;
         delete from g2."EV_GRO_STRATEGY_HARVEST" where transaction_id=NEW.transaction_id;
         delete from g2."EV_GRO_STRATEGY_UPDATE_RATIO" where transaction_id=NEW.transaction_id;
         delete from g2."EV_GRO_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_HODLER_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_AH_POSITIONS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_AH_POSITION_ADJUSTED" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_AH_POSITION_CLOSED" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_AH_POSITION_OPENED" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_DROPS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_NEW_RELEASE_FACTOR" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_STRATEGY_HARVEST" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_VAULT_HARVEST" where transaction_id=NEW.transaction_id;
         delete from g2."EV_LAB_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_POOL_BAL_LIQUIDITY" where transaction_id=NEW.transaction_id;
         delete from g2."EV_POOL_BAL_SWAP" where transaction_id=NEW.transaction_id;
         delete from g2."EV_POOL_META_LIQUIDITY" where transaction_id=NEW.transaction_id;
         delete from g2."EV_POOL_META_SWAP" where transaction_id=NEW.transaction_id;
         delete from g2."EV_POOL_UNI_LIQUIDITY" where transaction_id=NEW.transaction_id;
         delete from g2."EV_POOL_UNI_SWAP" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_ADD_POOL" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_GRO_PER_BLOCK" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_MAX_GRO_PER_BLOCK" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_SET_POOL" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_UPDATE_POOL" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_USERS_MIGRATED" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STAKER_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_STRATEGY_REPORTED" where transaction_id=NEW.transaction_id;
         delete from g2."EV_TRANSFERS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_VESTING_EXITS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_VESTING_EXTENSIONS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_VESTING_MAX_LOCK_PERIOD" where transaction_id=NEW.transaction_id;
         delete from g2."EV_VESTING_VESTS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_TRANSACTIONS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_ROUTER_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_ROUTER_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_TRANCHE_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_TRANCHE_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_TRANCHE_BALANCES" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_NEW_PNL" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_VAULT_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_VAULT_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_VAULT_RELEASE_FACTOR" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_VAULT_STRATEGY_QUEUE" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_VAULT_STRATEGY_HARVEST" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_VAULT_STRATEGY_CHANGES" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_VAULT_STRATEGY_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_CONVEX_STRATEGY_HARVEST" where transaction_id=NEW.transaction_id;
         delete from g2."EV_G2_PNL_FIXED_RATED_DISTRIBUTION" where transaction_id=NEW.transaction_id;
    RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER remove_uncle_transaction
    AFTER UPDATE ON g2."EV_TRANSACTIONS"
    FOR EACH ROW
    WHEN (NEW.uncle_block = true)
    EXECUTE PROCEDURE g2.delete_uncle_data();
