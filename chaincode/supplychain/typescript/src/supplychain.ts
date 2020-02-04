/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from 'fabric-contract-api';
import {BasicContract } from './basiccontract';
import { Evaluation, ItemInfo } from './datatypes';
import * as NodeRSA from 'node-rsa';

/* Crypto functions */
const key = new NodeRSA()
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



function decrypt(ciphertext:string)
{
    const plaintext = key.decrypt(ciphertext, 'utf8');
    console.log(plaintext);
    return plaintext;
}

function isItemFinalized(iteminfo):boolean
{
    return iteminfo.dst == "D"; // arrived to distributor
}

function computeEvaluation(infos: ItemInfo[]):string
{
    // Decryption

    // we check it arrived to distribution 
    // (assuming the earlier steps are present)
    let arrivedToDest = false;
    let score:number = 0; 

    // compute score
    for (let iteminfo of infos) {
        if (isItemFinalized(iteminfo)) {
            arrivedToDest = true;
        }

        const footprintDecrypted = decrypt(iteminfo.footprint);
        score += Number(footprintDecrypted);
    }

    let evalStr = null;
    // compute string
    if (score <= 3)
        evalStr = ":-)";
    else if (score <= 8)
        evalStr = ":-|";
    else 
        evalStr = ":-(";

    if (!arrivedToDest)
        return "NA";
    else
        return evalStr;
}

export class SupplyChain extends BasicContract {
    static evalIndexName:string = 'item~eval';

    public async initLedger(ctx: Context) {
        console.info('============= START : Initialize Ledger ===========');
        await this.reset(ctx);
        console.info('============= END : Initialize Ledger ===========');
    }

    protected async insertEvaluation(ctx: Context, tag: string, evaluation: string)
    {
        let indexKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, [tag, evaluation]);
        console.info(indexKey);
        //  Save index entry to state. Only the key name is needed, no need to store a duplicate copy of the marble.
        //  Note - passing a 'nil' value will effectively delete the key from state, therefore we pass null character as value
        await ctx.stub.putState(indexKey, Buffer.from('\u0000'));
    }

    public async reset(ctx:Context) {
        await this.insertEvaluation(ctx, "Carrot", ":-)");
    }

    public async querySimple(ctx: Context, k: string): Promise<string>
    {
        const valAsBytes = await ctx.stub.getState(k);  
        if (!valAsBytes || valAsBytes.length === 0) {
            throw new Error(`${k} does not exist`);
        }
        console.log(valAsBytes.toString());
        return JSON.parse(valAsBytes.toString());
    }

    public async addSimple(ctx: Context, k: string, v:string)
    {
        await ctx.stub.putState(k, Buffer.from(JSON.stringify(v)));
    }

    public async addItemInfo(ctx: Context, id: string, ii:string)
    {
        await this.create(ctx, 'iteminfo', id, JSON.parse(ii));
    }

    // the id of the evaluation is the item id it refers to
    public async updateEvaluationOnItem(ctx:Context, tgtTag: string) {
        const infosStr = await this.queryInfosByItemTag(ctx, tgtTag);
        const infos:ItemInfo[] = JSON.parse(infosStr);
        console.log("== Updating evaluation ==");
        console.log(infos);
        // compute evaluation
        const e = computeEvaluation(infos);
        await this.insertEvaluation(ctx, tgtTag, e);
    }

    /*  Returns a single evaluations related to item */
    public async queryEvaluationByItem(ctx:Context, tgtTag:string): Promise<string> {
        return await this.query(ctx, 'evaluation', tgtTag);
    }
  
    public async queryAllItemInfos(ctx: Context):Promise<string> {
        return await this.queryFullRange(ctx, 'iteminfo');
    }

    public async queryItemInfoByIdx(ctx: Context, id: string):Promise<string> {
        return await this.query(ctx, 'iteminfo', id);
    }

    public async grabAllInfos(ctx: Context):Promise<ItemInfo []> {
        const infosStr = await this.queryAllItemInfos(ctx);
        const infosKV = JSON.parse(infosStr);
        //const infosKeys = infosKV.map(it => it["Key"]); 
        const allInfos = infosKV.map(it => JSON.parse(it["Record"])); 
        console.log(allInfos);

        return allInfos;
    }

    // returns a list [iteminfo ] related to item "item"
    public async queryInfosByItemTag(ctx: Context, tgtTag: string):Promise<string> {
        const allInfos = await this.grabAllInfos(ctx);

        let infosWeCareAbout = [];
        for (let x of allInfos) {
            if (x.item == tgtTag) {
                infosWeCareAbout.push(x);
            }
        }
        
        return JSON.stringify(infosWeCareAbout);
    }

    public async queryInfosByItemSrc(ctx: Context, tgtSrc: string):Promise<string> {
        const allInfos = await this.grabAllInfos(ctx);

        let infosWeCareAbout = [];
        for (let x of allInfos) {
            if (x.src == tgtSrc) {
                infosWeCareAbout.push(x);
            }
        }

        return JSON.stringify(infosWeCareAbout);
    }

    public async queryInfosByItemDst(ctx: Context, tgtDst: string):Promise<string> {
        const allInfos = await this.grabAllInfos(ctx);
        
        let infosWeCareAbout = [];
        for (let x of allInfos) {
            if (x.dst == tgtDst) {
                infosWeCareAbout.push(x);
            }
        }

        return JSON.stringify(infosWeCareAbout);
    }

    public async queryItemsInDistribution(ctx: Context):Promise<string> {
        // Get list of items arrived at Distributor ("D")
        const rsltStr = await this.queryInfosByItemDst(ctx, "D");
        const rsltItems = JSON.parse(rsltStr).map(x => x.item);

        return JSON.stringify(rsltItems);
    }

    /*
        Return all item infos of which the user is the current endpoint 
        (i.e. the user received it but hasn't shipped it yet)
    */
    public async queryPendingItemInfos(ctx: Context, tgtUser: string): Promise<string> {
        const receivedItemInfosStr = await this.queryInfosByItemDst(ctx, tgtUser);
        const receivedItemInfos:ItemInfo [] = JSON.parse(receivedItemInfosStr);

        const shippedItemsInfosStr = await this.queryInfosByItemSrc(ctx, tgtUser);
        const shippedItems:string [] = JSON.parse(shippedItemsInfosStr).map(it => it.item);

        let pendingItems = [];
        for (let rcvdItem of receivedItemInfos) {
            if (!shippedItems.includes(rcvdItem.item)) {
                pendingItems.push(rcvdItem);
            }
        }

        return JSON.stringify(pendingItems); 
    }

    public async queryItemsWaitingEval(ctx: Context): Promise<string>
    {
        const allEvalsStr = await this.queryAllEvaluations(ctx);
        const allEvaledItems = JSON.parse(allEvalsStr).map(x => x[0]);

        const allItemsInDistStr = await this.queryItemsInDistribution(ctx);
        
        let ret = [];
        for (let x of JSON.parse(allItemsInDistStr)) {            
            if (!allEvaledItems.includes(x)) {
                // not evaluated yet, then it's pending
                ret.push(x);
            }
        }
        return JSON.stringify(ret);
    }

    public async queryAllEvaluations(ctx: Context): Promise<string> {

        let ret = [];
        
        // This will execute a key range query on all keys for evalIndexName
        let resultsIterator = 
         await ctx.stub.getStateByPartialCompositeKey(SupplyChain.evalIndexName, []);

        while (true) {
            const responseRange = await resultsIterator.next();
            if (!responseRange || !responseRange.value || !responseRange.value.key) {
                break;
            }
            console.log(responseRange.value.key);

            let objectType;
            let attributes;
            ({
                objectType,
                attributes
            } = await ctx.stub.splitCompositeKey(responseRange.value.key));

            ret.push(attributes);

            let returnedItem = attributes[0];
            let returnedEval = attributes[1];
            console.log(`Found item ${returnedItem} with eval ${returnedEval}`);
        }
        return JSON.stringify(ret);
    }

    public async queryEvaluation(ctx: Context, tgtItem:string): Promise<string> {
  
      // This will execute a key range query on all keys starting with 'tgtItem'
        let resultsIterator = 
            await ctx.stub.getStateByPartialCompositeKey(SupplyChain.evalIndexName, [tgtItem]);
  
        
        const responseRange = await resultsIterator.next();
        if (!responseRange || !responseRange.value || !responseRange.value.key) {
            return;
        }
        console.log(responseRange.value.key);

        let objectType;
        let attributes;
        ({
            objectType,
            attributes
        } = await ctx.stub.splitCompositeKey(responseRange.value.key));

        let returnedItem = attributes[0];
        let returnedEval = attributes[1];
        console.log(`Found item ${returnedItem} with eval ${returnedEval}`);

        return returnedEval;    
    }

}
