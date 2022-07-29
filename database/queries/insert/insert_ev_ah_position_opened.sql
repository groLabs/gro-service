INSERT INTO gro."EV_LAB_AH_POSITION_OPENED" (
        "transaction_id",
        "log_index",
        "contract_address",
        "position_id",
        "block_number",
        "log_name",
        "amount",
        "collateral_size"
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
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_AH_POSITION_OPENED_pkey" DO NOTHING;