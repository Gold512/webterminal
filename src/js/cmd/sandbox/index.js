import { error } from "../../sys.js";

function createWorker(str) {
    var blob;
    try {
        blob = new Blob([str], {type: 'application/javascript'});
    } catch (e) { // Backwards-compatibility
        window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
        blob = new BlobBuilder();
        blob.append(str);
        blob = blob.getBlob();
    }
    var worker = new Worker(URL.createObjectURL(blob));
    return worker;
}

class Sandbox {
    constructor(callback = console.log) {
        this._env = new Worker('./src/js/cmd/sandbox/sandbox.js');
        this._env.addEventListener('message', ev => {
            const data = ev.data;
            callback(data);
        });

        this._env.addEventListener('error', err => {
            this._env.terminate();
            this._env = null;
            error(err.message)
        })
    }

    eval(str) {
        if(!this._env) throw new Error('cannot eval in non-existant enviroment')
        this._env.postMessage(str);
    }

    destroy() {
        if(!this._env) throw new Error('enviroment already destroyed')
        this._env.terminate();
    }
}

export function exec(str) {
    let resolve;
    let promise = new Promise(res => {
        resolve = res;
    });

    let sandbox = new Sandbox(result => {
        resolve(result);
        sandbox.destroy();
    });

    sandbox.eval(str);

    return promise;
}