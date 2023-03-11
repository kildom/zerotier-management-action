
import * as fs from 'fs';
import * as core from '@actions/core';
import { request } from 'https';
import { IncomingMessage } from 'http';
import { execFileSync } from 'child_process';
import { parseSelectors } from './selectors';


const WAIT_INTERVAL = 3000;


function explode(str: string): string[] {
    let result = str.trim().split(/[\s\r\n]+/g);
    if (result.length == 1 && result[0] == '') {
        return [];
    }
    return result;
}

let outputs = {
    ip: '',
    wait_for_addresses: '',
    timeout: 'false',
};

let inputs = {
    auth_token: core.getInput('auth_token'),
    api_url: core.getInput('api_url'),
    ip: explode(core.getInput('ip')),
    name: core.getInput('name'),
    description: core.getInput('description'),
    tags: explode(core.getInput('tags')),
    capabilities: explode(core.getInput('capabilities')),
    wait_for: core.getInput('wait_for'),
    timeout: core.getInput('timeout'),
    ip_version: explode(core.getInput('ip_version')),
};

let cli: { file: string, args: string[] } | null = null;

let startTime = Date.now();

function isTimeout(): boolean {
    if (inputs.timeout) {
        let time = (Date.now() - startTime) / 1000;
        let timeout = parseFloat(inputs.timeout);
        if (time > timeout) {
            outputs.timeout = 'true';
            if (!inputs.timeout.endsWith('?')) {
                throw new Error('Timeout');
            }
            return true;
        }
    }
    return false;
}

function prepareCLI() {
    if (cli !== null) {
        return;
    } else if (process.platform !== 'win32') {
        cli = { file: 'sudo', args: ['zerotier-cli'] };
    } else {
        let tryPaths = [
            process.env['ProgramFiles'] + '\\ZeroTier\\One\\',
            process.env['ProgramData'] + '\\ZeroTier\\One\\',
            process.env['ProgramFiles(x86)'] + '\\ZeroTier\\One\\',
            '',
        ];
        for (let path of tryPaths) {
            let file = 'cmd.exe';
            let args = ['/c', `${path}zerotier-cli.bat`];
            try {
                execFileSync(file, [...args, '--version']);
                cli = { file, args };
            } catch (err) { }
        }
        throw new Error('Cannot execute zerotier-cli.bat');
    }
    try {
        execFileSync(cli.file, [...cli.args, '-j', 'status']);
    } catch (err) {
        throw new Error('Cannot execute zerotier-cli');
    }
}


let apiURL = '';
let apiHeaders = {};

function prepareAPI() {
    if (apiURL === '') {
        apiURL = inputs.api_url;
        if (!apiURL.endsWith('/')) {
            apiURL += '/';
        }
        apiHeaders = {
            'Authorization': `token ${inputs.auth_token}`
        };
    }
}

async function execAPI(method: 'GET' | 'POST' | 'DELETE', path: string, body?: any) {
    prepareAPI();

    let resolve: any, reject: any;

    let promise = new Promise<IncomingMessage>((a, b) => { resolve = a; reject = b; });
    let req = request(apiURL + path, {
        method: method,
        headers: apiHeaders,
    }, (res) => { resolve(res); });
    req.on('error', reject);
    if (body) {
        req.write(JSON.stringify(body));
    }
    req.end();
    let res = await promise;

    let promise2 = new Promise<void>((a, b) => { resolve = a; reject = b; });
    let chunks: any[] = [];
    res.setEncoding('utf8');
    res.on('error', reject);
    res.on('end', resolve);
    res.on('data', chunk => {
        chunks.push(chunk);
    });
    await promise2;
    if (res.statusCode != 200) {
        throw new Error(`REST API HTTP status code: ${res.statusCode} ${res.statusMessage}`);
    }

    return JSON.parse(chunks.join(''));
}


function execCLI(...args: string[]): any {
    prepareCLI();
    let res = execFileSync(cli!.file, [...cli!.args, ...args], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
    });
    return JSON.parse(res);
}

interface NetworkMemberData {
    name?: string;
    description?: string;
    config?: {
        authorized?: boolean;
        capabilities?: number[];
        ipAssignments?: string[];
        tags?: [number, number][];
    }
}

function outputAddress(list: string[], ipVersion?: string[], inWaitList: boolean = false): string {
    list = (list || []).map(address => address.split('/', 1)[0]);
    ipVersion = ipVersion || inputs.ip_version;
    let result = '';
    if (ipVersion[0] === 'list') {
        result = list.join(inWaitList ? ',' : ' ');
    } else {
        let ip = {};
        for (let addr of list) {
            if (addr.indexOf('.') >= 0 && ip['4'] === undefined) {
                ip['4'] = addr;
            } else if (ip['6'] === undefined) {
                ip['6'] = addr;
            }
        }
        result = ip[ipVersion[0]] || ip[ipVersion[1]] || '';
    }
    if (result === '' && inWaitList) {
        result = '-';
    }
    return result;
}

function checkAddresses(list: string[]): boolean {
    list = (list || []).map(address => address.split('/', 1)[0]);
    if (inputs.ip) {
        for (let requested of inputs.ip) {
            if (!list.find(a => compareAddress(a, requested))) {
                return false;
            }
        }
        return true;
    } else {
        return outputAddress(list, undefined) !== '';
    }
}

let selectorFields = `
    nodeId
    name
    description
    capabilities
    identity
    address
    IPv4Address
    IPv6Address
    `.split(/\s+/s).map(x => x.trim()).filter(x => x);


let networks: { [key: string]: any }[];
let networkId: string;
let networkInfo: { [key: string]: any };
let status: { [key: string]: any }
let nodeId: string;

const LAST_SEEN_TIMEOUT = 5 * 60 * 1000;

async function waitForNodes() {

    let selectors = parseSelectors<{}>(inputs.wait_for, selectorFields);
    let startTime = Date.now();

    do {

        let list = await execAPI('GET', `network/${networkId}/member`);
        fs.writeFileSync('x.json', JSON.stringify(list, null, 2));
        let active: { [key: string]: any }[] = [];

        for (let node of list) {
            if (node.nodeId == nodeId) continue;
            if (!node.config?.authorized) continue;
            if (node.clock - node.lastOnline > LAST_SEEN_TIMEOUT) continue;

            let capabilities: string[] = [];
            for (let cap of node.config?.capabilities || []) {
                capabilities.push(cap.toString());
                for (let [name, id] of Object.entries(networkInfo?.capabilitiesByName || {})) {
                    if (id == cap) {
                        capabilities.push(name);
                    }
                }
            }

            let attr = {
                __node__: node,
                nodeId: node.nodeId || '',
                name: node.name || '',
                description: node.description || '',
                capabilities: capabilities.join(' '),
                identity: node.config.identity || '',
                address: outputAddress(node.config.ipAssignments),
                IPv4Address: outputAddress(node.config.ipAssignments, ['4']),
                IPv6Address: outputAddress(node.config.ipAssignments, ['6']),
            };

            for (let [id, value] of (node.config?.tags || {}) as [number, number | boolean][]) {
                if (value === false) continue;
                attr[`tag:${id}`] = value.toString();
                for (let [name, info] of Object.entries(networkInfo?.tagsByName || {}) as [string, any]) {
                    if (info?.id === id) {
                        attr[`tag:${name}`] = value.toString();
                        for (let [enumName, enumValue] of Object.entries(info?.enums || {}) as [string, number][]) {
                            if (enumValue === value) {
                                attr[`tagEnum:${id}`] = enumName;
                                attr[`tagEnum:${name}`] = enumName;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
            active.push(attr);
        }

        let matched: (null | { [key: string]: any })[] = selectors.map(() => null);
        for (let attr of active) {
            for (let i = 0; i < selectors.length; i++) {
                if (matched[i] === null && selectors[i](attr)) {
                    matched[i] = attr;
                    break;
                }
            }
        }

        if (matched.findIndex(attr => attr === null) < 0) {
            outputs.wait_for_addresses = matched
                .map(attr => outputAddress(attr!.__node__.config.ipAssignments, undefined, true))
                .join(' ');
            break;
        }

        if (isTimeout()) {
            break;
        }

        await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL));

    } while (true);
}

function readNetworks() {
    networks = execCLI('-j', 'listnetworks');
    if (networks.length == 0) {
        throw new Error('No networks found');
    }
    networkId = networks[0].id;
}

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


function compareAddress(a: string, b: string) {
    a = a.trim().toLowerCase();
    b = b.trim().toLowerCase();
    if (a === b) return true;
    a = expandIPv6Address(a);
    b = expandIPv6Address(b);
    return a === b;
}

async function mainAsync() {

    readNetworks();
    console.log('Network Id:', networkId);

    networkInfo = await execAPI('GET', `network/${networkId}`);
    console.log('Network name:', networkInfo.config?.name);

    status = execCLI('-j', 'status');
    nodeId = status.address;
    console.log('Node Id:', nodeId);

    let data: NetworkMemberData = {
        config: {
        }
    };

    if (inputs.ip.length) {
        data.config!.ipAssignments = inputs.ip;
    }

    if (inputs.name !== '') {
        data.name = inputs.name;
    }

    if (inputs.description !== '') {
        data.description = inputs.description;
    }

    if (inputs.capabilities.length) {
        data.config!.capabilities = [];
        for (let cap of inputs.capabilities) {
            let capInt: number;
            if (networkInfo.capabilitiesByName && networkInfo.capabilitiesByName[cap] !== undefined) {
                capInt = networkInfo.capabilitiesByName[cap];
            } else {
                capInt = parseInt(cap);
            }
            data.config!.capabilities.push(capInt);
        }
    }

    if (inputs.tags.length) {
        data.config!.tags = [];
        let tagsPairs: [string, string][] = inputs.tags.map(tag => tag.split('=', 2) as [string, string]);
        for (let [key, value] of tagsPairs) {
            let keyInt: number;
            let valueInt: number;
            if (networkInfo.tagsByName && networkInfo.tagsByName[key] !== undefined) {
                let tagInfo = networkInfo.tagsByName[key];
                keyInt = tagInfo.id;
                if (tagInfo.enums && tagInfo.enums[value] !== undefined) {
                    valueInt = tagInfo.enums[value];
                } else {
                    valueInt = parseInt(value);
                }
            } else {
                keyInt = parseInt(key);
                valueInt = parseInt(value);
            }
            data.config!.tags.push([keyInt, valueInt]);
        }
    }

    if (Object.keys(data!.config as {}).length == 0) {
        delete data!.config;
    }

    if (Object.keys(data).length > 0) {
        console.log('New configuration:', JSON.stringify(data, null, 4));
        await execAPI('POST', `network/${networkId}/member/${nodeId}`, data);
    }

    for (let [name, info] of Object.entries(networkInfo.tagsByName) as [string, any][]) {
        selectorFields.push(`tag:${name}`);
        selectorFields.push(`tag:${info.id}`);
        selectorFields.push(`tagEnum:${name}`);
        selectorFields.push(`tagEnum:${info.id}`);
    }

    if (inputs.wait_for) {
        await waitForNodes();
    }

    do {
        readNetworks();
        if (checkAddresses(networks[0].assignedAddresses) || isTimeout()) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL));
    } while (true);

    do {
        let thisNode = await execAPI('GET', `network/${networkId}/member/${nodeId}`);
        if (checkAddresses(thisNode.config?.ipAssignments) || isTimeout()) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL));
    } while (true);

    if (networks[0].assignedAddresses) {
        outputs.ip = outputAddress(networks[0].assignedAddresses);
    }

    for (let outputName in outputs) {
        core.setOutput(outputName, outputs[outputName]);
    }

    console.log('Outputs:', JSON.stringify(outputs, null, 4));
}


export function main() {
    mainAsync()
        .catch(err => core.setFailed(err.message));
}

main();
