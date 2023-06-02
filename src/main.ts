
import * as core from '@actions/core';
import { inputs, isTimeout, outputs, prepareInputsOutputs, waitInterval, writeOutputs } from './action-in-out';
import { checkSelfAddresses, outputAddress } from './address';
import { compileSelectors } from './selectors';
import { execAPI } from './zt-api';
import { execCLI } from './zt-cli';


const LAST_SEEN_TIMEOUT = 5 * 60 * 1000;


interface NodeAPIDataOutput {
    name?: string;
    description?: string;
    config?: {
        capabilities?: number[];
        ipAssignments?: string[];
        tags?: [number, number][];
    }
};

interface NetworkCLIData {
    id: string;
    assignedAddresses?: string[];
};

interface NetworkAPIData {
    capabilitiesByName?: { [key: string]: number } | null;
    tagsByName?: { [key: string]: any } | null; //TODO: check this
    config: {
        name?: string | null;
    };
};

interface NodeCLIStatus {
    address: string;
};

interface NodeAPIData {
    nodeId?: string | null;
    name?: string | null;
    description?: string | null;
    clock?: number | null;
    lastOnline?: number | null;
    config?: {
        authorized?: boolean | null;
        ipAssignments?: string[] | null;
        capabilities?: number[] | null;
        tags: [number, number | false][];
        identity?: string | null;
    }
};

interface NodeAttrs {
    nodeId: string;
    name: string;
    description: string;
    capabilities: string;
    identity: string;
    address: string;
    IPv4Address: string;
    IPv6Address: string;
    [key:string]: string;
};

const selectorAttrs = `
    name
    nodeId
    description
    capabilities
    identity
    address
    IPv4Address
    IPv6Address
    `.split(/\s+/s).map(x => x.trim()).filter(x => x);


let networks: NetworkCLIData[];
let networkId: string;
let networkInfo: NetworkAPIData;
let nodeId: string;


async function waitForNodes() {

    // Return if we don't have to wait for anyone
    if (!inputs.wait_for) {
        return;
    }

    // Extend list of attribute names by tags defined in current network
    let attrNames = [...selectorAttrs];
    for (let [name, info] of Object.entries(networkInfo.tagsByName || {}) as [string, any][]) {
        attrNames.push(`tag:${name}`);
        attrNames.push(`tag:${info.id}`);
        attrNames.push(`tagEnum:${name}`);
        attrNames.push(`tagEnum:${info.id}`);
    }

    // Compile expressions in `wait_for` input
    let selectors = compileSelectors<{}>(inputs.wait_for, attrNames);

    do {
        // Get current network members
        let list = await execAPI('GET', `network/${networkId}/member`) as NodeAPIData[];

        // Generate list of active members which means that they are authorized, on-line and have required IP address
        let active: NodeAttrs[] = [];
        for (let node of list) {

            // Skip inactive nodes and self node
            if (node.nodeId === nodeId) continue;
            if (!node.config?.authorized) continue;
            if ((node.clock || Date.now()) - (node.lastOnline || 0) > LAST_SEEN_TIMEOUT) continue;
            let address = outputAddress(node.config.ipAssignments);
            if (address === '') continue;

            // Prepare string containing list of capabilities
            let capabilities: string[] = [];
            for (let cap of node.config?.capabilities || []) {
                capabilities.push(cap.toString());
                for (let [name, id] of Object.entries(networkInfo?.capabilitiesByName || {})) {
                    if (id == cap) {
                        capabilities.push(name);
                    }
                }
            }

            // Copy node data to attributes that will be passed to selectors
            let attr: NodeAttrs = {
                nodeId: node.nodeId || '',
                name: node.name || '',
                description: node.description || '',
                capabilities: capabilities.join(' '),
                identity: node.config.identity || '',
                address: address,
                IPv4Address: outputAddress(node.config.ipAssignments, '4'),
                IPv6Address: outputAddress(node.config.ipAssignments, '6'),
            };

            // Extend attributes by tags using names defined in the current network
            for (let [id, value] of (node.config?.tags || []) as [number, number | boolean][]) {
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

            // Add node attributes to list of active nodes
            active.push(attr);
        }

        // Create array containing matching node's attributes or null for each expression
        let matched: (NodeAttrs | null)[] = selectors.map(() => null);
        for (let attr of active) {
            for (let i = 0; i < selectors.length; i++) {
                if (matched[i] === null && selectors[i]!(attr)) {
                    matched[i] = attr;
                    break;
                }
            }
        }

        if (inputs.wait_for_unavailable) {
            // If all are null, then all expressions are not fulfilled - returns
            if (matched.every(attr => attr === null)) {
                break;
            }
        } else {
            // If we cannot find null, then all expressions are fulfilled - outputs IP addresses
            if (matched.findIndex(attr => attr === null) < 0) {
                outputs.wait_for_addresses = matched.map(attr => attr!.address);
                break;
            }
        }

        // Check timeout before sleeping
        if (isTimeout()) {
            break;
        }

        // Sleep before next retry
        await waitInterval();

    } while (true);
}


function readNetworks() {
    networks = execCLI('-j', 'listnetworks');
    if (networks.length == 0) {
        throw new Error('No networks found');
    }
    networkId = networks[0]!.id;
}


async function readGeneralInfo() {

    readNetworks();
    console.log('Network Id:', networkId);

    let status = execCLI('-j', 'status') as NodeCLIStatus;
    nodeId = status.address;
    console.log('Node Id:', nodeId);

    networkInfo = await execAPI('GET', `network/${networkId}`);
    console.log('Network name:', networkInfo.config?.name);
}


async function writeNodeData() {

    let data: NodeAPIDataOutput = {
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
                capInt = networkInfo.capabilitiesByName[cap] as number;
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

    if (Object.keys(data!.config as {}).length > 0 || Object.keys(data).length > 0) {
        console.log('New configuration:', JSON.stringify(data, null, 4));
        await execAPI('POST', `network/${networkId}/member/${nodeId}`, data);
    }
}


async function waitForAddressAssignment() {
    do {
        readNetworks();
        if (checkSelfAddresses(networks[0]?.assignedAddresses) || isTimeout()) {
            break;
        }
        await waitInterval();
    } while (true);

    do {
        let thisNode = await execAPI('GET', `network/${networkId}/member/${nodeId}`);
        if (checkSelfAddresses(thisNode.config?.ipAssignments) || isTimeout()) {
            break;
        }
        await waitInterval();
    } while (true);

    if (networks[0]?.assignedAddresses) {
        outputs.ip = outputAddress(networks[0].assignedAddresses);
    }
}


async function mainAsync() {
    prepareInputsOutputs();
    await readGeneralInfo();
    await writeNodeData();
    await waitForNodes();
    await waitForAddressAssignment();
    writeOutputs();
}


export function main() {
    mainAsync()
        .catch(err => core.setFailed(err.message));
}


main();
