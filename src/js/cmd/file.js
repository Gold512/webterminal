import { enumAutoCompleteFactory, fileAutoComplete } from "../autocomplete.js";
import { error, getCurrentFolder, log, resolveFileReference } from "../sys.js";

// fs code 

/**
 * 
 * @param {FileSystemDirectoryHandle} parent - parent directory 
 * @param {string} directory - name of directory
 */
function renameSubDir(parent, directory) {
    parent.getDirectoryHandle
}

async function _recursiveReplace(folder, text, replace = '', path = '') {
    let matches = 0;

    try {
        for await (const [key, value] of folder.entries()) {
            if(value.kind === 'directory') {
                matches += await _recursiveReplace(value, text, replace, path + '/' + key);
                continue;
            }

            const replaced = key.replaceAll(text, replace);

            if(key !== replaced){
                try {
                    value.move(replaced);
                    matches++;
                } catch(e) {
                    error('unable to rename ' + path + '/' + key);  
                }
            }
        }
    } catch(e) {
        error('unable to get file in directory ' + path);
    }
    

    return matches;
}

export function search(...args) {
    const folder = getCurrentFolder();
    if(!folder) return error('no mounted directory');
    if(!args[0]) return error('no text to search');
    forEach(folder, (path, filename, handle) => {
        if(filename.includes(args[0])) log(path);
    }, true);
}

export async function rename(operation, ...args) {
    const folder = getCurrentFolder();
    if(!folder) return error('no mounted directory');
    
    switch (operation) {
        case 'replace': {
            if(!args[0]) return error('no text to replace');

            let matches = 0;

            for await (const [key, value] of folder.entries()) {
                if(value.kind === 'directory') continue;

                const replaced = key.replaceAll(args[0], args[1] ?? '');

                if(replaced !== key) {
                    matches++;
                    value.move(replaced);
                }
            }

            log(`File name replace: ${matches} file(s) renamed`);
            
            break;
        }

        case 'recursive-replace': {
            if(!args[0]) return error('no text to replace');
            let matches = await _recursiveReplace(folder, args[0], args[1] ?? '');
            log(`File name replace (recursive): ${matches} file(s) renamed`)
            break;
        }

        case 'set': {
            let index = 0;
            const targetIndex = parseInt(args[0]);

            for await (const value of folder.values()) {
                if(index === targetIndex) {
                    value.move(args[1]);
                    
                    log('file renamed');
                    break;
                }

                index++;
            }
        
            break;
        }

        default:
            error('invalid operation ' + operation);
            log(`operations:\n  replace\n  recursive-replace\n  set`)
            break;
    }
}

export async function list() {
    const folder = getCurrentFolder();
    if(!folder) return error('no mounted directory');

    let i = 0;
    for await (const key of folder.keys()) {
        log(`[${i}] `+ key);
        i++;
    }
}

export async function remove(id) {
    const folder = getCurrentFolder();
    if(!folder) return error('no mounted directory');

    let index = 0;
    const targetIndex = parseInt(id);

    for await (const key of folder.keys()) {
        if(index === targetIndex) {
            if(confirm(`Delete '${key}'?`)) {
                folder.removeEntry(key);
                log('deleted file')
            } else log('canceled by used');

            break;
        }

        index++;
    }
}

export async function info(fileRef) {
    let file = await resolveFileReference(fileRef);
    log(`name: ${file.name}`);
    log(`type: ${file.kind}`);

    if(file.kind === 'file') {
        let fileObj = await file.getFile();
        log(`size: ${fileObj.size.toLocaleString()} bytes`);
        log(`last modified: ${fileObj.lastModifiedDate}`);
    }
}

/**
 * @typedef {string} path
 */

/**
 * @typedef {string} filename
 */

/**
 * recursive foreach for folder
 * @param {FileSystemDirectoryHandle} folder 
 * @param {function(path, filename, FileSystemFileHandle)} callback with name of file and the file handle
 * @returns 
 */
async function forEach(folder, callback, callbackOnFolder = false, path = '') {
    for await (const [key, value] of folder.entries()) {
        if(value.kind === 'directory') {
            if(callbackOnFolder) callback(path + key, key, value);

            await forEach(value, callback, callbackOnFolder, key + '/');
            continue;
        }

        callback(path + key, key, value)
    }
}

function textToDate(s) {
    const date = new Date().toDateString();
    s = s.replace('today', date);
    return new Date(s);
}

/**
 * 
 * @param {string} date date string to search for 
 * @param {number} variationms +- milliseconds in search, defaults to 60,000ms
 */
export function searchLastModified(date, variationms = 60000) {
    date = textToDate(date).getTime();
    let folder = getCurrentFolder();
    forEach(folder, async (path, _, handle) => {
        const file = await handle.getFile();
        console.log(Math.abs(file.lastModified - date) < variationms)
        if(Math.abs(file.lastModified - date) < variationms) log(path);
    });
}

export const autocomplete = [
    enumAutoCompleteFactory(['rename', 'list', 'remove', 'info', 'searchLastModified']),
    fileAutoComplete,
    fileAutoComplete
]
