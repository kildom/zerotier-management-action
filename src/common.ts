
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import { execFileSync } from 'child_process';

const inputs = ['network-id', 'identity'];
const outputs = ['ip'];

export function main(suffix: string) {
    try {
        let shell: string, ext: string, platform = process.platform;
        if (platform == 'win32') {
            shell = 'cmd';
            ext = '.bat';
        } else {
            shell = 'bash';
            ext = '.sh';
        }
        let env = { ...process.env };
        for (let name of inputs) {
            let envName = 'INPUT_' + name.toUpperCase().replace(/[^a-z0-9_]/gi, '_');
            env[envName] = core.getInput(name);
        }
        let outputMap: { [key: string]: string } = {};
        for (let name of outputs) {
            let envName = 'OUTPUT_' + name.toUpperCase().replace(/[^a-z0-9_]/gi, '_');
            let fileName = `${os.tmpdir()}${path.delimiter}action-${envName}`
            env[envName] = fileName;
            outputMap[name] = fileName;
        }
        execFileSync(shell, [`${__dirname}/../scripts/${platform}${suffix}${ext}`], {
            stdio: 'inherit',
            env: env,
            input: '',
        });
        for (let [name, fileName] of Object.entries(outputMap)) {
            if (fs.existsSync(fileName)) {
                let value = fs.readFileSync(fileName, 'utf8');
                if (value.endsWith('\n')) {
                    value = value.substring(0, value.length - 1);
                }
                if (value.endsWith('\r')) {
                    value = value.substring(0, value.length - 1);
                }
                core.setOutput(name, value);
            }
        }
    } catch (err) {
        core.setFailed(err.message);
    }
}
