"use strict";
const { ethers } = require('ethers');
function generateKeystore(privateKey, password) {
    try {
        if (privateKey === undefined || password === undefined) {
            console.log('usage: npm generate:keystore YourPrivateKey YourPassword');
            return;
        }
        console.log(`privateKey ${privateKey} password ${password}`);
        const botWallet = new ethers.Wallet(privateKey);
        botWallet.encrypt(password).then((resolve, reject) => {
            console.log('\n--------- key start ---------\n');
            console.log(resolve);
            console.log('\n--------- key end ---------\n');
            const verification = ethers.Wallet.fromEncryptedJsonSync(resolve, password);
            console.log(`verification - load keystore and check the address: ${verification.address}`);
        });
    }
    catch (e) {
        console.log(e);
    }
}
const args = process.argv.slice(2);
generateKeystore(args[0], args[1]);
