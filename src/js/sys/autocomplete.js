import { parseCommand } from "./cmd.js";
import { fs } from "./fs.js";

export async function FSAutoComplete(value = '', parsed, index) {
    const folder = this.currentDir;
    let results = [];

    for await (const key of folder.keys()) {
        if(key.slice(0, value.length).toLowerCase() === value) {
            results.push(key.includes(' ') ? `"${key}"` : key);
        }
    }
    
    return results;
}

export async function fileAutoComplete(value, parsed, index) {
	const parsedPath = fs.resolvePath(value, this.path);
	if(['~','/'].includes(value)) parsedPath.push('');

	const folder = await fs.getDirectory(parsedPath.slice(0, -1), this.path);
	if(folder === undefined) return [];

	let results = [];

	const search = parsedPath[parsedPath.length - 1].toLowerCase();
	let prefix = parsedPath.length > 1 ? fs.stringifyPath(parsedPath.slice(0, -1)) : '';
	if(!['~','/'].includes(prefix)) prefix += '/';
	
	const useQuote = prefix.includes(' ');

	for await (const [key, handle] of folder.entries()) {
		if(handle.kind !== 'file') continue;

		if(key.slice(0, search.length).toLowerCase() === search) {
			const completion = (useQuote || key.includes(' ')) ? `'${key}'` : key;
			results.push(prefix + completion);
		}
	}

	return results;
}

export async function directoryAutoComplete(value, parsed, index) {
	const parsedPath = fs.resolvePath(value, this.path);
	if(['~','/'].includes(value)) parsedPath.push('');

	const folder = await fs.getDirectory(parsedPath.slice(0, -1), this.path);
	if(folder === undefined) return [];
	
	let results = [];

	const search = parsedPath[parsedPath.length - 1].toLowerCase();
	let prefix = parsedPath.length > 1 ? fs.stringifyPath(parsedPath.slice(0, -1)) : '';
	if(!['~','/'].includes(prefix)) prefix += '/';
	
	const useQuote = prefix.includes(' ');

	for await (const [key, handle] of folder.entries()) {
		if(handle.kind !== 'directory') continue;

		if(key.slice(0, search.length).toLowerCase() === search) {
			const completion = (useQuote || key.includes(' ')) ? `'${key}'` : key;
			results.push(prefix + completion);
		}
	}

	return results;
}

/**
 * Create generic filesystem based autocomplete with filters
 * @param {object} assertion 
 * @param {string} [assertion.extension] file extension, automatically excludes directries if this is defined
 * @returns {string[]} list of matches
 */
export function FileAutoCompleteFactory(assertion) {
    return async function(value, parsed, index) {
        value = value.toLowerCase();
        const folder = this.currentDir;
        let results = [];

        for await (const [key, handle] of folder.entries()) {
			// file extension check
            if(assertion.extension !== undefined && (key.slice((key.lastIndexOf(".") - 1 >>> 0) + 2)) === assertion.extension) continue;

            if(key.slice(0, value.length).toLowerCase() === value) {
                results.push(key.includes(' ') ? `"${key}"` : key);
            }
        }

        return results;
    }
}

/**
 * 
 * @param {string[]} list 
 * @returns 
 */
export function enumAutoCompleteFactory(list) {
    return function(value, parsed, index) {
        let results = [];
        for(let i = 0; i < list.length; i++) {
            if(list[i].slice(0, value.length).toLowerCase() === value) results.push(list[i]);
        }
        return results;
    }
}