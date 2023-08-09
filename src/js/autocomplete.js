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

export function enumAutoCompleteFactory(list) {
    return function(value, parsed, index) {
        let results = [];
        for(let i = 0; i < list.length; i++) {
            if(list[i].slice(0, value.length).toLowerCase() === value) results.push(list[i]);
        }
        return results;
    }
}