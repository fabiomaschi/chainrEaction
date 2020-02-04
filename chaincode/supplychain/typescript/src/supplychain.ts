/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from 'fabric-contract-api';
import { BasicContract } from './basiccontract';
import { Evaluation, ItemInfo, Phone, PhoneState, Balance } from './datatypes';
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
    static evalIndexName:string = 'state~id';
    static buyerIndexName: string = 'owner~id';

    public async initLedger(ctx: Context) {
        console.info('============= START : Initialize Ledger ===========');
        await this.create(ctx, 'genesis', 'init', 1)
        console.info('============= END : Initialize Ledger ===========');
    }
    //Manufacturer
    // producePhone .
    // listProduced .
    // dispatchToSupplier .
    // listReceivedForRecycle
    // recycle .f

    //Supplier
    // listReceivedFromManufacturer .
    // confirmReceived .
    // sellToBuyer .
    // dispatchToManufacturer .

    //Buyer
    // listPhones .
    // listRecyleStatus
    // viewTokens .
    // redeemToken .

    public async producePhone(ctx: Context, id: string, data: string)
    {
        await this.create(ctx, 'phone', id, JSON.parse(data));
    }
    public async listProduced(ctx: Context, manufacturer: string)
    {
        const allPhones = await this.grabAllInfos(ctx);

        let phonesWeCareAbout = [];
        for (let x of allPhones) {
            if (x.manufacturer == manufacturer) {
                phonesWeCareAbout.push(x);
            }
        }
        
        return JSON.stringify(phonesWeCareAbout);
    }
    protected async dispatchToSupplier(ctx: Context, id: string, data: string)
    {
        let indexKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['dispatchedToSupplier', id]);
        console.info(indexKey);
        await ctx.stub.putState(indexKey, JSON.parse(data));
    }
    public async listReceivedFromManufacturer(ctx: Context, supplier_id: string): Promise<string>
    {
        let ret = [];
        
        // This will execute a key range query on all keys for evalIndexName
        let resultsIterator = 
         await ctx.stub.getStateByPartialCompositeKey(SupplyChain.evalIndexName, ['dispatchedToSupplier']);

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

            let data = await this.queryByFullKey(ctx, attributes)
            if (data['dst'] == supplier_id){
                let item = await this.queryItemInfoByIdx(ctx, attributes[1])
                ret.push(item)
            }
        }
        return JSON.stringify(ret);
    }
    public async confirmReceivedFromManufacturer(ctx: Context, id: string, data: string)
    {
        let oldKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['dispatchedToSupplier', id]);
        await this.remove(ctx, oldKey)
        let indexKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['onShelf', id]);

        await ctx.stub.putState(indexKey, JSON.parse(data));
    }
    public async sellToBuyer(ctx: Context, id: string, data: string)
    {
        let oldKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['onShelf', id]);
        await this.remove(ctx, oldKey)
        let indexKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['sold', id]);
        await ctx.stub.putState(indexKey, JSON.parse(data));

        let d = JSON.parse(data)
        let buyer = d['dst']
        let buyerKey = await ctx.stub.createCompositeKey(
            SupplyChain.buyerIndexName, [id, buyer]);

        await ctx.stub.putState(buyerKey, Buffer.from('\u0000'));
    }
    public async listPhones(ctx: Context): Promise<string>
    {
        let ret = [];
        
        // This will execute a key range query on all keys for evalIndexName
        let resultsIterator = 
         await ctx.stub.getStateByPartialCompositeKey(SupplyChain.evalIndexName, ['onShelf']);

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
            
            let item = await this.queryItemInfoByIdx(ctx, attributes[1])
            ret.push(item)
        }
        return JSON.stringify(ret);
    }
    public async dispatchToManufacturer(ctx: Context, id: string, data, string)
    {
        let oldKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['sold', id]);
        await this.remove(ctx, oldKey)
        let indexKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['dispatchedForRecycling', id]);
        await ctx.stub.putState(indexKey, JSON.parse(data));
    }
    public async listReceivedForRecycle(ctx: Context, manufacturer_id: string): Promise<string>
    {
        let ret = [];
        
        // This will execute a key range query on all keys for evalIndexName
        let resultsIterator = 
         await ctx.stub.getStateByPartialCompositeKey(SupplyChain.evalIndexName, ['dispatchedForRecycling']);

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

            let data = await this.queryByFullKey(ctx, attributes)
            if (data['dst'] == manufacturer_id){
                let item = await this.queryItemInfoByIdx(ctx, attributes[1])
                ret.push(item)
            }
        }
        return JSON.stringify(ret);
    }
    public async recycle(ctx: Context, id: string, data: string)
    {
        let oldKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['dispatchedForRecycling', id]);
        await this.remove(ctx, oldKey)
        let indexKey = await ctx.stub.createCompositeKey(
            SupplyChain.evalIndexName, ['recycled', id]);
        await ctx.stub.putState(indexKey, JSON.parse(data));

        let item = await this.queryItemInfoByIdx(ctx, id);
        let buyer = await this.getBuyerOfPhone(ctx, id);
        let details = JSON.parse(item)
        // give tokens
        await this.transferTokens(ctx, buyer, details.token_value)

    }
    public async viewBalance(ctx:Context, buyer_id: string): Promise<number>
    {
        const valAsBytes = await ctx.stub.getState(BasicContract.mkKey('balance', buyer_id));  
        if (!valAsBytes || valAsBytes.length === 0) {
            throw new Error(`does not exist`);
        }
        let previousBalance = valAsBytes.toString();
        return +previousBalance;
    }
    protected async transferTokens(ctx: Context, to: string, amount: number)
    {
        let currentBalance = await this.viewBalance(ctx, to)
        await this.create(ctx, 'balance', to, amount+currentBalance)
    }
    public async redeemTokens(ctx: Context, buyer_id: string, amount: number): Promise<boolean>
    {
        let currentBalance = await this.viewBalance(ctx, buyer_id)
        if(currentBalance - amount >= 0)
        {
            await this.transferTokens(ctx, buyer_id, -amount)
            return true
        }
        return false
    }
    protected async getBuyerOfPhone(ctx: Context, id: string): Promise<string>
    {
        let resultsIterator = 
            await ctx.stub.getStateByPartialCompositeKey(SupplyChain.buyerIndexName, [id]);
  
        
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

        let buyer = attributes[1];
        
        return buyer.toString();
    }

    /*  Returns a single evaluations related to item */
    public async queryEvaluationByItem(ctx:Context, tgtTag:string): Promise<string> {
        return await this.query(ctx, 'evaluation', tgtTag);
    }
  
    public async queryAllItemInfos(ctx: Context):Promise<string> {
        return await this.queryFullRange(ctx, 'phone');
    }

    public async queryItemInfoByIdx(ctx: Context, id: string):Promise<string> {
        return await this.query(ctx, 'phone', id);
    }

    public async grabAllInfos(ctx: Context):Promise<Phone[]> {
        const infosStr = await this.queryAllItemInfos(ctx);
        const infosKV = JSON.parse(infosStr);
        //const infosKeys = infosKV.map(it => it["Key"]); 
        const allInfos = infosKV.map(it => JSON.parse(it["Record"])); 
        console.log(allInfos);

        return allInfos;
    }

}
