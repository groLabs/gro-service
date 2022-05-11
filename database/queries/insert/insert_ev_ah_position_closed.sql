INSERT INTO gro."EV_LAB_AH_POSITION_CLOSED" (
    "position_id",
    "block_number",
    "contract_address",
    "log_name",
    "amount",
    "want_received"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_AH_POSITION_CLOSED_pkey" DO NOTHING;