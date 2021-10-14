const fs = require('fs');
const { soliditySha3, toHex, toChecksumAddress } = require('web3-utils');

const { BigNumber: BN } = require('bignumber.js');
const csvtojson = require('csvtojson');

const fakeAirdropItems = [
    { address: '0x6D1e68d2cc52696241fA17Ae198f41Ce84078328', amount: 0 },
    { address: '0x085873B5fb1BC6833CE995a4Cd856D0Cc6C95748', amount: 0 },
    { address: '0x4C4A81298CC85c5BBF8092bd241fCc5dD6Ec3f74', amount: 0 },
    { address: '0xc94dDeACff69bd206CEDdFe2b601a277225D23D6', amount: 0 },
    { address: '0xdBCf4f419B0364c81f337EEceb47bA76E1404aF9', amount: 0 },
    { address: '0x7B4B446f42016c12b47899cEC35F417cB290524f', amount: 0 },
    { address: '0x48cB6fD436D34A909523A74de8f82d6bF59E6A3C', amount: 0 },
    { address: '0x732A3A2E00362802c422cdad0343eFB2E1A37A8A', amount: 0 },
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

async function generateProof(
    filePath,
    merkleIndex,
    decimals = 0,
    distFileName = 'merkleTreeProofs'
) {
    if (!filePath) {
        console.log(
            'usage: npm generate:proofs airdropCSVFilePath merkleIndex [decimals] [savedProofFileName]'
        );
        return;
    }
    console.log(
        `filePath: ${filePath}\nmerkleIndex: ${merkleIndex}\ndistFileName: ${distFileName}\ndecimals: ${decimals}`
    );
    const airDropResult = await csvtojson().fromFile(filePath);
    // console.log(`before length: ${airDropResult.length}`);
    airDropResult.push(...fakeAirdropItems);
    // console.log(`after length: ${airDropResult.length}`);
    const nodes = [];
    const items = [];
    for (let i = 0; i < airDropResult.length; i += 1) {
        const item = airDropResult[i];
        const amount = decimals
            ? new BN(item.amount).multipliedBy(new BN(10).pow(new BN(decimals)))
            : item.amount;
        const node = soliditySha3(
            { t: 'address', v: toChecksumAddress(item.address) },
            { t: 'uint128', v: toHex(amount) }
        );
        nodes.push(node);

        items.push({
            node,
            amount,
            index: i,
            address: toChecksumAddress(item.address),
        });
    }
    // console.log(`items: ${JSON.stringify(items)}`);

    const merKleTreeInstance = new MerKleTree();
    const trees = merKleTreeInstance.getTreeObject(nodes);

    const root = trees.root()[0];
    const proofs = {};
    let totalAmount = new BN(0);
    for (let i = 0; i < items.length; i += 1) {
        totalAmount = totalAmount.plus(new BN(items[i].amount));
        proofs[items[i].address] = {
            amount: `${items[i].amount}`,
            proof: trees.getProof(items[i].node),
        };
    }

    const result = {
        totalAmount: `${totalAmount}`,
        merkleIndex: parseInt(merkleIndex, 10),
        root,
        proofs,
    };
    generateProofFile(distFileName, result);
}

const args = process.argv.slice(2);
generateProof(args[0], args[1], args[2], args[3]);
