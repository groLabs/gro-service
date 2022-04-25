INSERT INTO gro."CORE_PRICE" (
   "log_index",
   "transaction_id",
   "contract_address",
   "log_name",
   "token1_id",
   "token2_id",
   "price",
   "round_id",
   "updated_at"
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
        $9
    ) ON CONFLICT ON CONSTRAINT "CORE_PRICE_pkey" DO NOTHING;