/*
This query is currently replaced by:
- insert_user_std_fact_balances_pooled.sql
- insert_user_std_fact_balances_staked.sql
- insert_user_std_fact_balances_unstaked.sql
*/
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