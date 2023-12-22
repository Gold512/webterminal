import { terminalBuiltin } from "./sys/builtin.js";
import { runCommand } from "./sys/cmd.js";
import { fs } from "./sys/fs.js";

export class Terminal {
    constructor(label, input, output, scrollContainer) {
        this.tabindex = 0;
        this.originalPart = '';
        this.lastCommand = '';

        this.input = input;
        this.label = label;
        this.output = output;
        this.scrollContainer = scrollContainer;

        input.addEventListener('keydown', this.#keydown.bind(this));

        this.path = ['opfs'];

        /** @type {FileSystemDirectoryHandle} */
        this.currentDir = rootfs.opfs;

        this.label.innerText = fs.stringifyPath(this.path) + ' >'
    }

    async prompt(prompt = 'input:') {
        if(this.currentInput) throw new Error('Input already open');
        let resolve;
        const p = new Promise(res => {
            resolve = res;
        });
        const oldPath = this.path;
        this.currentInput = () => {
            resolve();
            this.label.innerText = pathToString(oldPath)
        };
        this.label.innerText = prompt;
        return p;
    }

    log(msg) {
        this.output.textContent += msg + '\n';
        this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight - this.scrollContainer.offsetHeight;
    }

    async #keydown(ev) {
        const input = ev.currentTarget;

        if(ev.key === 'Enter') {
            if(this.currentInput) {
                this.currentInput(input.value);
                input.value = '';
    
                return;
            }
    
            this.lastCommand = input.value;
            this.log(fs.stringifyPath(this.path) + ' > ' + input.value);

            runCommand(this, input.value);

            input.value = '';
            return;
        }
    
        if(ev.key === 'Tab' && false) {
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
            input.value = this.lastCommand;
            input.selectionStart = this.lastCommand.length
        }
    
        this.tabindex = 0;
        this.originalPart = '';
    }
}

const containerSymbols = {
    'opfs': '/',
    'mnt': '~'
}
function pathToString(path) {
    const container = path[0];
    return containerSymbols[container] + path.slice(1).join('/');
}