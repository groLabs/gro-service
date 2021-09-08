DELETE FROM gro."LBP_BALANCER_V1"
WHERE "lbp_timestamp" >= $1
AND "lbp_timestamp" <= $2;