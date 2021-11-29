INSERT INTO gro."PROTOCOL_AVAX_TVL" (
        "current_timestamp",
        "current_date",
        "network_id",
        "labs_dai_vault",
        "labs_usdc_vault",
        "labs_usdt_vault",
        "total",
        "creation_date"
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
    );