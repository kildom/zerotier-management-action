
import * as a from '../src/selectors';
import * as b from '../src/address';
import * as c from '../src/zt-cli';
import * as d from '../src/zt-api';

async function main() {
    a.test();
    b.test();
    c.test();
    await d.test();
    console.log('OK');
}

main();
