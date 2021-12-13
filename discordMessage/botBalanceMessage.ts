import BN from 'bignumber.js';
import { shortAccount, div } from '../common/digitalUtil';
import { MESSAGE_TYPES } from '../common/discord/discordService';
import { sendAlertMessage } from '../common/alertMessageSender';

const ETH_DECIMAL = new BN(10).pow(18);

function botBalanceMessage(content) {
    const { botAccount, botType, chain, walletKey, balance, level } = content;
    const accountLabel = shortAccount(botAccount);
    const distBalance = div(balance, ETH_DECIMAL, 4);
    let chainLabel = '[Ethereum]';
    let tokenLabal = 'ETH';
    if (chain && chain.toLowerCase() === 'avax') {
        chainLabel = '[Avalanche]';
        tokenLabal = 'AVAX';
    }
    let botLabel = botType;
    if (walletKey) {
        botLabel = `${botLabel} - ${walletKey}`;
    }
    const discordMessage = {
        type: MESSAGE_TYPES[botType],
        description: `${level}${chainLabel} B6 - ${botLabel} ${accountLabel} only has ${distBalance} ${tokenLabal}, add more funds`,
        urls: [
            {
                label: accountLabel,
                type: 'account',
                value: botAccount,
            },
        ],
    };
    let pagerduty;
    if (level !== '[WARN]') {
        pagerduty = {
            title: `${level} B6 - Bot balance is too low`,
            description: `${level}${chainLabel} B6 - ${botLabel} ${accountLabel} only has ${distBalance} ${tokenLabal}, add more funds`,
            urgency: 'low',
        };
    }
    sendAlertMessage({
        pagerduty,
        discord: discordMessage,
    });
}

export { botBalanceMessage };
