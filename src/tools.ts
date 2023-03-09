
import * as fs from 'fs';


function assignedAddresses() {
    let input = fs.readFileSync(process.stdin.fd, 'latin1');
    let assigned = false;
    for (let network of JSON.parse(input)) {
        assigned = assigned || network.assignedAddresses.length > 0;
    }
    process.exitCode = assigned ? 0 : 1;
}

function showIp() {
    let input = fs.readFileSync(process.stdin.fd, 'latin1');
    let ip = '';
    for (let network of JSON.parse(input)) {
        for (let mask of network.assignedAddresses) {
            ip = mask.trim();
            let pos = ip.indexOf('/');
            if (pos > 0) {
                ip = ip.substring(0, pos).trim();;
            }
        }
    }
    if (ip !== '') {
        console.log(ip);
        process.exitCode = 0;
    } else {
        process.exitCode = 1;
    }
}

process.exitCode = 99;

switch(process.argv[2]) {
    case 'assigned':
        assignedAddresses();
        break;
    case 'ip':
        showIp();
        break;
}
