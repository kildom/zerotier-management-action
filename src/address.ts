import { ASSERT_EQ, ASSERT_FALSE, ASSERT_TRUE } from "../tests/asserts";
import { inputs } from "./action-in-out";


function expandIPv6Address(a: string): string {
    if (a.indexOf(':') < 0) {
        return a;
    }
    let [begin, end] = a.split('::', 2);
    let beginArr = begin?.split(':') || [];
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
        .map(address => address.split('/', 1)[0]!.trim().toLowerCase());
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
    list = (list || []).map(address => address.split('/', 1)[0]!.trim());
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


//---------------------------------------------------------------------------------------
//---------------------------------------- TESTS ----------------------------------------
//---------------------------------------------------------------------------------------


export function test() {
    ASSERT_TRUE(compareAddress('127.0.0.1', ' 127.0.0.1'));
    ASSERT_TRUE(compareAddress('2001:0db8:85a3:8d3:1319:8a2e:370:7348', '2001:DB8:85A3:8D3:1319:8A2E:370: 7348'));
    ASSERT_TRUE(compareAddress('fe80::1ff:fe23:4567:890a', ' fe80:0:0::00:1FF:Fe23:4567:890a'));
    ASSERT_TRUE(compareAddress('::', '::0'));

    inputs.ip_version = '6';
    ASSERT_EQ(outputAddress([]), '');
    ASSERT_EQ(outputAddress(['127.0.0.1/8']), '');
    ASSERT_EQ(outputAddress(['::']), '::');
    ASSERT_EQ(outputAddress(['127.0.0.1', '::/24', '127.0.0.2']), '::');
    ASSERT_EQ(outputAddress(['::/24', '127.0.0.1']), '::');
    inputs.ip_version = '6?';
    ASSERT_EQ(outputAddress([]), '');
    ASSERT_EQ(outputAddress(['127.0.0.1/8']), '127.0.0.1');
    ASSERT_EQ(outputAddress(['::']), '::');
    ASSERT_EQ(outputAddress(['127.0.0.1', '::/24', '127.0.0.2']), '::');
    ASSERT_EQ(outputAddress(['::/24', '127.0.0.1']), '::');
    inputs.ip_version = '4';
    ASSERT_EQ(outputAddress([]), '');
    ASSERT_EQ(outputAddress(['127.0.0.1/8']), '127.0.0.1');
    ASSERT_EQ(outputAddress(['::']), '');
    ASSERT_EQ(outputAddress(['::1/24', '127.0.0.1', '::/24']), '127.0.0.1');
    ASSERT_EQ(outputAddress(['::/24', '127.0.0.1']), '127.0.0.1');
    inputs.ip_version = '4?';
    ASSERT_EQ(outputAddress([]), '');
    ASSERT_EQ(outputAddress(['127.0.0.1/8']), '127.0.0.1');
    ASSERT_EQ(outputAddress(['::']), '::');
    ASSERT_EQ(outputAddress(['127.0.0.1', '::/24', '127.0.0.2']), '127.0.0.1');
    ASSERT_EQ(outputAddress(['::/24', '127.0.0.1']), '127.0.0.1');

    inputs.ip = ['192.168.1.1'];
    ASSERT_TRUE(checkSelfAddresses(['192.168.1.1']));
    ASSERT_FALSE(checkSelfAddresses(['192.168.1.2']));
    ASSERT_TRUE(checkSelfAddresses(['192.168.1.2', '192.168.1.1']));

    inputs.ip = ['192.168.1.1', '10.0.0.10'];
    ASSERT_FALSE(checkSelfAddresses(['10.0.0.10']));
    ASSERT_FALSE(checkSelfAddresses(['192.168.1.1']));
    ASSERT_TRUE(checkSelfAddresses(['10.0.0.10', '192.168.1.2', '192.168.1.1']));
}
