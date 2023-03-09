/*
Message flow:

    Web page                          Worker
        |                               |
        |  ---- REQUEST generate ---->  |
        |                               |
        |  <---- RESPONSE vanity -----  |
        |             ...               |  (zero or more)
        |  <---- RESPONSE vanity -----  |
        |                               |
        |  <--- RESPONSE generated ---  |
        |             (or)              |
        |  <----- RESPONSE error -----  |

REQUEST generate            Request a new identity
{
    type: 'generate',       Request type
    token?: any,            Any data that can be used to identify the request
    vanity?: string,        Vanity parameter, see "zerotier-idtool -h". If undefined, do not use vanity matching.
                            If empty string, never stop generating identities, callback is responsible for stopping it.
    vanityCallback?: SerializedFunction<VanityCallbackType>,
                            Callback function that will be called each time
                            generated identity does not match "vanity" parameter.

}

type VanityCallbackType = (
    counter: number,        Generated identity counter that starts at 0 and counts up for each new identity
    address: string,        10-character hex string containing address of newly generated identity
    bits: number,           number of bits from be beginning of address that must match the "vanity" parameter
    expected: string,       10-character hex string containing expected "vanity" parameter
) => boolean                If callback returns "true" search of identity will be stopped and current identity
                            will be used.

RESPONSE generated          Returns newly generated identity
{
    type: 'generated',      Response type
    token: any,             Any data that can be used to identify the request
    address: string,        10-character hex string containing node address
    public: string,         Public key
    private: string,        Private key
}

RESPONSE error              Returns error if identity generation failed
{
    type: 'error',          Response type
    token: any,             Any data that can be used to identify the request
    message: string,        Error message
}

RESPONSE vanity             Information about vanity matching progress
{
    type: 'vanity',         Response type
    token: any,             Any data that can be used to identify the request
    counter: number,        See VanityCallbackType
    address: string,        See VanityCallbackType
    bits: number,           See VanityCallbackType
    expected: string,       See VanityCallbackType
}

*/


class ZerotierIdentity {

    constructor(source) {
        this.enc = new TextEncoder();
        this.dec = new TextDecoder();
        this.mod = null;
        this.memory = null;
        this.error = null;
        this.waitingPromises = [];
        let promise;
        let importObject = {
            env: {
                getVanity: (...args) => this.getVanity(...args),
                updateVanity: (...args) => this.updateVanity(...args),
                setPrivate: (...args) => this.setPrivate(...args),
                setPublic: (...args) => this.setPublic(...args),
                getRandom: (...args) => this.getRandom(...args),
            }
        };
        if ((source instanceof ArrayBuffer) || (source instanceof Uint8Array)) {
            promise = WebAssembly.instantiate(source, importObject);
        } else {
            promise = WebAssembly.instantiateStreaming(source, importObject);
        }
        promise
            .then(({ instance, module }) => {
                this.mod = instance;
                this.memory = instance.exports.memory;
                this.mod.exports._initialize();
                for (let p of this.waitingPromises) {
                    p[0]();
                }
            })
            .catch(err => {
                this.error = err;
                for (let p of this.waitingPromises) {
                    p[1](err);
                }
            })
    }

    async generate(vanity) {
        this.vanity = vanity;
        if (this.error !== null) {
            throw this.error;
        }
        if (this.mod === null) {
            await new Promise((resolve, reject) => this.waitingPromises.push([resolve, reject]));
        }
        this.mod.exports.main();
    }

    getVanity() {
        if (this.vanity !== undefined) {
            let buf = new Uint8Array(this.memory.buffer, 4, 1024 - 4);
            let { read, written } = this.enc.encodeInto(this.vanity, buf);
            buf[written] = 0;
            return 4;
        } else {
            return 0;
        }
    }

    addressToString(address) {
        address = address.toString(16);
        return '0'.repeat(10 - address.length) + address;
    }

    updateVanity(counter, address, bits, expected) {
        if (this.onVanityUpdate) {
            address = this.addressToString(address);
            expected = this.addressToString(expected);
            return this.onVanityUpdate(counter, address, bits, expected) ? 1 : 0;
        }
        return 0;
    }

    setPrivate(address, value_ptr, length) {
        this.private = this.decodeKey(address, value_ptr, length);
    }

    setPublic(address, value_ptr, length) {
        this.public = this.decodeKey(address, value_ptr, length);
    }

    getRandom(buf_ptr, bytes) {
        crypto.getRandomValues(new Uint8Array(this.memory.buffer, buf_ptr, bytes));
    }

    decodeKey(address, value_ptr, length) {
        let value = this.dec.decode(new Uint8Array(this.memory.buffer, value_ptr, length));
        this.address = this.addressToString(address);
        return value;
    }
}


let functionCache = new Map();

function functionFromMessage(data) {
    let thisObject = data.thisObject || {};
    let key = data.args.join(',') + '=>' + data.body;
    let func;
    if (functionCache.has(key)) {
        func = functionCache.get(key);
    } else {
        func = new Function(...data.args, data.body);
        functionCache.set(key, func);
    }
    thisObject.__func__ = func;
    return (...args) => thisObject.__func__(...args);
}


let token = null;
let id = new ZerotierIdentity(fetch('zerotier-idtool.wasm'));
let vanityCallback = null;

id.onVanityUpdate = (counter, address, bits, expected) => {
    if (vanityCallback !== null) {
        if (vanityCallback(counter, address, bits, expected)) {
            return true;
        }
    }
    postMessage({
        type: 'vanity',
        token: token,
        counter, address, bits, expected,
    });
};


onmessage = async function (e) {
    let data = e.data;
    if (data.type == 'generate') {
        token = data.token;
        if (data.vanityCallback) {
            vanityCallback = functionFromMessage(data.vanityCallback);
        } else {
            vanityCallback = null;
        }
        try {
            await id.generate(data.vanity);
            postMessage({
                type: 'generated',
                token: token,
                address: id.address,
                public: id.public,
                private: id.private,
            });
        } catch (err) {
            console.error(err);
            postMessage({
                type: 'error',
                token: token,
                message: err.toString(),
            });
        }
    }
}

