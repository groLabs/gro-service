SELECT "log_index",
    "transaction_id",
    "contract_address",
    "log_name",
    "from",
    "referral",
    "pid",
    "token_id",
    "allowance",
    "amount1",
    "amount2",
    "amount3",
    "value",
    "creation_date"
FROM gro."EV_DEPOSITS"
WHERE "from" = $1