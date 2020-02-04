/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileSystemWallet, Gateway } from 'fabric-network';
import * as path from 'path';

// NB: change next two line appropriately 
import * as chaincode  from '../../../chaincode/supplychain/typescript/dist';
const contractName = 'supplychain';

import * as NodeRSA from 'node-rsa';
const ccpPath = path.resolve(__dirname, '..', '..', '..', 'first-network', 'connection-org1.json');

// TODO: use absolute path in some way for the script
// One solution would be to move wallet to an upper level
async function main() {
    try {

        const args = require('minimist')(process.argv.slice(2));
        //console.log(args);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), '../wallet');
        const wallet = new FileSystemWallet(walletPath);
        //console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.error('An identity for the user "user1" does not exist in the wallet');
            console.error('Run the registerUser.ts application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract(contractName);

        // Evaluate the specified transaction from the command line
        const result = await dispatchCmd(args, contract);

        // queryCar transaction - requires 1 argument, ex: ('queryCar', 'CAR4')
        // queryAllCars transaction - requires no arguments, ex: ('queryAllCars')
        //const result = await contract.evaluateTransaction('queryBet', '0');
        //const result = await contract.evaluateTransaction('queryAllBets');

        //console.log(`Transaction has been evaluated, result is: ${result}`);
        const parsedResult = JSON.parse(result);
        console.log(parsedResult);
        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

// for encryption/decryption
const key = new NodeRSA(); 
key.importKey({
    n: Buffer.from('0086fa9ba066685845fc03833a9699c8baefb53cfbf19052a7f10f1eaa30488cec1ceb752bdff2df9fad6c64b3498956e7dbab4035b4823c99a44cc57088a23783', 'hex'),
    e: 65537,
    d: Buffer.from('5d2f0dd982596ef781affb1cab73a77c46985c6da2aafc252cea3f4546e80f40c0e247d7d9467750ea1321cc5aa638871b3ed96d19dcc124916b0bcb296f35e1', 'hex'),
    p: Buffer.from('00c59419db615e56b9805cc45673a32d278917534804171edcf925ab1df203927f', 'hex'),
    q: Buffer.from('00aee3f86b66087abc069b8b1736e38ad6af624f7ea80e70b95f4ff2bf77cd90fd', 'hex'),
    dmp1: Buffer.from('008112f5a969fcb56f4e3a4c51a60dcdebec157ee4a7376b843487b53844e8ac85', 'hex'),
    dmq1: Buffer.from('1a7370470e0f8a4095df40922a430fe498720e03e1f70d257c3ce34202249d21', 'hex'),
    coeff: Buffer.from('00b399675e5e81506b729a777cc03026f0b2119853dfc5eb124610c0ab82999e45', 'hex')
}, 'components');

function encrypt(plaintext:string)
{
    const ct = key.encrypt(plaintext, 'base64');
    return ct;
}

function decrypt(ciphertext:string)
{
    const plaintext = key.decrypt(ciphertext, 'utf8');
    return plaintext;
}


async function dispatchCmd(args, contract):Promise<string>
{

    /* NB: one needs submitTransaction for updates and evaluateTransaction for queries */
    switch (args["cmd"]) {
        case "reset":{  
            await contract.submitTransaction('clearAllState');
            return JSON.stringify("Success."); }
        case "querySimple":{  // requires --key
            const result = await contract.evaluateTransaction('querySimple', args["key"].toString());
            return result; }
        case "queryAllItemInfos": { 
            const result = await contract.evaluateTransaction('grabAllInfos');
            return result; }
        case "queryAllEvaluations": { 
            const result = await contract.evaluateTransaction('queryAllEvaluations');
            return result; }
        case "queryItemsWaitingEval": { 
            const result = await contract.evaluateTransaction('queryItemsWaitingEval');
            return result; }
        case  "queryItemsInDistribution": {
            const result = await contract.evaluateTransaction('queryItemsInDistribution');
            return result; }
        case "queryItemInfosBySrc": { // requires --src
            const result = await contract.evaluateTransaction('queryInfosByItemSrc', args["src"]);
            return result;
        }
        case "queryItemInfoByIdx": {
            const result = await contract.evaluateTransaction('queryItemInfoByIdx', args["idx"].toString());
            return result;
        }
        case "queryPendingItemInfos": { // requires --user
            const result = await contract.evaluateTransaction('queryPendingItemInfos', args["user"]);
            return result;
        }
        
        case "queryEvaluation": { // requires --item
            const result = await contract.evaluateTransaction(
                'queryEvaluation', args["item"].toString());
            return result; }
        case "updateEvaluation": { // requires --item
            await contract.submitTransaction(
                'updateEvaluationOnItem', args["item"].toString());
            return JSON.stringify("Success."); }
        case "addItemInfo": { // requires --idx, --item, --src, --dst and --footprint
            const info = {
                "docType" : "iteminfo",
                "item" : args["item"],
                "src" : args["src"],
                "dst" : args["dst"],
                "footprint" : encrypt(args["footprint"].toString()) // we encrypt footprint
            };
            const info_str = JSON.stringify(info as chaincode.ItemInfo);
            await contract.submitTransaction(
                'addSimple', 
                "iteminfo" + args["idx"].toString(),
                info_str );
            return JSON.stringify(`Successfully added info #${args["idx"]}!`); }
        default:
            throw new Error(`Bad command-line argument for --cmd: ${args["cmd"]}`); 
    }
    
} 

main();
