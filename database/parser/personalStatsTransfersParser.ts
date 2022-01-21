import moment from 'moment';
import {
    errorObj,
    parseAmount,
    getNetwork,
} from '../common/globalUtil';
import {
    isInflow,
    isOutflow,
    isDepositOrWithdrawal,
    getAmountFromEvent,
} from '../common/personalUtil';
import {
    getGroVault,
    getPowerD,
    getUSDCeVault,
    getUSDCeVault_1_5,
    getUSDCeVault_1_6,
    getUSDCeVault_1_7,
    getUSDTeVault,
    getUSDTeVault_1_5,
    getUSDTeVault_1_6,
    getUSDTeVault_1_7,
    getDAIeVault,
    getDAIeVault_1_5,
    getDAIeVault_1_6,
    getDAIeVault_1_7,
} from '../common/contractUtil';
import {
    Base,
    TokenId,
    Transfer,
    GlobalNetwork,
    ContractVersion,
} from '../types';
import { showError } from '../handler/logHandler';
import { ICall } from '../interfaces/ICall';
import { QUERY_ERROR, QUERY_SUCCESS } from '../constants';


const getTokenIds = (
    side: Transfer,
    log: any,
    isUSDCe: boolean,
    isUSDTe: boolean,
    isDAIe: boolean,
    isGRO: boolean,
): TokenId => {
    const isGVT =
        ((side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && !log.args[2])
            || side === Transfer.TRANSFER_GVT_IN
            || side === Transfer.TRANSFER_GVT_OUT
            ? true
            : false;

    const isPWRD =
        ((side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && log.args[2])
            || side === Transfer.TRANSFER_PWRD_IN
            || side === Transfer.TRANSFER_PWRD_OUT
            ? true
            : false;

    const tokenId = isGVT
        ? TokenId.GVT
        : isPWRD
            ? TokenId.PWRD
            : isGRO
                ? TokenId.GRO
                : isUSDCe
                    ? TokenId.groUSDC_e
                    : isUSDTe
                        ? TokenId.groUSDT_e
                        : isDAIe
                            ? TokenId.groDAI_e
                            : TokenId.UNKNOWN;

    return tokenId;
}

const getGroups = (side: Transfer): boolean[] => {
    try {
        const isUSDCe =
            side === Transfer.DEPOSIT_USDCe
                || side === Transfer.WITHDRAWAL_USDCe
                || side === Transfer.TRANSFER_USDCe_IN
                || side === Transfer.TRANSFER_USDCe_OUT
                ? true
                : false;

        const isUSDTe =
            side === Transfer.DEPOSIT_USDTe
                || side === Transfer.WITHDRAWAL_USDTe
                || side === Transfer.TRANSFER_USDTe_IN
                || side === Transfer.TRANSFER_USDTe_OUT
                ? true
                : false;

        const isDAIe =
            side === Transfer.DEPOSIT_DAIe
                || side === Transfer.WITHDRAWAL_DAIe
                || side === Transfer.TRANSFER_DAIe_IN
                || side === Transfer.TRANSFER_DAIe_OUT
                ? true
                : false;

        const isGRO =
            side === Transfer.TRANSFER_GRO_IN
                || side === Transfer.TRANSFER_GRO_OUT
                ? true
                : false;

        return [
            isUSDCe,
            isUSDTe,
            isDAIe,
            isGRO,
        ];
    } catch (err) {
        showError('personalStatsTransfersParser.ts->getGroups()', err);
        return [];
    }
}

//TODO: change AVAX part and use one unique if, then conditional ifs depending on the vault (to reduce code)
const personalStatsTransfersParser = async (
    contractVersion: ContractVersion,
    globalNetwork: GlobalNetwork,
    logs: any,
    side: Transfer,
    account: string,
): Promise<ICall> => {
    try {
        let result = [];
        const [
            isUSDCe,
            isUSDTe,
            isDAIe,
            isGRO,
        ] = getGroups(side);

        logs.forEach((log) => {

            const tokenId = getTokenIds(side, log, isUSDCe, isUSDTe, isDAIe, isGRO);

            // For direct transfers -> Transfer.value
            // For deposits & withdrawals on GVT & PWRD -> calculated afterwards thru func getAmountFromEvent()
            // For deposits & withdrawals on USDCe, USDTe, DAIe -> LogDeposit.shares, LogWithdrawal.shares
            const amount =
                side === Transfer.DEPOSIT_USDCe || side === Transfer.DEPOSIT_USDTe
                    ? parseAmount(log.args[2], Base.D6)
                    : side === Transfer.DEPOSIT_DAIe
                        ? parseAmount(log.args[2], Base.D18)
                        : side === Transfer.WITHDRAWAL_USDCe || side === Transfer.WITHDRAWAL_USDTe
                            ? -parseAmount(log.args[2], Base.D6)
                            : side === Transfer.WITHDRAWAL_DAIe
                                ? -parseAmount(log.args[2], Base.D18)
                                : isInflow(side)
                                    ? parseAmount(log.args[2], Base.D18)
                                    : isOutflow(side)
                                        ? -parseAmount(log.args[2], Base.D18)
                                        : 0;


            // For direct transfers -> value is calculated afterwards
            // For deposits & withdrawals on GVT & PWRD -> LogNewDeposit.usdAmount, LogNewWithdrawal.returnUsd
            // For deposits & withdrawals on USDCe, USDTe, DAIe -> LogDeposit._amount, LogWithdrawal._amount
            const value =
                side === Transfer.DEPOSIT
                    ? parseAmount(log.args[3], Base.D18)
                    : side === Transfer.WITHDRAWAL
                        ? -parseAmount(log.args[6], Base.D18)
                        : side === Transfer.DEPOSIT_USDCe || side === Transfer.DEPOSIT_USDTe
                            ? parseAmount(log.args[1], Base.D6)
                            : side === Transfer.DEPOSIT_DAIe
                                ? parseAmount(log.args[1], Base.D18)
                                : side === Transfer.WITHDRAWAL_USDCe || side === Transfer.WITHDRAWAL_USDTe
                                    ? -parseAmount(log.args[1], Base.D6)
                                    : side === Transfer.WITHDRAWAL_DAIe
                                        ? -parseAmount(log.args[1], Base.D18)
                                        : 0;

            const userAddress = isDepositOrWithdrawal(side)
                ? log.args[0] // LogNewDeposit.user, LogNewWithdrawal.user, LogDeposit.from, LogWithdrawal.from
                : isOutflow(side)
                    ? log.args[0] // Transfer.from
                    : log.args[1]; // Transfer.to

            const referralAddress =
                side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL
                    ? log.args[1]
                    : '0x0000000000000000000000000000000000000000';

            result.push({
                block_number: log.blockNumber,
                tx_hash: log.transactionHash,
                network_id: getNetwork(globalNetwork).id,
                transfer_id: side,
                token_id: tokenId,
                version_id: contractVersion,
                user_address: userAddress,
                referral_address: referralAddress,
                amount: amount,
                value: value,
                creation_date: moment.utc(),
            });
        });

        if (side === Transfer.DEPOSIT
            || side === Transfer.WITHDRAWAL) {
            // Calc GVT or PWRD amounts from TRANSFER events for deposits or withdrawals
             const amounts = await getAmountFromEvent(result, side, account);
             if (amounts.status === QUERY_ERROR) {
                return errorObj(amounts.data);
             } else {
                result = amounts.data;
             }
        } else if (
            side === Transfer.TRANSFER_GVT_OUT
            || side === Transfer.TRANSFER_GVT_IN) {
            // Calc GVT value for direct transfers
            for (const item of result) {
                const priceGVT = parseAmount(await getGroVault().getPricePerShare({ blockTag: item.block_number }), Base.D18);
                item.value = item.amount * priceGVT;
            }
        } else if (
            side === Transfer.TRANSFER_PWRD_IN
            || side === Transfer.TRANSFER_PWRD_OUT) {
            // Calc PWRD value for direct transfers
            for (const item of result) {
                const pricePWRD = parseAmount(await getPowerD().getPricePerShare({ blockTag: item.block_number }), Base.D18);
                item.value = item.amount * pricePWRD;
            }
        } else if (contractVersion === ContractVersion.VAULT_1_0) {
            // Calc USDCe, USDTe & DAIe value for direct transfers in Vault 1.0
            if (side === Transfer.TRANSFER_USDCe_IN
                || side === Transfer.TRANSFER_USDCe_OUT) {
                for (const item of result) {
                    const priceUSDCe = parseAmount(await getUSDCeVault().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDCe;
                }
            } else if (
                side === Transfer.TRANSFER_USDTe_IN
                || side === Transfer.TRANSFER_USDTe_OUT) {
                for (const item of result) {
                    const priceUSDTe = parseAmount(await getUSDTeVault().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDTe;
                }
            } else if (
                side === Transfer.TRANSFER_DAIe_IN
                || side === Transfer.TRANSFER_DAIe_OUT) {
                for (const item of result) {
                    const priceDAIe = parseAmount(await getDAIeVault().getPricePerShare({ blockTag: item.block_number }), Base.D18);
                    item.value = item.amount * priceDAIe;
                }
            }
        } else if (contractVersion === ContractVersion.VAULT_1_5) {
            // Calc USDCe, USDTe & DAIe value for direct transfers in Vault 1.5
            if (side === Transfer.TRANSFER_USDCe_IN
                || side === Transfer.TRANSFER_USDCe_OUT) {
                for (const item of result) {
                    const priceUSDCe = parseAmount(await getUSDCeVault_1_5().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDCe;
                }
            } else if (
                side === Transfer.TRANSFER_USDTe_IN
                || side === Transfer.TRANSFER_USDTe_OUT) {
                for (const item of result) {
                    const priceUSDTe = parseAmount(await getUSDTeVault_1_5().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDTe;
                }
            } else if (
                side === Transfer.TRANSFER_DAIe_IN
                || side === Transfer.TRANSFER_DAIe_OUT) {
                for (const item of result) {
                    const priceDAIe = parseAmount(await getDAIeVault_1_5().getPricePerShare({ blockTag: item.block_number }), Base.D18);
                    item.value = item.amount * priceDAIe;
                }
            }
        } else if (contractVersion === ContractVersion.VAULT_1_6) {
            // Calc USDCe, USDTe & DAIe value for direct transfers in Vault 1.6
            if (side === Transfer.TRANSFER_USDCe_IN
                || side === Transfer.TRANSFER_USDCe_OUT) {
                for (const item of result) {
                    const priceUSDCe = parseAmount(await getUSDCeVault_1_6().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDCe;
                }
            } else if (
                side === Transfer.TRANSFER_USDTe_IN
                || side === Transfer.TRANSFER_USDTe_OUT) {
                for (const item of result) {
                    const priceUSDTe = parseAmount(await getUSDTeVault_1_6().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDTe;
                }
            } else if (
                side === Transfer.TRANSFER_DAIe_IN
                || side === Transfer.TRANSFER_DAIe_OUT) {
                for (const item of result) {
                    const priceDAIe = parseAmount(await getDAIeVault_1_6().getPricePerShare({ blockTag: item.block_number }), Base.D18);
                    item.value = item.amount * priceDAIe;
                }
            }
        } else if (contractVersion === ContractVersion.VAULT_1_7) {
            // Calc USDCe, USDTe & DAIe value for direct transfers in Vault 1.7
            if (side === Transfer.TRANSFER_USDCe_IN
                || side === Transfer.TRANSFER_USDCe_OUT) {
                for (const item of result) {
                    const priceUSDCe = parseAmount(await getUSDCeVault_1_7().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDCe;
                }
            } else if (
                side === Transfer.TRANSFER_USDTe_IN
                || side === Transfer.TRANSFER_USDTe_OUT) {
                for (const item of result) {
                    const priceUSDTe = parseAmount(await getUSDTeVault_1_7().getPricePerShare({ blockTag: item.block_number }), Base.D6);
                    item.value = item.amount * priceUSDTe;
                }
            } else if (
                side === Transfer.TRANSFER_DAIe_IN
                || side === Transfer.TRANSFER_DAIe_OUT) {
                for (const item of result) {
                    const priceDAIe = parseAmount(await getDAIeVault_1_7().getPricePerShare({ blockTag: item.block_number }), Base.D18);
                    item.value = item.amount * priceDAIe;
                }
            }
        }

        return {
            status: QUERY_SUCCESS,
            data: result,
        };

    } catch (err) {
        const msg = `[side: ${side}]: ${err}`;
        showError('personalStatsTransfersParser.ts->personalStatsTransfersParser()', msg);
        return errorObj(msg);
    }
};

export {
    personalStatsTransfersParser,
};
