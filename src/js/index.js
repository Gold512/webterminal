import { getHandle } from "./mount.js";
import { log, error, clearLog, resolveFileReference, setCurrentFolder, hasMounted, appendToPath, getCurrentFolder, setCurrentPath, currentInput, executeScript } from "./sys.js";
import { parseCommand } from "./parser.js";
import { fileAutoComplete } from "./autocomplete.js";

const input = document.getElementById('input');

let tabindex = 0;
let originalPart = '';
let lastCommand = '';

input.addEventListener('keydown', async ev => {
    
    if(ev.key === 'Enter') {
        if(currentInput) {
            currentInput(input.value);
            input.value = '';

            return;
        }

        lastCommand = input.value;
        runCommand(input.value);
        input.value = '';
        return;
    }

    if(ev.key === 'Tab') {
        ev.preventDefault();

        const parsedCmd = parseCommand(input.value);
        const name = parsedCmd[0];
        let autocomplete = CMDAutoComplete[name];
        if(autocomplete) {
            let newComponent
            const selectedSectionIndex = getSelectedSection(input.selectionStart, parsedCmd);
            const autocompleteFn = autocomplete[selectedSectionIndex];
            if(!autocompleteFn) return;

            if(originalPart === '') {
                tabindex = 0; 
                originalPart = parsedCmd[selectedSectionIndex];
                newComponent = await autocompleteFn(parsedCmd[selectedSectionIndex], parsedCmd, selectedSectionIndex);
            } else {
                tabindex++;
                parsedCmd[selectedSectionIndex] = originalPart;
                newComponent = await autocompleteFn(originalPart, parsedCmd, selectedSectionIndex);
                if(tabindex >= newComponent.length) tabindex = 0;
            }

            if(newComponent === undefined || newComponent.length === 0) return;
            parsedCmd[selectedSectionIndex] = newComponent[tabindex];
            input.value = parsedCmd.join(' ');
        }

        return;
    }

    if(ev.key === 'ArrowUp') {
        ev.preventDefault()
        input.value = lastCommand;
        input.selectionStart = lastCommand.length
    }

    tabindex = 0;
    originalPart = '';
});

function getSelectedSection(cursorIdx, parsed) {
    for(let i = 0; i < parsed.length; i++) {
        const sect = parsed[i];
        if(cursorIdx <= sect.length) return i;
        cursorIdx -= sect.length + 1 // add one to include the space after the section
    }

    return parsed.length - 1;
}

const prefix = document.getElementById('path');

function runCommand(s) {
    log('\n' + prefix.innerText + ' ' + s);
    s = parseCommand(s);

    let name = s.shift();
    if(CMD[name]) return CMD[name](...s);    
    error('invalid command ' + name)
}


const CMD = {};
const CMDAutoComplete = {};
window.CMD = CMD;
/**
 * 
 * @param {string} name name of command
 * @param {function|string} callback function or module path, where each exported function will be 
 *                                   made into a sub command
 */
export function registerCommand(name, callback) {
    if(CMD[name]) {
        throw new Error(`unable to add command: command with name '${name}' already exists`);
    }

    if(typeof callback === 'function') {
        CMD[name] = callback;
        return;
    }

    if(typeof callback === 'string') {
        import(callback).then(module => {
            let useDefault = true;
            for(let i in module) {
                if(typeof module[i] === 'function' && i !== 'default') {
                    useDefault = false;
                    break;
                } 
            }

            // autocomplete processing 
            if(module.autocomplete) {
                CMDAutoComplete[name] = [null, ...module.autocomplete];
            }

            if(useDefault) {
                CMD[name] = module.default;
            } else {
                CMD[name] = (...args) => {
                    if(args.length > 0 && module[args[0]]) {
                        module[args[0]](...args.slice(1));
                        return;
                    }


                    let subCommands = [];
                    for(let i in module) {
                        if(typeof module[i] === 'function') subCommands.push(i);
                    }
                    error(`missing or invald sub-command\nsub-commands of '${name}':\n${subCommands.join('\n')}`);
                    return;
                    
                }
            }
        }, v => {
            error(v);
        });

        return;
    }

    throw new Error(`unable to add command '${name}': invalid callback`)
}

export function registerAutoComplete(name, components) {
    CMDAutoComplete[name] = components;
}

// system commands
registerCommand('mount', getHandle);
registerCommand('list', () => {
    for(let i in CMD) log(i)
});

registerCommand('dir', async () => {
    const folder = getCurrentFolder();

    if(!folder) return error('no mounted directory');
    for await (const [key, value] of folder.entries()) {
        log(key)
    }
});

registerCommand('clear', clearLog);
registerCommand('file', './cmd/file.js');
registerCommand('tree', './cmd/tree.js');

registerCommand('cd', async (folderNameOrId) => {
    if(!hasMounted()) return error('No directory mounted');

    if(folderNameOrId === '/') {
        setCurrentPath(window.root.name);
        setCurrentFolder(window.root);
        return;
    }

    let folder = await resolveFileReference(folderNameOrId);
    if(!(folder instanceof FileSystemDirectoryHandle)) return error(folderNameOrId + ' is not a directory');

    setCurrentFolder(folder);

    appendToPath(folder.name);
});

registerAutoComplete('cd', [null, fileAutoComplete])

registerCommand('pkg', './cmd/pkg.js');

registerCommand('sandbox', './cmd/sandbox/index.js')

registerCommand('_src', (name) => {
    log(CMD[name].toString());
})

registerCommand('js', async path => {
    if(!hasMounted()) return error('No directory mounted');

    let script = await resolveFileReference(path);
    if(!script) return error('no script found');

    executeScript(await script.getFile())
})
registerAutoComplete('js', [null, fileAutoComplete]);

log(`'mount' to mount a folder\n'list' to show list of commands`)