const output = document.getElementById('output');
const currentPathContainer = document.getElementById('path');
const scrollContainer = document.getElementById('scroll-container');
window.root = null;
let selected = null;
let currentPath = '';

export function log(s) {
    output.textContent += s + '\n';
    scrollContainer.scrollTop = scrollContainer.scrollHeight - scrollContainer.offsetHeight;
}

export function error(s) {
    output.textContent += 'Error: ' + s + '\n';
    scrollContainer.scrollTop = scrollContainer.scrollHeight - scrollContainer.offsetHeight;
}

export function setRoot(s) {
    currentPathContainer.innerText = s.name + '>';
    window.root = s;
    currentPath = s.name;
    selected = s;
}

export function getCurrentPath() {
    return currentPath;
}

export function appendToPath(s) {
    currentPathContainer.innerText = currentPath + '/' + s + '>';
}

export function setCurrentPath(s) {
    currentPathContainer.innerText = s + '>';
}

export function clearLog() {
    output.textContent = '\n';
}

/**
 * 
 * @returns {FileSystemDirectoryHandle}
 */
export function getCurrentFolder() {
    return selected || window.root;
}

export function setCurrentFolder(v) {
    selected = v;
}

export function hasMounted() {
    return !!window.root;
}

/**
 * 
 * @param {*} relativeNameOrId 
 * @returns {Promise<FileSystemDirectoryHandle|FileSystemFileHandle|null>}
 */
export async function resolveFileReference(relativeNameOrId) {
    const folder = getCurrentFolder();
    const id = parseInt(relativeNameOrId);
    if(!isNaN(id)) {
        let index = 0;
        for await (const value of folder.values()) {
            if(index === id) return value;
            
            index++;
        }

        return null;
    }

    try {
        return await folder.getDirectoryHandle(relativeNameOrId)
    } catch(e) {}

    try {
        return await folder.getFileHandle(relativeNameOrId)
    } catch(e) {}

    return null;
}

function doimport (str) {
    if (globalThis.URL.createObjectURL) {
        const blob = new Blob([str], { type: 'text/javascript' })
        const url = URL.createObjectURL(blob)
        const module = import(url)
        URL.revokeObjectURL(url) // GC objectURLs
        return module
    }
    
    const url = "data:text/javascript;base64," + btoa(moduleData)
    return import(url)
}

export function executeModule(file) {
    
}