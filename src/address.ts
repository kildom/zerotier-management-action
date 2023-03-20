import { inputs } from "./action-in-out";


function expandIPv6Address(a: string): string {
    if (a.indexOf(':') < 0) {
        return a;
    }
    let [begin, end] = a.split('::', 2);
    let beginArr = begin.split(':');
    let endArr = end?.split(':') || [];
    let missing = 8 - beginArr.length - endArr.length;
    let missingArr: string[] = [];
    if (missing > 0) {
        missingArr = new Array(missing).fill('0000');
    }
    let arr = beginArr.concat(missingArr, endArr);
    return arr
        .map(x => ('0000' + x.trim().toLowerCase()).slice(-4))
        .join(':');
}


function compareAddress(a: string, b: string): boolean {
    a = a.trim().toLowerCase();
    b = b.trim().toLowerCase();
    if (a === b) return true;
    a = expandIPv6Address(a);
    b = expandIPv6Address(b);
    return a === b;
}


export function outputAddress(list: string[] | null | undefined, ipVersion?: string): string {
    ipVersion = ipVersion || inputs.ip_version;
    list = (list || [])
        .map(address => address.split('/', 1)[0].trim().toLowerCase());
    let listA = list.filter(x => x.indexOf('.') >= 0);
    let listB = list.filter(x => x.indexOf('.') < 0);
    if (ipVersion.startsWith('6')) {
        [listA, listB] = [listB, listA];
    }
    if (ipVersion.endsWith('?')) {
        return [...listA, ...listB][0] || '';
    } else {
        return listA[0] || '';
    }
}


export function checkSelfAddresses(list: string[] | null | undefined): boolean {
    list = (list || []).map(address => address.split('/', 1)[0]);
    if (inputs.ip) {
        for (let requested of inputs.ip) {
            if (!list.find(a => compareAddress(a, requested))) {
                return false;
            }
        }
        return true;
    } else {
        return outputAddress(list) !== '';
    }
}
