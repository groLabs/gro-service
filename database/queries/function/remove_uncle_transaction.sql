CREATE OR REPLACE FUNCTION gro.delete_uncle_data()
  RETURNS trigger AS
$$
BEGIN
         delete from gro."EV_GRO_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_AIRDROP_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_APPROVALS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_GRO_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_GRO_EMERGENCY_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_GRO_PNL_EXECUTION" where transaction_id=NEW.transaction_id;
         delete from gro."EV_GRO_STRATEGY_HARVEST" where transaction_id=NEW.transaction_id;
         delete from gro."EV_GRO_STRATEGY_UPDATE_RATIO" where transaction_id=NEW.transaction_id;
         delete from gro."EV_GRO_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_HODLER_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_AH_POSITIONS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_AH_POSITION_ADJUSTED" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_AH_POSITION_CLOSED" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_AH_POSITION_OPENED" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_DROPS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_NEW_RELEASE_FACTOR" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_STRATEGY_HARVEST" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_VAULT_HARVEST" where transaction_id=NEW.transaction_id;
         delete from gro."EV_LAB_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_POOL_BAL_LIQUIDITY" where transaction_id=NEW.transaction_id;
         delete from gro."EV_POOL_BAL_SWAP" where transaction_id=NEW.transaction_id;
         delete from gro."EV_POOL_META_LIQUIDITY" where transaction_id=NEW.transaction_id;
         delete from gro."EV_POOL_META_SWAP" where transaction_id=NEW.transaction_id;
         delete from gro."EV_POOL_UNI_LIQUIDITY" where transaction_id=NEW.transaction_id;
         delete from gro."EV_POOL_UNI_SWAP" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_ADD_POOL" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_CLAIMS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_DEPOSITS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_GRO_PER_BLOCK" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_MAX_GRO_PER_BLOCK" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_SET_POOL" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_UPDATE_POOL" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_USERS_MIGRATED" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STAKER_WITHDRAWALS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_STRATEGY_REPORTED" where transaction_id=NEW.transaction_id;
         delete from gro."EV_TRANSFERS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_VESTING_EXITS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_VESTING_EXTENSIONS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_VESTING_MAX_LOCK_PERIOD" where transaction_id=NEW.transaction_id;
         delete from gro."EV_VESTING_VESTS" where transaction_id=NEW.transaction_id;
         delete from gro."EV_TRANSACTIONS" where transaction_id=NEW.transaction_id;
    RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER remove_uncle_transaction
    AFTER UPDATE ON gro."EV_TRANSACTIONS"
    FOR EACH ROW
    WHEN (NEW.uncle_block = true)
    EXECUTE PROCEDURE gro.delete_uncle_data();
