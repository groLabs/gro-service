DELETE FROM gro."LBP_BALANCER_HOST1"
WHERE "lbp_timestamp" >= $1
AND "lbp_timestamp" <= $2;