// path syntax
// ~path/* - mounted directory, where the first folder is the name of the mounted directory
// /path/* - OPFS path
// ./path/* - relative path
// 		./../path/* - traversals are allowed

import { createStore, get, set, entries, del } from "../../lib/idb_keyval.js";
const fileStore = createStore('files', 'file-store');

/**
 * @typedef {string|string[]} FilePath
 */

// API Declaration
class FS {
    constructor(currentPath = null) {
        this.currentPath = currentPath;
    }

    bind(terminal) {
        Object.defineProperty(this, 'currentPath', {
            get() {
                return terminal.path;
            }
        })
    }

    async getCurrentDirectory() {
        if(!this.currentPath) throw new Error('No current directory');
        return await this.getDirectory(this.currentPath);
    }

    async move(src, dest) {
        let currentPath = this.currentPath || ['opfs'];

    }

    /**
     * Get file handle 
     * @param {FilePath} path 
     * @param {string[]} currentPath 
     * @returns {Promise<FileSystemFileHandle>}
     */
	async getFile(path, currentPath = ['opfs']) {
        if(this.currentPath) currentPath = this.currentPath;
        const resolved = Array.isArray(path) ? path : resolvePath(path, currentPath);
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
     * @param {FilePath} path 
     * @param {string[]} currentPath 
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
	async getDirectory(path, currentPath = ['opfs']) {
        if(this.currentPath) currentPath = this.currentPath;
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

    /**
     * Write text to file, creating directories and paths recursively if necessary
     * @param {FilePath} path 
     * @param {string} content text to write to file
     * @param {string[]} currentPath current file path for resolving relative paths
     */
    async writeFile(path, content, currentPath = ['opfs']) {
        if(this.currentPath) currentPath = this.currentPath;
        const resolved = Array.isArray(path) ? path : resolvePath(path, currentPath);
        let ptr = rootfs[resolved[0]];
        try {
            for(let i = 1; i < resolved.length - 1; i++) {
                ptr = await ptr.getDirectoryHandle(resolved[i], {create: true});
            }
            ptr = await ptr.getFileHandle(resolved[resolved.length - 1], {create: true});

            const writable = await ptr.createWritable();
            await writable.write(content);
            await writable.close();
        } catch(e) {
            console.error(e);
            throw new Error('unable to write file');
        }
    }

    /**
     * read file contents
     * @param {FilePath} path filepath
     * @param {string[]} currentPath path of current directory
     */
    async readFile(path, currentPath = ['opfs']) {
        if(this.currentPath) currentPath = this.currentPath;
        const fileHandle = await this.getFile(path, currentPath);
        const file = await fileHandle.getFile();
        return await file.text();
    }

    async deleteFile(path, currentPath = ['opfs']) {
        if(this.currentPath) currentPath = this.currentPath;
        const resolved = Array.isArray(path) ? path : resolvePath(path, currentPath);
        let ptr = rootfs[resolved[0]];
        try {
            for(let i = 1; i < resolved.length - 1; i++) {
                ptr = await ptr.getDirectoryHandle(resolved[i], {create: true});
            }

            const name = resolved[resolved.length - 1];
            
            // try to delete file
            try {
                await ptr.removeEntry(name);
                return;
            } catch(e){}

            // try to delete dir
            try {
                const dir = await ptr.getDirectoryHandle(name);
                await recursiveDeleteDir(dir);
                await ptr.removeEntry(name);

                return;
            } catch(e) {}
            throw new Error();
        } catch(e) {
            console.error(e);
            throw new Error(`unable to delete file or directory at '${fs.stringifyPath(resolved)}'. check if anything exists at this path.`);
        }
    }

    stringifyPath(path) {
        const pathCipher = {'opfs':'/','mnt':'~'}
        const container = pathCipher[path[0]];
        return container + path.slice(1).join('/');
    }

    /**
     * Stringifies a path but makes it relative if possible. Usually results in shorter paths
     * @param {string[]} path 
     * @param {string[]} currentPath 
     */
    relativeStringifyPath(path, currentPath) {
        if(path[0] !== currentPath[0]) return this.stringifyPath(path);
        for(let i = 1; i < path.length; i++) {
            if(path[i] === currentPath[i]) continue;
            return path.slice(i).join('/');
        }
    }

    async mountDirectory() {
        await rootfs.mnt.mount();
    }

    resolvePath = resolvePath.bind(this);
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
        if(dirhandle === undefined) return; // directory not selected by user
        
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
    if(container === undefined) throw new Error('Invalid current path');

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

async function recursiveDeleteDir(dir) {
    for await(const [key, handle] of dir.entries()) {
        if(handle.kind === 'directory') {
            await recursiveDeleteDir(handle)
        }
        await dir.removeEntry(key);
    }
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
 * @param {(msg) => void} [log] callback which recieves output of function 
 * @returns {Promise<FileSystemDirectoryHandle | undefined>}
 */
async function getHandle(name, log = (msg) => {}) {
    try {
        const fileHandleOrUndefined = name === undefined ? undefined : await get(name, fileStore);    
        if (fileHandleOrUndefined) {
            log(`Retrieved file handle "${fileHandleOrUndefined.name}" from IndexedDB.`);
            
            let permission = await verifyPermission(fileHandleOrUndefined, true);
            if(!permission) {
                log('permission denied');
                return;
            }
            
            return fileHandleOrUndefined;
        }

        // @ts-expect-error
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
