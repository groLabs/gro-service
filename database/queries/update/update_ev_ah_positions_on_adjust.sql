UPDATE gro."EV_LAB_AH_POSITIONS"
SET "want_open" = "want_open" + $2
WHERE "position_id" = $1;