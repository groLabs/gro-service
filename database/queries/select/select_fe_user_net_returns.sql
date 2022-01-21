SELECT nr."pwrd_unstaked_value" as "pwrd",
    nr."gvt_unstaked_value" as "gvt",
    nr."usdc_e_1_0_value" as "usdc_e_1_0_value",
    nr."usdt_e_1_0_value" as "usdt_e_1_0_value",
    nr."dai_e_1_0_value" as "dai_e_1_0_value",
    nr."usdc_e_1_5_value" as "usdc_e_1_5_value",
    nr."usdt_e_1_5_value" as "usdt_e_1_5_value",
    nr."dai_e_1_5_value" as "dai_e_1_5_value",
    nr."usdc_e_1_6_value" as "usdc_e_1_6_value",
    nr."usdt_e_1_6_value" as "usdt_e_1_6_value",
    nr."dai_e_1_6_value" as "dai_e_1_6_value",
    nr."usdc_e_1_7_value" as "usdc_e_1_7_value",
    nr."usdt_e_1_7_value" as "usdt_e_1_7_value",
    nr."dai_e_1_7_value" as "dai_e_1_7_value"
FROM gro."USER_NET_RETURNS_CACHE" nr
WHERE nr.user_address = $1;