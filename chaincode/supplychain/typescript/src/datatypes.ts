
export interface Evaluation {
    docType?: string;
    val: string;
}

/*
 An ItemInfo is a piece of info about an item. 
 The info we are interested in here are "transfer of ownership" of sort,
 e.g. "farmer F0 (src) to shipper S1 (dst)"
 */
export interface ItemInfo {
    docType?: string;

    item: string;  // a tag describing what this item is (e.g. cabbage)

    footprint: string; // (encrypted) data on impact of information

    src: string;
    dst: string;
}
