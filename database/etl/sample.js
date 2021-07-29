const sample = {
    "pricing": {
        "curve": {
            "dai_usdc": "1.0005920",
            "dai_usdt": "1.0004950",
            "usdt_usdc": "1.0000969"
        },
        "gro_cache": {
            "dai_usdc": "1.0006620",
            "dai_usdt": "1.0005660",
            "usdt_usdc": "1.0000959"
        },
        "chainlink": {
            "dai_usdc": "1.0013248",
            "dai_usdt": "1.0012870",
            "usdt_usdc": "1.0000377"
        },
        "curve_cache_diff": {
            "dai_usdc": "0",
            "dai_usdt": "0",
            "usdt_usdc": "0"
        },
        "curve_chainlink_diff": {
            "dai_usdc": "7",
            "dai_usdt": "6",
            "usdt_usdc": "0"
        },
        "curve_cache_check": {
            "dai_usdc": true,
            "dai_usdt": true,
            "usdt_usdc": true
        },
        "curve_chainlink_check": {
            "dai_usdc": true,
            "dai_usdt": true,
            "usdt_usdc": true
        },
        "safety_check_bound": "24",
        "safety_check": true,
        "block_number": "12907685"
    }
};

module.exports = {
    sample
}
