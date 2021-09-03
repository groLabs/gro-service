SELECT sum("token_amount_out") as gro_amount
FROM gro."LBP_TRADES"
WHERE "tx_type" = 'swap_in';