const output = document.getElementById('output');
const currentPathContainer = document.getElementById('path');
const scrollContainer = document.getElementById('scroll-container');
window.root = null;
let selected = null;
let currentPath = '';

export let currentInput = null;

export function log(s) {
    output.textContent += s + '\n';
    scrollContainer.scrollTop = scrollContainer.scrollHeight - scrollContainer.offsetHeight;
}

export function error(s) {
    output.textContent += 'Error: ' + s + '\n';
    scrollContainer.scrollTop = scrollContainer.scrollHeight - scrollContainer.offsetHeight;
}

export async function input(prompt = 'input: ') {
    currentPathContainer.innerText = prompt;
    return new Promise(resolve => {
        currentInput = (v) => {
            resolve(v);
            log('\n' + prompt + v);
            currentPathContainer.innerText = currentPath + '>';
            currentInput = null;
        }
    });
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
    currentPath = currentPath + '/' + s;
    currentPathContainer.innerText = currentPath + '>';
}

export function setCurrentPath(s) {
    currentPath = s;
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

/**
 * Import module from string
 * @param {string} str 
 * @returns 
 */
function doimport (str) {
    const blob = new Blob([str], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const module = import(url)
    URL.revokeObjectURL(url) // GC objectURLs
    return module
}

export async function executeModule(file, callSignature) {
    const text = await file.text();
    const module = await doimport(text);
    if(!callSignature) {
        log(Object.keys(module).join('\n'));
        return;
    }

    try {
        let fn = eval(`(async function(m) {return await m.${callSignature}})`);
        log(await fn(module));
    } catch(e) {
        error(e);
    }
}

/**
 * 
 * @param {File} file 
 */
export async function executeScript(file) {
    const text = await file.text();
    let fn;
    try {
        fn = eval('(async function(log, error, input){' + text + '})');
        fn(log, error, input);
    } catch(e) {
        error(e);
    }
}