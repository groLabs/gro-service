INSERT INTO gro."PROTOCOL_STRATEGIES" (
        "launch_timestamp",
        "launch_date",
        "network_id",
        "vault_name",
        "strategy_name",
        "display_name",
        "address",
        "amount",
        "share",
        "last3d_apy",
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
        $8,
        $9,
        $10,
        $11
    );