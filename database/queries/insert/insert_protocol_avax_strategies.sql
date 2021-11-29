INSERT INTO gro."PROTOCOL_AVAX_STRATEGIES" (
        "current_timestamp",
        "current_date",
        "network_id",
        "vault_name",
        "strategy_name",
        "display_name",
        "address",
        "amount",
        "share",
        "last3d_apy",
        "all_time_apy",
        "sharpe_ratio",
        "sortino_ratio",
        "romad_ratio" ,
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
        $11,
        $12,
        $13,
        $14,
        $15
    );