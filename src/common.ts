
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import { execFileSync } from 'child_process';
import { parse } from 'yaml';

export function main(stage: string) {
    try {

        let platform = process.platform;
        let env = { ...process.env };

        let yaml = parse(fs.readFileSync(`${__dirname}/../action.yml`, 'utf-8'));
        let inputs = Object.keys(yaml.inputs);
        let outputs = Object.keys(yaml.outputs);

        for (let name of inputs) {
            let envName = 'INPUT_' + name.toUpperCase().replace(/[^a-z0-9_]/gi, '_');
            env[envName] = core.getInput(name);
        }

        let outputMap: { [key: string]: string } = {};
        for (let name of outputs) {
            let envName = 'OUTPUT_' + name.toUpperCase().replace(/[^a-z0-9_]/gi, '_');
            let fileName = `${os.tmpdir()}${path.sep}action-${envName}`
            env[envName] = fileName;
            outputMap[name] = fileName;
        }

        env['ACTION_PLATFORM'] = process.platform;
        env['ACTION_STAGE'] = stage;

        let tryExtensions = [
            ['sh', platform == 'darwin' ? 'zsh' : 'bash'],
            ['bash', 'bash'],
            ['zsh', 'zsh'],
            ['bat', 'cmd.exe'],
            ['cmd', 'cmd.exe'],
            ['ps', 'ps.exe'],
        ];
        let tryFiles = [
            `${stage}-${platform}`,
            `${stage}`,
            `all-${platform}`,
            `all`,
        ];

        let script: string | undefined;
        let shell: string | undefined;
        outerLoop:
        for (let name of tryFiles) {
            for (let ext of tryExtensions) {
                script = path.normalize(`${__dirname}/../scripts/${name}.${ext[0]}`);
                if (fs.existsSync(script)) {
                    shell = ext[1];
                    break outerLoop;
                }
            }
        }

        if (shell === undefined || script === undefined) {
            throw new Error('Cannot find any matching script');
        }

        execFileSync(shell, [script], {
            stdio: 'inherit',
            env: env,
            input: '',
        });

        for (let [name, fileName] of Object.entries(outputMap)) {
            if (fs.existsSync(fileName)) {
                let value = fs.readFileSync(fileName, 'utf8').trim();
                core.setOutput(name, value);
            }
        }

    } catch (err) {
        core.setFailed(err.message);
    }
}
