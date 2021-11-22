"use strict";
const fs = require('fs');
const path = require('path');
const { soliditySha3, toHex, toChecksumAddress } = require('web3-utils');
const { BigNumber: BN } = require('bignumber.js');
const fakeAirdropItems = [
    {
        address: '0x6D1e68d2cc52696241fA17Ae198f41Ce84078328',
        amount: 0,
    },
    {
        address: '0x085873B5fb1BC6833CE995a4Cd856D0Cc6C95748',
        amount: 0,
    },
    {
        address: '0x4C4A81298CC85c5BBF8092bd241fCc5dD6Ec3f74',
        amount: 0,
    },
    {
        address: '0xc94dDeACff69bd206CEDdFe2b601a277225D23D6',
        amount: 0,
    },
    {
        address: '0xdBCf4f419B0364c81f337EEceb47bA76E1404aF9',
        amount: 0,
    },
    {
        address: '0x7B4B446f42016c12b47899cEC35F417cB290524f',
        amount: 0,
    },
    {
        address: '0x48cB6fD436D34A909523A74de8f82d6bF59E6A3C',
        amount: 0,
    },
    {
        address: '0x732A3A2E00362802c422cdad0343eFB2E1A37A8A',
        amount: 0,
    },
];
class MerKleTree {
    combinedHash(a, b) {
        if (!a) {
            return b;
        }
        if (!b) {
            return a;
        }
        if (a.localeCompare(b) < 0) {
            return soliditySha3({ t: 'bytes32', v: a }, { t: 'bytes32', v: b });
        }
        return soliditySha3({ t: 'bytes32', v: b }, { t: 'bytes32', v: a });
    }
    getNextLayer(elements) {
        const pairs = elements.reduce((result, e, i) => {
            if (i % 2 === 0) {
                result.push([]);
            }
            result.slice(-1)[0].push(e);
            return result;
        }, []);
        return pairs.map((p) => this.combinedHash(p[0], p[1]));
    }
    getLayers(elements) {
        const layers = [elements];
        while (layers.slice(-1)[0].length > 1) {
            layers.push(this.getNextLayer(layers.slice(-1)[0]));
        }
        return layers;
    }
    getTreeObject(items) {
        return {
            elements: items,
            layers: this.getLayers(items),
            root: function root() {
                return this.layers.slice(-1)[0];
            },
            getProof: function getProof(e) {
                let i = this.elements.indexOf(e);
                return this.layers.reduce((result, l) => {
                    const pi = i % 2 === 0 ? i + 1 : i - 1;
                    i = Math.floor(i / 2);
                    if (pi < l.length) {
                        result.push(l[pi]);
                    }
                    return result;
                }, []);
            },
        };
    }
}
async function generateProofFile(fileName, content) {
    const filePath = `./${fileName}.json`;
    fs.writeFileSync(filePath, JSON.stringify(content));
}
async function validateFile(filePath) {
    const extName = path.extname(filePath);
    if (extName.toLowerCase() !== '.csv') {
        throw new Error('Passed file must be CSV file.');
    }
    const data = fs.readFileSync(filePath, { flag: 'r' });
    const content = data.toString();
    const items = content.split('\n');
    const headString = items[0].trim();
    const headNames = headString.split(',');
    const addressIndex = headNames.indexOf('address');
    const amountIndex = headNames.indexOf('amount');
    if (addressIndex < 0 || amountIndex < 0) {
        throw new Error('The passed file must include address and amount titles.');
    }
    const totalAddresses = [];
    const contents = [];
    for (let i = 1; i < items.length; i += 1) {
        const content = items[i].trim();
        if (content !== '') {
            const values = content.split(',');
            const addressValue = values[addressIndex];
            const amountValue = values[amountIndex];
            if (addressValue.length !== 42) {
                throw new Error(`Line ${i + 1} : the address:${addressValue} is invalid.`);
            }
            if (isNaN(amountValue)) {
                throw new Error(`Line ${i + 1} : the amount:${amountValue} is invalid.`);
            }
            if (totalAddresses.includes(addressValue.toLowerCase())) {
                throw new Error(`Line ${i + 1} : the address:${addressValue} already exists.`);
            }
            totalAddresses.push(addressValue.toLowerCase());
            contents.push({ address: addressValue, amount: amountValue });
        }
    }
    return contents;
}
async function generateProof(filePath, metadataString = '', distFileName = 'BouncerMerkleTreeProofs') {
    if (!filePath) {
        console.log('usage: npm generate:proofs airdropCSVFilePath metadata [savedProofFileName]');
        return;
    }
    console.log(`filePath: ${filePath}\nmetadataString: ${metadataString}\ndistFileName: ${distFileName}\n`);
    const contents = await validateFile(filePath);
    // console.log(`before length: ${contents.length}`);
    // handle fake airdrop
    const overCount = contents.length % 8;
    if (overCount > 0) {
        contents.push(...fakeAirdropItems.splice(overCount));
    }
    // console.log(`after length: ${contents.length}`);
    // parse metadata
    const metaStringArray = metadataString === '' ? [] : metadataString.split(',');
    const metadata = {};
    metaStringArray.forEach((item) => {
        const pair = item.split('=');
        if (pair.length < 2) {
            throw new Error(`paramter metadata:${metadataString} is invalid.`);
        }
        const metaName = pair[0].trim();
        const metaValue = pair[1].trim();
        metadata[metaName] = metaValue;
    });
    console.log(`metadata: ${JSON.stringify(metadata)}`);
    const nodes = [];
    const items = [];
    for (let i = 0; i < contents.length; i += 1) {
        const item = contents[i];
        const { address, amount } = item;
        const node = soliditySha3({ t: 'address', v: toChecksumAddress(address) }, { t: 'uint128', v: toHex(amount) });
        nodes.push(node);
        items.push({
            node,
            amount,
            index: i,
            address: toChecksumAddress(address),
        });
    }
    // console.log(`items: ${JSON.stringify(items)}`);
    const merKleTreeInstance = new MerKleTree();
    const trees = merKleTreeInstance.getTreeObject(nodes);
    const root = trees.root()[0];
    const proofs = {};
    for (let i = 0; i < items.length; i += 1) {
        const { node, address, amount } = items[i];
        proofs[address] = {
            amount: BN(amount).toFixed(0),
            proof: trees.getProof(node),
        };
    }
    const result = Object.assign(Object.assign({}, metadata), { root,
        proofs });
    generateProofFile(distFileName, result);
}
const args = process.argv.slice(2);
generateProof(args[0], args[1]);
