INSERT INTO gro."PROTOCOL_TVL" (
        "launch_timestamp",
        "launch_date",
        "network_id",
        "tvl_pwrd",
        "tvl_gvt",
        "tvl_total",
        "util_ratio",
        "util_ratio_limit_pwrd",
        "util_ratio_limit_gvt",
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
        $10
    );