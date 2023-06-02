
import * as fs from 'fs';

let f = fs.readFileSync('action.yml', 'utf-8').split(/\r?\n(?:\s*\r?\n)?/g);

let text:string[] = [
    '- uses: kildom/zerotier-management-action',
    '  id: zerotier',
    '  with:'
];

interface Field {
    name: string;
    def: string;
    desc: string[];
    sample: string;
};

let inputs:Field[] = [];
let outputs:Field[] = [];
let current:Field[] = inputs;
let field:Field|undefined;

for (let line of f) {
    if (line == 'inputs:') {
        current = inputs;
    } else if (line == 'outputs:') {
        current = outputs;
    } else if (!line.startsWith(' ')) {
        current = [];
    } else if (line.startsWith('      ')) {
        field!.desc.push(line.trim());
    } else if (line.startsWith('    default:')) {
        let def = line.substring(12).trim();
        try {
            def = JSON.parse(def);
        } catch (e) {
            try {
                def = eval(def);
            } catch (e) {
            }
        }
        field!.def = def;
    } else if (line.startsWith('    # Sample value: ')) {
        field!.sample = line.substring(20).trim();
    } else if (line.startsWith('    ')) {
        // ignore
    } else if (line.startsWith('  ')) {
        field = {
            name: line.trim().replace(':', ''),
            def: '',
            desc: [],
            sample: '',
        };
        current.push(field);
    }
}

console.log(inputs);
console.log(outputs);

for (let field of inputs) {
    text.push(...field.desc.map(line => `    # ${line}`));
    if (field.def !== '') {
        text.push(`    # Default: ${field.def}`);
    }
    text.push(`    ${field.name}:` + (field.sample != '' ? ` ${field.sample}` : ''));
    text.push('');
}

text.push('- run: |');
text.push('');


for (let field of outputs) {
    text.push(...field.desc.map(line => `    # ${line}`));
    text.push(`    echo \${{ steps.zerotier.outputs.${field.name} }}`);
    text.push('');
}


fs.writeFileSync('usage.yaml', text.join('\n'));
