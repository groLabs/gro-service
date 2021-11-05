DELETE FROM gro."TOKEN_PRICE"
WHERE date(price_date) >= $1
AND date(price_date) <= $2;