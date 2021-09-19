DELETE FROM gro."LBP_BALANCER_HOST2"
WHERE "lbp_timestamp" >= $1
AND "lbp_timestamp" <= $2;