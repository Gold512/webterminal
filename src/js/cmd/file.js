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

async function _recursiveReplace(folder, text, replace) {
    let matches = 0;

    for await (const [key, value] of folder.entries()) {
        if(value.kind === 'directory') {
            matches += await _recursiveReplace(value, text);
            continue;
        }

        const replaced = key.replaceAll(text, replace ?? '');
        value.move(replaced);

        if(key !== replaced) matches++;
    }

    return matches;
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
                value.move(replaced);

                if(replaced !== key) matches++;
            }

            log(`File name replace: ${matches} file(s) renamed`);
            
            break;
        }

        case 'recursive-replace': {
            if(!args[0]) return error('no text to replace');
            let matches = await _recursiveReplace(folder, args[0], args[1]);
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
 * recursive foreach for folder
 * @param {FileSystemDirectoryHandle} folder 
 * @param {function(string, FileSystemFileHandle)} callback with name of file and the file handle
 * @returns 
 */
async function forEach(folder, callback, path = '') {
    for await (const [key, value] of folder.entries()) {
        if(value.kind === 'directory') {
            await forEach(value, callback, key + '/');
            continue;
        }

        callback(path + key, value)
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
    forEach(folder, async (path, handle) => {
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
