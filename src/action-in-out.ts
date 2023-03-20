
import * as core from '@actions/core';


const WAIT_INTERVAL = 3000;


export interface Inputs {
    auth_token: string;
    api_url: string;
    ip: string[];
    name: string;
    description: string;
    tags: string[];
    capabilities: string[];
    wait_for: string;
    timeout: number;
    timeout_fatal: boolean;
    ip_version: string;
};


export interface Outputs {
    ip: string;
    wait_for_addresses: string[];
    timeout: boolean;
};


export let inputs: Inputs;
export let outputs: Outputs;
let startTime: number;


function explode(str: string): string[] {
    let result = str.trim().split(/[\s\r\n]+/g);
    if (result.length == 1 && result[0] == '') {
        return [];
    }
    return result;
}


export function prepareInputsOutputs() {

    startTime = Date.now();

    inputs = {
        auth_token: core.getInput('auth_token'),
        api_url: core.getInput('api_url'),
        ip: explode(core.getInput('ip')),
        name: core.getInput('name'),
        description: core.getInput('description'),
        tags: explode(core.getInput('tags')),
        capabilities: explode(core.getInput('capabilities')),
        wait_for: core.getInput('wait_for'),
        timeout: parseFloat(core.getInput('timeout')),
        timeout_fatal: !core.getInput('timeout').endsWith('?'),
        ip_version: core.getInput('ip_version'),
    };

    outputs = {
        ip: '',
        wait_for_addresses: [],
        timeout: false,
    }
}


export function writeOutputs() {

    core.setOutput('ip', outputs.ip);
    core.setOutput('wait_for_addresses', outputs.wait_for_addresses.join(' '));
    core.setOutput('timeout', outputs.timeout ? 'true' : 'false');
    console.log('Outputs:', JSON.stringify(outputs, null, 4));

}


export function isTimeout(): boolean {
    if (inputs.timeout > 0) {
        let time = (Date.now() - startTime) / 1000;
        if (time > inputs.timeout) {
            outputs.timeout = true;
            if (inputs.timeout_fatal) {
                throw new Error('Timeout');
            }
            return true;
        }
    }
    return false;
}


export async function waitInterval() {
    return new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL));
}
