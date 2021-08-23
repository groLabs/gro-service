-- INSERT INTO gro."USER_BALANCES" (
INSERT INTO gro."USER_STD_FACT_BALANCES" (
        "balance_date",
        "network_id",
        "user_address",
        "usd_value",
        "gvt_value",
        "pwrd_value",
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