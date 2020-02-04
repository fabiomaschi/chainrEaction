
export interface Evaluation {
    docType?: string;
    val: string;
}

/*
 An ItemInfo is a piece of info about an item. 
 The info we are interested in here are "transfer of ownership" of sort,
 e.g. "farmer F0 (src) to shipper S1 (dst)"
 */
export interface PhoneInfo {
    docType?: string;

    uuid: string; // universally unique identifier
    model: string;
    manufacturer: string;
    tokensPrice: number;
}
