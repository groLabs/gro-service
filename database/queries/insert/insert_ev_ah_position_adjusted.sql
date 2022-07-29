INSERT INTO gro."EV_LAB_AH_POSITION_ADJUSTED" (
        "transaction_id",
        "log_index",
        "contract_address",
        "position_id",
        "block_number",
        "log_name",
        "amount",
        "collateral_size",
        "withdraw"
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
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_AH_POSITION_ADJUSTED_pkey" DO NOTHING;