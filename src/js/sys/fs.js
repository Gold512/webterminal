// path syntax
// ~path/* - mounted directory, where the first folder is the name of the mounted directory
// /path/* - OPFS path
// ./path/* - relative path
// 		./../path/* - traversals are allowed

import { createStore, get, set, entries, del } from "../../lib/idb_keyval.js";
const fileStore = createStore('files', 'file-store');
const debug = false;

// API Declaration
class FS {
    /**
     * Get file handle 
     * @param {string} path 
     * @param {string[]} currentPath 
     * @returns {Promise<FileSystemFileHandle>}
     */
	async getFile(path, currentPath = ['opfs']) {
        const resolved = resolvePath(path, currentPath);
        let ptr = rootfs[resolved[0]];

        try { 
            for(let i = 1; i < resolved.length - 1; i++) {
                ptr = await ptr.getDirectoryHandle(resolved[i]);
            }

            ptr = ptr.getFileHandle(resolved[resolved.length - 1]);
        } catch(e) { throw new Error(`file '${path}' does not exist`) }

        return ptr;
	}

    /**
     * Get directory handle 
     * @param {string|string[]} path 
     * @param {string[]} currentPath 
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
	async getDirectory(path, currentPath = ['opfs']) {
        const resolved = Array.isArray(path) ? path : resolvePath(path, currentPath);
        let ptr = rootfs[resolved[0]];
        try { 
            for(let i = 1; i < resolved.length; i++) {
                ptr = await ptr.getDirectoryHandle(resolved[i]);
            }
        } catch(e) {
            if(e instanceof FSPermissionDeniedError) throw e;
            throw new Error(`directory '${path}' does not exist`);
        }

        return ptr;
	}

    stringifyPath(path) {
        const pathCipher = {'opfs':'/','mnt':'~'}
        const container = pathCipher[path[0]];
        return container + path.slice(1).join('/');
    }

    async mountDirectory() {
        await rootfs.mnt.mount();
    }

    resolvePath = resolvePath
}

class MountContainer {
    constructor() {
        // mount previously mounted files
        (async function() {
            const mounted = await entries(fileStore);
            for(let i = 0; i < mounted.length; i++) {
                const [key, value] = mounted[i];
                this.#directories[key] = value;
            }
        }).bind(this)()
    }

    #directories = {}
    #permissionRequestCache = new Set

    async mount() {
        const dirhandle = await getHandle();
        this.#directories[dirhandle.name] = dirhandle;
        this.#permissionRequestCache.add(dirhandle.name);
    }

    async dismount(name) {
        if(this.#directories.hasOwnProperty(name)) delete this.#directories[name];
        del(name, fileStore);
    }

    keys() {
        const dirs = this.#directories;
        return (async function*() {
            for(let i in dirs) yield i;
        })()
    }

    values() {
        const dirs = this.#directories;
        return (async function*() {
            for(let i in dirs) yield dirs[i];
        })()
    }

    entries() {
        const dirs = this.#directories;
        return (async function*() {
            for(let i in dirs) yield [i, dirs[i]];
        })()
    }

    getFileHandle() {
        throw new Error('mount container cannot have files')
    }

    async getDirectoryHandle(name) {
        if(!this.#directories.hasOwnProperty(name)) throw new Error('directory does not exist');
        if(!this.#permissionRequestCache.has(name)) {
            const status = await verifyPermission(this.#directories[name], true);
            if(status === false) throw new FSPermissionDeniedError(name);
        }
        return this.#directories[name]
    }
}

class FSPermissionDeniedError extends Error {
    constructor(fileName) {
        super(`permission denied: unable to access '~${fileName}'`);
    }
}

/**
 * 
 * @param {string[]} currentPath 
 * @param {string} path 
 * @returns {string[]}
 */
function resolvePath(path, currentPath = ['opfs']) {
    // determine path type
    // relative path
    const symCipher = {'~':'mnt','/':'opfs'}
    if(path.length === 1 && path in symCipher) return [symCipher[path]];

    switch(path[0]) {
        case '~': 
            return ['mnt'].concat(path.slice(1).split('/'));

        case '/': 
            return ['opfs'].concat(path.slice(1).split('/'));
    }

    currentPath = structuredClone(currentPath);
    // inherit container
    const container = currentPath.shift();
    const newPath = path.split('/');
    if(newPath[newPath.length - 1] === '') newPath.pop();

    for(let i = 0; i < newPath.length; i++) {
        if(newPath[i] === '..') {
            currentPath.pop();
        } else if(newPath[i] !== '.') {
            currentPath.push(newPath[i])
        }
    }

    if(currentPath.length === 0) return [container];
    
    return [container].concat(currentPath);
}


function createSymbolicLink(path) {

}

// external directory mounting will be handled internally and accessible only through paths
// name collisions will result in the older handle being lost as there is no way to differentiate between 
// them without writing identifiers into those directories

async function verifyPermission(fileHandle, withWrite) {
    const opts = {};
    if (withWrite) {
        opts.mode = "readwrite";
    }

    // Check if we already have permission, if so, return true.
    if ((await fileHandle.queryPermission(opts)) === "granted") {
        return true;
    }

    // Request permission to the file, if the user grants permission, return true.
    if ((await fileHandle.requestPermission(opts)) === "granted") {
        return true;
    }

    // The user did not grant permission, return false.
    return false;
}

/**
 * 
 * @param {string} [name] name of handle
 * @param {() => void} [log] callback which recieves output of function 
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
async function getHandle(name = null, log = () => {}) {
    try {
        const fileHandleOrUndefined = name === null ? undefined : await get(name, fileStore);    
        if (fileHandleOrUndefined) {
            log(`Retrieved file handle "${fileHandleOrUndefined.name}" from IndexedDB.`);
            
            let permission = await verifyPermission(fileHandleOrUndefined, true);
            if(!permission) {
                log('permission denied');
                return;
            }
            
            return fileHandleOrUndefined;
        }

        const folderHandle = await showDirectoryPicker();

        let permission = await verifyPermission(folderHandle, true);
        if(!permission) {
            log('permission denied');
            return;
        }

        await set(folderHandle.name, folderHandle, fileStore);    
        log(`Stored file handle for "${folderHandle.name}" in IndexedDB.`);
        return folderHandle;
        
    } catch (error) {
        console.error(error)
    }
}

// global singleton instance
export const fs = new FS;

// constructor for untrusted environments
export const FSConstructor = FS;

export const rootfs = {
    'opfs': await navigator.storage.getDirectory(),
    'mnt': new MountContainer()
}

window.rootfs = rootfs;
window.fs = fs;