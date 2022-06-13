INSERT INTO gro."EV_LAB_AH_POSITION_ADJUSTED" (
        "position_id",
        "transaction_hash",
        "block_number",
        "contract_address",
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
        $8
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_AH_POSITION_ADJUSTED_pkey" DO NOTHING;