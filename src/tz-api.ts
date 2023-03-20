import { IncomingMessage } from "http";
import { request } from "https";
import { inputs } from "./action-in-out";


export async function execAPI(method: 'GET' | 'POST' | 'DELETE', path: string, body?: any) {
    
    let apiURL = inputs.api_url;
    if (!apiURL.endsWith('/')) {
        apiURL += '/';
    }
    let apiHeaders = {
        'Authorization': `token ${inputs.auth_token}`
    };

    let resolve: any, reject: any;

    let promise = new Promise<IncomingMessage>((a, b) => { resolve = a; reject = b; });
    let req = request(apiURL + path, {
        method: method,
        headers: apiHeaders,
    }, (res) => { resolve(res); });
    req.on('error', reject);
    if (body) {
        req.write(JSON.stringify(body));
    }
    req.end();
    let res = await promise;

    let promise2 = new Promise<void>((a, b) => { resolve = a; reject = b; });
    let chunks: any[] = [];
    res.setEncoding('utf8');
    res.on('error', reject);
    res.on('end', resolve);
    res.on('data', chunk => {
        chunks.push(chunk);
    });
    await promise2;
    if (res.statusCode != 200) {
        throw new Error(`REST API HTTP status code: ${res.statusCode} ${res.statusMessage}`);
    }

    return JSON.parse(chunks.join(''));
}
