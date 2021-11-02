INSERT INTO gro."USER_STD_FACT_BALANCES_UNSTAKED" (
        "balance_date",
        "network_id",
        "user_address",
        "gvt_amount",
        "pwrd_amount",
        "gro_amount",
        "creation_date"
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
    );