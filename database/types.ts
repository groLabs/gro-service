enum GlobalNetwork {
    UNKNOWN = 0,
    ETHEREUM = 1,
    AVALANCHE = 2,
    ALL = 100,
}

enum LoadType {
    UNKNOWN = 0,
    TRANSFERS = 1,
    APPROVALS = 2,
    ALL = 100,
}

enum NetworkName {
    UNKNOWN = 'unknown',
    MAINNET = 'mainnet',
    ROPSTEN = 'ropsten',
    RINKEBY = 'rinkeby',
    GOERLI = 'goerli',
    KOVAN = 'kovan',
    AVALANCHE = 'avalanche',
}

enum NetworkId {
    UNKNOWN = 0,
    MAINNET = 1,
    ROPSTEN = 3,
    RINKEBY = 4,
    GOERLI = 5,
    KOVAN = 42,
    AVALANCHE = 43114,
}

enum SqlCommand {
    DELETE = 'delete',
    INSERT = 'insert',
    SELECT = 'select',
    TRUNCATE = 'truncate',
    UPDATE = 'update',
    VIEW = 'view',
}

enum TokenName {
    UNKNOWN = 'unknown',
    PWRD = 'pwrd',
    GVT = 'gvt',
    GRO = 'gro',
    groUSDC_e = 'gro_usdc_e',
    groUSDT_e = 'gro_usdt_e',
    groDAI_e = 'gro_dai_e',
    USDC = 'usdc',
    USDT = 'usdt',
    DAI = 'dai',
    USD = 'usd',
    usdc_e = 'usdc_e',
    usdt_e = 'usdt_e',
    dai_e = 'dai_e',
    groUSDC_e_1_8 = 'gro_usdc_e_1_8',
    groUSDT_e_1_8 = 'gro_usdt_e_1_8',
    groDAI_e_1_8 = 'gro_dai_e_1_8',
    groUSDC_e_1_9_int = 'gro_usdc_e_1_9_int',
    groUSDT_e_1_9_int = 'gro_usdt_e_1_9_int',
    groDAI_e_1_9_int = 'gro_dai_e_1_9_int',
    avax = 'avax',
    wavax = 'wavax',
    weth = 'weth',
    balancer_gro_weth = 'balancer_gro_weth',
    uniswap_gvt_gro = 'uniswap_gvt_gro',
    uniswap_gro_usdc = 'uniswap_gro_usdc',
    curve_pwrd3crv = 'curve_pwrd3crv',
    curve_3crv = 'curve_3crv',
}

// Must be aligned with table MD_TOKENS
enum TokenId {
    UNKNOWN = 0,
    PWRD = 1,
    GVT = 2,
    GRO = 3,
    groUSDC_e = 4,
    groUSDT_e = 5,
    groDAI_e = 6,
    USDC = 7,
    USDT = 8,
    DAI = 9,
    USD = 10,
    USDC_e = 11,
    USDT_e = 12,
    DAI_e = 13,
    groUSDC_e_1_8 = 14,
    groUSDT_e_1_8 = 15,
    groDAI_e_1_8 = 16,
    groUSDC_e_1_9_int = 17,
    groUSDT_e_1_9_int = 18,
    groDAI_e_1_9_int = 19,
    avax = 20,
    wavax = 21,
    weth = 22,
    balancer_gro_weth = 23,
    uniswap_gvt_gro = 24,
    uniswap_gro_usdc = 25,
    curve_pwrd3crv = 26,
    curve_3crv = 27,
}

enum EventName {
    Unknown = 'Unknown',
    LogNewDeposit = 'LogNewDeposit',
    LogDeposit = 'LogDeposit',
    LogNewWithdrawal = 'LogNewWithdrawal',
    LogEmergencyWithdraw = 'LogEmergencyWithdraw',
    LogEmergencyWithdrawal = 'LogEmergencyWithdrawal',
    LogWithdrawal = 'LogWithdrawal',
    LogWithdraw = 'LogWithdraw',
    LogMultiWithdraw = 'LogMultiWithdraw',
    Transfer = 'Transfer',
    Approval = 'Approval',
    LogClaim = 'LogClaim',
    LogBonusClaimed = 'LogBonusClaimed',
    LogMultiClaim = 'LogMultiClaim',
    LogStrategyReported = 'LogStrategyReported',
    StrategyReported = 'StrategyReported',
    StrategyUpdateDebtRatio = 'StrategyUpdateDebtRatio',
    LogNewReleaseFactor = 'LogNewReleaseFactor',
    AnswerUpdated = 'AnswerUpdated',
    LogNewPositionOpened = 'LogNewPositionOpened',
    LogPositionClosed = 'LogPositionClosed',
    LogPositionAdjusted = 'LogPositionAdjusted',
    LogHarvested = 'LogHarvested',
    LogNewStrategyHarvest = 'LogNewStrategyHarvest',
    LogMigrateUser = 'LogMigrateUser',
    LogPnLExecution = 'LogPnLExecution',
    Harvested = 'Harvested',
    Swap = 'Swap',
    PoolBalanceChanged = 'PoolBalanceChanged',
    Mint = 'Mint',
    Burn = 'Burn',
    TokenExchange = 'TokenExchange',
    TokenExchangeUnderlying = 'TokenExchangeUnderlying',
    AddLiquidity = 'AddLiquidity',
    RemoveLiquidity = 'RemoveLiquidity',
    RemoveLiquidityOne = 'RemoveLiquidityOne',
    RemoveLiquidityImbalance = 'RemoveLiquidityImbalance',
    LogAddPool = 'LogAddPool',
    LogSetPool = 'LogSetPool',
    LogUpdatePool = 'LogUpdatePool',
    LogMaxGroPerBlock = 'LogMaxGroPerBlock',
    LogGroPerBlock = 'LogGroPerBlock',
    LogNewDrop = 'LogNewDrop',
    LogVest = 'LogVest',
    LogExit = 'LogExit',
    LogInstantExit = 'LogInstantExit',
    LogMaxLockPeriod = 'LogMaxLockPeriod',
    LogExtend = 'LogExtend',
    LogInitialClaim = 'LogInitialClaim'
}

enum Bool {
    FALSE = 0,
    TRUE = 1,
}

// For multicall
enum ReturnType {
    UINT = 0,
    BOOL = 1,
    ADDRESS = 2,
    UINT_UINT = 3,
    arrUINT_arrUINT_arrUINT = 4,
    arrUINT_arrUINT_arrarrUINT = 5,
}

// Base 1e6 or 1e18
enum Base {
    D6 = 0,
    D18 = 1,
    D8 = 2,
    D12 = 3,
}

// For AVAX ETL
enum ContractVersion {
    NO_VERSION = 0,
    VAULT_1_0 = 1,
    VAULT_1_5 = 2,
    VAULT_1_6 = 3,
    VAULT_1_7 = 4,
}

enum Factor {
    PWRD = 0,
    GVT = 1,
    BOTH = 2,
}

// Must be aligned with table MD_TRANSFERS
// Existing values can't be updated (DB misalignment vs. current loaded values)
enum Transfer {
    UNKNOWN = 0,
    // Ethereum (range 1 to 499)
    DEPOSIT = 1,
    WITHDRAWAL = 2,
    TRANSFER_GVT_IN = 3,
    TRANSFER_GVT_OUT = 4,
    TRANSFER_PWRD_IN = 5,
    TRANSFER_PWRD_OUT = 6,
    TRANSFER_GRO_IN = 7,
    TRANSFER_GRO_OUT = 8,
    STABLECOIN_APPROVAL = 9,
    // Avalanche (range 500 to 999)
    DEPOSIT_USDCe = 500,
    WITHDRAWAL_USDCe = 501,
    TRANSFER_USDCe_IN = 502,
    TRANSFER_USDCe_OUT = 503,
    DEPOSIT_USDTe = 504,
    WITHDRAWAL_USDTe = 505,
    TRANSFER_USDTe_IN = 506,
    TRANSFER_USDTe_OUT = 507,
    DEPOSIT_DAIe = 508,
    WITHDRAWAL_DAIe = 509,
    TRANSFER_DAIe_IN = 510,
    TRANSFER_DAIe_OUT = 511,
};

// Must be aligned with table MD_FEATURES
enum Feature {
    PERSONAL_STATS = 1,
    VESTING_BONUS = 2,
}

// Must be aligned with table MD_STATUS
enum Status {
    ACTIVE = 1,
    INACTIVE = 2,
}

export {
    Bool,
    Base,
    Status,
    Factor,
    TokenId,
    Feature,
    Transfer,
    LoadType,
    TokenName,
    EventName,
    NetworkId,
    SqlCommand,
    ReturnType,
    NetworkName,
    GlobalNetwork,
    ContractVersion,
}
