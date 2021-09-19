SELECT B."spot_price" as "price_1h"
FROM gro."LBP_BALANCER_HOST1" B,
    (
        SELECT DISTINCT(MAX("lbp_timestamp")) as "max_timestamp"
        FROM gro."LBP_BALANCER_HOST1"
    ) MT
WHERE B."lbp_timestamp" < (MT."max_timestamp" - 3600)
ORDER BY B."lbp_timestamp" DESC
LIMIT 1;