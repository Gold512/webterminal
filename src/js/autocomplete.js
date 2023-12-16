import { getCurrentFolder } from "./sys.js";

export async function fileAutoComplete(value, parsed, index) {
    const folder = getCurrentFolder();
    let results = [];

    for await (const key of folder.keys()) {
        if(key.slice(0, value.length).toLowerCase() === value) {
            results.push(key.includes(' ') ? `"${key}"` : key);
        }
    }
    
    return results;
}

/**
 * Create file autocomplete with filters
 * @param {object} assertion 
 * @param {('file'|'directory')} [assertion.kind]
 * @returns 
 */
export function fileAutoCompleteFactory(assertion) {
    return async function(value, parsed, index) {
        value = value.toLowerCase();
        const folder = getCurrentFolder();
        let results = [];

        for await (const [key, handle] of folder.entries()) {
            if(assertion.kind && handle.kind !== assertion.kind) continue;

            if(key.slice(0, value.length).toLowerCase() === value) {
                results.push(key.includes(' ') ? `"${key}"` : key);
            }
        }

        return results;
    }
}

export function enumAutoCompleteFactory(list) {
    return function(value, parsed, index) {
        let results = [];
        for(let i = 0; i < list.length; i++) {
            if(list[i].slice(0, value.length).toLowerCase() === value) results.push(list[i]);
        }
        return results;
    }
}