UPDATE gro."EV_LAB_AH_POSITIONS"
SET "want_close" = $2
WHERE "position_id" = $1;