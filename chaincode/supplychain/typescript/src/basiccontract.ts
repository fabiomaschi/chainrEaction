import { Context, Contract } from 'fabric-contract-api';

export abstract class BasicContract extends Contract {

    public static mkKey(a:string, b:string): string {
        return a + b;
    }

    protected async query<T>(ctx: Context, whatis: string, id: string): Promise<T> {
        const k = BasicContract.mkKey(whatis, id);
        return this.queryByFullKey(ctx, k);
    }

    protected async queryByFullKey<T>(ctx: Context, k: string): Promise<T> {
        const valAsBytes = await ctx.stub.getState(k);  
        if (!valAsBytes || valAsBytes.length === 0) {
            throw new Error(`${k} does not exist`);
        }
        console.log("[queryByFullKey] valAsBytes:");
        console.log(valAsBytes);
        return JSON.parse(valAsBytes.toString());
    }

    protected async queryFullRange(ctx: Context, whatis: string): Promise<string> {
        const startKey = BasicContract.mkKey(whatis,'0');
        const endKey = BasicContract.mkKey(whatis,'999');
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        console.log("About to start scanning data for all queries")
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString());

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString();
                }
                console.log(Record.toString());
                allResults.push({ Key, Record});
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

    protected async create<T>(ctx: Context, whatis: string, id: string, val: T) {
        await ctx.stub.putState(
            BasicContract.mkKey(whatis, id),
            Buffer.from(JSON.stringify(val))
            );
    }

    protected async replaceByFullKey<T>(ctx: Context, k: string, val: T) {
        await ctx.stub.putState(k, Buffer.from(JSON.stringify(val)));
    }

    protected async replace<T>(ctx: Context, whatis: string, id: string, val: T) {
        await this.create(ctx, whatis, id, val);
    }
    protected async remove<T>(ctx: Context, k: string) {
        await ctx.stub.deleteState(k)

    }

}