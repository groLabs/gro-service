SELECT nr."pwrd_unstaked_value" as "pwrd",
    nr."gvt_unstaked_value" as "gvt",
    nr."usdc_e_value" as "usdc_e",
    nr."usdt_e_value" as "usdt_e",
    nr."dai_e_value" as "dai_e"
FROM gro."USER_NET_RETURNS_CACHE" nr
WHERE nr.user_address = $1;