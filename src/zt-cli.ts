
import { execFileSync } from 'child_process';


let file: string = '';
let args: string[] = [];


function prepareCLI() {
    if (file !== '') {
        return;
    } else if (process.platform !== 'win32') {
        file = 'sudo';
        args = ['zerotier-cli'];
    } else {
        let tryPaths = [
            process.env['ProgramFiles'] + '\\ZeroTier\\One\\',
            process.env['ProgramData'] + '\\ZeroTier\\One\\',
            process.env['ProgramFiles(x86)'] + '\\ZeroTier\\One\\',
            '',
        ];
        for (let path of tryPaths) {
            let tryFile = 'cmd.exe';
            let tryArgs = ['/c', `${path}zerotier-cli.bat`];
            try {
                execFileSync(tryFile, [...tryArgs, '--version']);
                file = tryFile;
                args = tryArgs;
                break;
            } catch (err) { }
        }
    }
    try {
        execFileSync(file, [...args, '-j', 'status']);
    } catch (err) {
        throw new Error('Cannot execute zerotier-cli');
    }
}


export function execCLI(...args: string[]): any {
    prepareCLI();
    let res = execFileSync(file, [...args, ...args], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
    });
    return JSON.parse(res);
}
