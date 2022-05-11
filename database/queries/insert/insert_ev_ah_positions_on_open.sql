INSERT INTO gro."EV_LAB_AH_POSITIONS" (
        "position_id",
        "transaction_id",
        "block_number",
        "contract_address",
        "want_open",
        "want_close"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_AH_POSITIONS_pkey" DO NOTHING;