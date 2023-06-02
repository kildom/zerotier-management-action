import { IncomingMessage } from "http";
import { request } from "https";
import { inputs } from "./action-in-out";
import { ASSERT_EQ } from "../tests/asserts";

const RETRY_COUNT = 5;


export async function execAPI(method: 'GET' | 'POST' | 'DELETE', path: string, body?: any) {

    let apiURL = inputs.api_url;
    if (!apiURL.endsWith('/')) {
        apiURL += '/';
    }
    let apiHeaders = {
        'Authorization': `token ${inputs.auth_token}`
    };
    let retryCounter = 0;

    let resolve: any, reject: any;

    while (true) {
        try {
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
        } catch (e) {
            if (retryCounter >= RETRY_COUNT) {
                throw e;
            }
            let waitTime = Math.round(3000 * Math.pow(1.6, retryCounter));
            console.log(`API error, retrying after ${waitTime}ms: `, e);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCounter++;
        }
    };
}


//---------------------------------------------------------------------------------------
//---------------------------------------- TESTS ----------------------------------------
//---------------------------------------------------------------------------------------


export async function test() {
    inputs.api_url = 'https://my.zerotier.com/api/v1';
    inputs.auth_token = process.env.INPUT_AUTH_TOKEN as string;
    let res = await execAPI('GET', `randomToken`);
    ASSERT_EQ(res.token.length, 32);
}
