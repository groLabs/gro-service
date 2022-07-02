INSERT INTO gro."EV_STAKER_UPDATE_POOL" (
        "transaction_id",
        "log_index",
        "contract_address",
        "block_timestamp",
        "log_name",
        "pid",
        "last_reward_block",
        "lp_supply",
        "acc_gro_per_share"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
    ) ON CONFLICT ON CONSTRAINT "EV_STAKER_UPDATE_POOL_pkey" DO NOTHING;