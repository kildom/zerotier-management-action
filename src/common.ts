
import * as core from '@actions/core';
import { execFileSync } from 'child_process';
import * as process from 'process';

const inputs = [ 'network-id', 'identity' ];

export function main(suffix: string) {
    try {
        let shell: string, ext: string, os = process.platform;
        if (os == 'win32') {
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
        execFileSync(shell, [`${__dirname}/../scripts/${os}${suffix}${ext}`], {
            stdio: 'inherit',
            env: env,
            input: '',
        });
    } catch (err) {
        core.setFailed(err.message);
    }
}
