
type Selector<T> = (node: T) => boolean;

const END_OF_QUERY = 'end of query';


function escapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


class Tokenizer {
    private index: number;
    private tokens: string[];

    public constructor(text: string, public fields: string[]) {
        this.index = 0;
        this.tokenize(text);
    }

    private tokenize(text: string) {
        text = text.trim();
        let endOfCondition = new RegExp(`"\\s*$|"\\s+(?:"(?:${this.fields.map(x => escapeRegExp(x)).join('|')})#?[!=~\\$\\^\\*\\/]=|\\|(?:OR|AND|NOT|BEGIN|END)\\|)`);
        this.tokens = [];
        while (text !== '') {
            let token: string;
            if (text[0] == '"') {
                let m = endOfCondition.exec(text);
                if (!m) {
                    throw new Error(`Query syntax error: unterminated condition near: ${text}`);
                }
                token = text.substring(0, m.index + 1).trim();
                text = text.substring(m.index + 1).trim();
            } else if (text[0] == '|') {
                text = text.substring(1);
                let index = text.indexOf('|');
                token = text.substring(0, index);
                text = text.substring(index + 1).trim();
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


function parseOr<T>(tokenizer: Tokenizer): Selector<T> {
    let a = parseAnd<T>(tokenizer);
    if (tokenizer.match('OR')) {
        let b = parseOr<T>(tokenizer);
        return (n: T) => { return a(n) || b(n); };
    } else {
        return a;
    }
}


function parseAnd<T>(tokenizer: Tokenizer): Selector<T> {
    let a = parseLeaf<T>(tokenizer);
    if (tokenizer.match('AND')) {
        let b = parseAnd<T>(tokenizer);
        return (n: T) => { return a(n) && b(n); };
    } else {
        return a;
    }
}


function parseLeaf<T>(tokenizer: Tokenizer): Selector<T> {
    if (tokenizer.match('NOT')) {
        let x = parseLeaf<T>(tokenizer);
        return (n: T) => { return !x(n); };
    } if (tokenizer.match('BEGIN')) {
        let x = parseOr<T>(tokenizer);
        if (!tokenizer.match('END')) {
            throw new Error(`Query syntax error: expecting |END| near: ${tokenizer.peek()}`);
        }
        return x;
    } else {
        let token = tokenizer.get();
        token = token.substring(1, token.length - 1).trimStart();
        let m = token.match(/^(.*?)(#?[!=~\$\^\*\/])=([\S\s]*)$/);
        if (m === null) {
            throw new Error(`Query syntax error: invalid condition near: ${token}`);
        }
        let [_, field, condition, value] = m;
        if (tokenizer.fields.indexOf(field) < 0) {
            throw new Error(`Query syntax error: unknown field: ${field}`);
        }
        return (n: T) => { return matchCondition<T>(n, field, condition, value); };
    }
}


function matchCondition<T>(node: T, field: string, condition: string, value: string): boolean {
    let escapedValue = escapeRegExp(value);
    let flags = condition.startsWith('#') ? 's' : 'si';
    let re: RegExp;
    switch (condition.replace('#', '')) {
        case '=':
            re = new RegExp('^' + escapedValue + '$', flags);
            break;
        case '!':
            re = new RegExp('^(?!' + escapedValue + '$)', flags);
            break;
        case '~':
            re = new RegExp('(^|[\\s\\r\\n])' + escapedValue + '([\\s\\r\\n]|$)', flags);
            break;
        case '$':
            re = new RegExp(escapedValue + '$', flags);
            break;
        case '^':
            re = new RegExp('^' + escapedValue, flags);
            break;
        case '*':
            re = new RegExp(escapedValue, flags);
            break;
        case '/':
            re = new RegExp(value, flags);
            break;
        default:
            throw new Error();
    }
    return re.test(node[field] || '');
}


export function parseSelectors<T>(text: string, fields: string[]) {
    let tokenizer = new Tokenizer(text, fields);
    let selectors: Selector<T>[] = [];
    while (!tokenizer.match(END_OF_QUERY)) {
        let selector = parseOr<T>(tokenizer);
        selectors.push(selector);
    }
    return selectors;
}

