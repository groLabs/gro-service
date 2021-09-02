SELECT "spot_price" as "price_1h"
FROM gro."LBP_PRICE"
WHERE "price_timestamp" < ($1 - 3600)
ORDER BY "price_timestamp" DESC
LIMIT 1;