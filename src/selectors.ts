
import { ASSERT_EQ, ASSERT_TRUE, ASSERT_FALSE } from '../tests/asserts';

type Selector<T> = (node: T) => boolean;
type Attrs = { [key: string]: string };

const END_OF_QUERY = '`_end_Of-query_`';


function escapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


class Tokenizer {
    private index: number;
    private tokens: string[];

    public constructor(text: string, public fields: string[]) {
        this.index = 0;
        this.tokens = [];
        this.tokenize(text);
    }

    private tokenize(text: string) {
        text = text.trim();
        let endOfCondition = new RegExp(
            /\][\s\)]*(?:$|(?:OR|AND|\s)(?:\(|\s|(?<=[\s\(\)\[\]])NOT)*\[(?:<FIELDS>)[!=~\$\^\*\/]?=)/
                .source
                .replace('<FIELDS>', this.fields.map(x => escapeRegExp(x)).join('|')));
        while (text !== '') {
            let token: string;
            if (text[0] == '[') {
                let m = endOfCondition.exec(text);
                if (!m) {
                    throw new Error(`Query syntax error: unterminated condition near: ${text}`);
                }
                token = text.substring(0, m.index + 1).trim();
                text = text.substring(m.index + 1).trim();
            } else if (text.startsWith('AND') || text.startsWith('NOT')) {
                token = text.substring(0, 3);
                text = text.substring(3).trim();
            } else if (text.startsWith('OR')) {
                token = text.substring(0, 2);
                text = text.substring(2).trim();
            } else if (text.startsWith('(') || text.startsWith(')')) {
                token = text.substring(0, 1);
                text = text.substring(1).trim();
            } else {
                throw new Error();
            }
            this.tokens.push(token);
        }
    }

    public get(): string {
        return this.index >= this.tokens.length ? END_OF_QUERY : this.tokens[this.index++];
    }

    public peek(): string {
        return this.index >= this.tokens.length ? END_OF_QUERY : this.tokens[this.index];
    }

    public match(value: string): boolean {
        let token = this.index >= this.tokens.length ? END_OF_QUERY : this.tokens[this.index];
        if (token === value) {
            this.index++;
            return true;
        } else {
            return false;
        }
    }
}


function parseOr<T extends Attrs>(tokenizer: Tokenizer): Selector<T> {
    let a = parseAnd<T>(tokenizer);
    if (tokenizer.match('OR')) {
        let b = parseOr<T>(tokenizer);
        return (n: T) => { return a(n) || b(n); };
    } else {
        return a;
    }
}


function parseAnd<T extends Attrs>(tokenizer: Tokenizer): Selector<T> {
    let a = parseLeaf<T>(tokenizer);
    if (tokenizer.match('AND')) {
        let b = parseAnd<T>(tokenizer);
        return (n: T) => { return a(n) && b(n); };
    } else {
        return a;
    }
}


function parseLeaf<T extends Attrs>(tokenizer: Tokenizer): Selector<T> {
    if (tokenizer.match('NOT')) {
        let x = parseLeaf<T>(tokenizer);
        return (n: T) => { return !x(n); };
    } if (tokenizer.match('(')) {
        let x = parseOr<T>(tokenizer);
        if (!tokenizer.match(')')) {
            throw new Error(`Query syntax error: expecting ")" near: ${tokenizer.peek()}`);
        }
        return x;
    } else {
        let token = tokenizer.get();
        token = token.substring(1, token.length - 1).trimStart();
        let m = token.match(/^(.*?)([!=~\$\^\*\/]?)=([\S\s]*)$/);
        if (m === null) {
            throw new Error(`Query syntax error: invalid condition near: ${token}`);
        }
        let [_, field, condition, value] = m;
        if (tokenizer.fields.indexOf(field) < 0) {
            throw new Error(`Query syntax error: unknown field: ${field}`);
        }
        return createConditionRegExp(field, condition, value);
    }
}


function createConditionRegExp<T extends Attrs>(field: string, condition: string, value: string): Selector<T> {
    let escapedValue = escapeRegExp(value);
    let re: RegExp;
    switch (condition) {
        case '':
        case '=':
            re = new RegExp('^' + escapedValue + '$', 'si');
            break;
        case '!':
            re = new RegExp('^(?!' + escapedValue + '$)', 'si');
            break;
        case '~':
            re = new RegExp('(^|[\\s\\r\\n])' + escapedValue + '([\\s\\r\\n]|$)', 'si');
            break;
        case '$':
            re = new RegExp(escapedValue + '$', 'si');
            break;
        case '^':
            re = new RegExp('^' + escapedValue, 'si');
            break;
        case '*':
            re = new RegExp(escapedValue, 'si');
            break;
        case '/':
            re = new RegExp(value, 'si');
            break;
        default:
            throw new Error();
    }
    return (n: T) => { return re.test(n[field] || '') };
}


export function compileSelectors<T extends Attrs>(text: string, fields: string[]) {
    let tokenizer = new Tokenizer(text, fields);
    let selectors: Selector<T>[] = [];
    while (!tokenizer.match(END_OF_QUERY)) {
        let selector = parseOr<T>(tokenizer);
        selectors.push(selector);
    }
    return selectors;
}


//---------------------------------------------------------------------------------------
//---------------------------------------- TESTS ----------------------------------------
//---------------------------------------------------------------------------------------


function testTokenizer(input: string, tokens: string) {

    let items = tokens.split(',');

    let t = new Tokenizer(input, ['a', 'b', 'c']);
    for (let token of items) {
        //console.log('Token: ', token);
        ASSERT_EQ(t.peek(), token);
        ASSERT_EQ(t.get(), token);
    }
    //console.log('END');
    ASSERT_EQ(t.peek(), END_OF_QUERY);
    ASSERT_EQ(t.get(), END_OF_QUERY);

    t = new Tokenizer(input, ['a', 'b', 'c']);
    for (let token of items) {
        //console.log('Token: ', token);
        ASSERT_EQ(t.get(), token);
    }
    //console.log('END');
    ASSERT_EQ(t.get(), END_OF_QUERY);

    t = new Tokenizer(input, ['a', 'b', 'c']);
    for (let token of items) {
        //console.log('Token: ', token);
        ASSERT_FALSE(t.match(token + 'x'));
        ASSERT_TRUE(t.match(token));
    }
    //console.log('END');
    ASSERT_FALSE(t.match('x'));
    ASSERT_TRUE(t.match(END_OF_QUERY));
}

function testQuery(query: string, inputs: Attrs[], expected: boolean[][]) {
    let list = compileSelectors(query, ['a', 'b', 'c']);
    for (let i = 0; i < inputs.length; i++) {
        for (let k = 0; k < list.length; k++) {
            ASSERT_EQ(list[k](inputs[i]), expected[i][k]);
        }
    }
}

export function test() {
    testTokenizer('[a==12]', '[a==12]');
    testTokenizer('[a!=12] [b~=1.2.3.4]', '[a!=12],[b~=1.2.3.4]');
    testTokenizer('[a!=12] OR [b$=1.2.3.4]', '[a!=12],OR,[b$=1.2.3.4]');
    testTokenizer('([a!=12] OR NOT([b*=1.2.3.4] AND [c^=x]))', '(,[a!=12],OR,NOT,(,[b*=1.2.3.4],AND,[c^=x],),)');
    testTokenizer('[a!=12] NOT [b/=a.*z]', '[a!=12],NOT,[b/=a.*z]');
    testTokenizer('[a!=12] NOT AND [b~=1.2.3.4]', '[a!=12] NOT AND [b~=1.2.3.4]');
    testTokenizer('[a=[11] OR [c=99]]', '[a=[11],OR,[c=99]]');
    testTokenizer('[a==[11] OR [z==99]]', '[a==[11] OR [z==99]]');
    testQuery('[a==12]', [{ a: '12' }, { a: '123' }, { a: ' 12' }], [[true], [false], [false]]);
    testQuery('[a!=12]', [{ a: '12' }, { a: '123' }, { a: ' 12' }], [[false], [true], [true]]);
    testQuery('[a~=12]', [{ a: 'a 12' }, { a: '12 a' }, { a: ' 12' }, { a: 'b 123 a' }], [[true], [true], [true], [false]]);
    testQuery('[a$=12]', [{ a: '12' }, { a: '123' }, { a: '012' }], [[true], [false], [true]]);
    testQuery('[a^=12]', [{ a: '' }, { a: '12' }, { a: '123' }, { a: '012' }], [[false], [true], [true], [false]]);
    testQuery('[a*=12]', [{ a: '12' }, { a: '123' }, { a: '0123' }, { a: '0132' }], [[true], [true], [true], [false]]);
    testQuery('[a/=1.2]', [{ a: '12' }, { a: '123' }, { a: '122' }], [[false], [false], [true]]);
    testQuery('[a==12] [b=x]', [{ a: '12' }, { a: '123', b: 'x' }, { a: ' 12', b: 'y' }], [[true, false], [false, true], [false, false]]);
    testQuery('[a==12] NOT[b==x]', [{ a: '12' }, { a: '123', b: 'x' }, { a: ' 12', b: 'y' }], [[true, true], [false, false], [false, true]]);
    testQuery('[a=1] OR [a==2]', [{ a: '0' }, { a: '1' }, { a: '2' }, { a: '3' }], [[false], [true], [true], [false]]);
    testQuery('[a==1] OR [a=2] [a=3]', [{ a: '0' }, { a: '1' }, { a: '2' }, { a: '3' }], [[false, false], [true, false], [true, false], [false, true]]);
    testQuery('[a*=1] AND [a*=2]', [{ a: '0' }, { a: '201' }, { a: '24' }, { a: '13' }], [[false], [true], [false], [false]]);
    testQuery('[a*=1] AND [a*=2] [a*=3]', [{ a: '0' }, { a: '201' }, { a: '24' }, { a: '13' }], [[false, false], [true, false], [false, false], [false, true]]);
    testQuery('[a*=1] AND NOT [a*=2]', [{ a: '0' }, { a: '201' }, { a: '24' }, { a: '13' }], [[false], [false], [false], [true]]);
    testQuery('[a*=1] AND NOT NOT [a*=2]', [{ a: '0' }, { a: '201' }, { a: '24' }, { a: '13' }], [[false], [true], [false], [false]]);
    testQuery('NOT [a*=2] AND [a*=1]', [{ a: '0' }, { a: '201' }, { a: '24' }, { a: '13' }], [[false], [false], [false], [true]]);
    testQuery('NOT([a==1] OR [a==2])', [{ a: '0' }, { a: '1' }, { a: '2' }, { a: '3' }], [[true], [false], [false], [true]]);
}
