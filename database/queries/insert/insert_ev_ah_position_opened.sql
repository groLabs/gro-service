INSERT INTO gro."EV_LAB_AH_POSITION_OPENED" (
    "position_id",
    "block_number",
    "contract_address",
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
        $6
    ) ON CONFLICT ON CONSTRAINT "EV_LAB_AH_POSITION_OPENED_pkey" DO NOTHING;