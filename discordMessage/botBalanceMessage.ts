import BN from 'bignumber.js';
import { shortAccount, div } from '../common/digitalUtil';
import { MESSAGE_TYPES } from '../common/discord/discordService';
import { sendAlertMessage } from '../common/alertMessageSender';

const ETH_DECIMAL = new BN(10).pow(18);

function botBalanceMessage(content) {
    const accountLabel = shortAccount(content.botAccount);
    const balance = div(content.balance, ETH_DECIMAL, 4);
    const discordMessage = {
        type: MESSAGE_TYPES[content.botType],
        description: `${content.level} B6 - ${content.botType} ${accountLabel} only has ${balance} ETH, add more funds`,
        urls: [
            {
                label: accountLabel,
                type: 'account',
                value: content.botAccount,
            },
        ],
    };
    let pagerduty;
    if (content.level !== '[WARN]') {
        pagerduty = {
            title: `${content.level} B6 - Bot balance is too low`,
            description: `${content.level} B6 - ${content.botType} ${content.botAccount} only has ${balance} ETH, add more funds`,
            urgency: 'low',
        };
    }
    sendAlertMessage({
        pagerduty,
        discord: discordMessage,
    });
}

export {
    botBalanceMessage,
};
