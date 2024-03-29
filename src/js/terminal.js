import { builtinAutocomplete, terminalBuiltin } from "./sys/builtin.js";
import { getCommandAutocomplete, parseCommand, runCommand } from "./sys/cmd.js";
import { fs, rootfs } from "./sys/fs.js";

export class Terminal {
    constructor(label, input, output, scrollContainer) {
        this.tabindex = 0;
        /**
         * @type {null|string}
         */
        this.originalPart = '';
        this.lastCommand = '';
        // cache autocomplete function for performance
        this.prevAutocomplete = null;

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

    async prompt(prompt = 'input:', defaultValue = '') {
        if(this.currentInput) throw new Error('Input already open');
        let resolve;
        const p = new Promise(res => {
            resolve = res;
        });
        const oldPath = this.path;
        this.currentInput = v => {
            this.log(prompt + ' ' + v);
            this.label.innerText = fs.stringifyPath(oldPath) + ' >';

            resolve(v);
            this.currentInput = null;
        };
        this.label.innerText = prompt;

        if(defaultValue) {
            this.input.value = defaultValue;
            this.input.selectionStart = 0;
            this.input.selectionEnd = defaultValue.length;
        }

        return p;
    }

    async confirm(prompt = 'confirm') {
        if(this.currentInput) throw new Error('Input already open');
        let resolve;
        const p = new Promise(res => {
            resolve = res;
        });
        const oldPath = this.path;
        this.currentInput = v => {
            this.log(prompt + ' (y/n): ' + v);
            this.label.innerText = fs.stringifyPath(oldPath) + ' >';

            resolve(v === 'y');
            this.currentInput = null;
        };
        this.label.innerText = prompt + ' (y/n):';

        return p;
    }

    log(msg) {
        this.output.textContent += msg + '\n';
        this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight - this.scrollContainer.offsetHeight;
    }

    error(msg){
        this.log('Error: ' + msg);
    }

    clear() {
        this.output.textContent = '';
    }

    execute(input) {
        this.log(fs.stringifyPath(this.path) + ' > ' + input);

        return runCommand(this, input);
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
            this.execute(input.value);

            input.value = '';
            return;
        }
    
        if(ev.key === 'Tab') {
            ev.preventDefault();
            const parsedCmd = parseCommand(input.value);
            const name = parsedCmd[0];
            const selectedSectionIndex = getSelectedSection(input.selectionStart, parsedCmd);

            // command name autocomplete
            if(selectedSectionIndex === 0) {
                const autocompleteFn = builtinAutocomplete[Symbol.for('name')];
                let newComponent;
                if(this.originalPart === null) {
                    this.tabindex = 0;
                    this.originalPart = parsedCmd[0];
                    newComponent = await autocompleteFn.bind(this)(parsedCmd[0] ?? '', parsedCmd, selectedSectionIndex);
                } else {
                    this.tabindex++;
                    parsedCmd[0] = this.originalPart;
                    newComponent = await autocompleteFn.bind(this)(this.originalPart ?? '', parsedCmd, selectedSectionIndex);
                    if(this.tabindex >= newComponent.length) this.tabindex = 0;
                }

                parsedCmd[0] = newComponent[this.tabindex];
                input.value = parsedCmd.join(' ');
                return;
            }

            let autocomplete = this.originalPart === null ? getCommandAutocomplete(name) : this.prevAutocomplete;
            if(autocomplete) {
                let newComponent
                const autocompleteFn = autocomplete[selectedSectionIndex - 1];
                if(!autocompleteFn) return;
    
                if(this.originalPart === null) {
                    this.tabindex = 0; 
                    this.originalPart = parsedCmd[selectedSectionIndex];
                    this.prevAutocomplete = autocomplete;
                    newComponent = await autocompleteFn.bind(this)(parsedCmd[selectedSectionIndex] ?? '', parsedCmd, selectedSectionIndex);
                } else {
                    this.tabindex++;
                    parsedCmd[selectedSectionIndex] = this.originalPart;
                    newComponent = await autocompleteFn.bind(this)(this.originalPart ?? '', parsedCmd, selectedSectionIndex);
                    if(this.tabindex >= newComponent.length) this.tabindex = 0;
                }
    
                if(newComponent === undefined || newComponent.length === 0) return;
                parsedCmd[selectedSectionIndex] = newComponent[this.tabindex];
                input.value = parsedCmd.join(' ');
            }
    
            return;
        }
    
        if(ev.key === 'ArrowUp') {
            ev.preventDefault()
            input.value = this.lastCommand;
            input.selectionStart = this.lastCommand.length;
        }
    
        this.tabindex = 0;
        this.originalPart = null;
    }
}

function getSelectedSection(cursorIdx, parsed) {
    for(let i = 0; i < parsed.length; i++) {
        const sect = parsed[i];
        if(cursorIdx <= sect.length) return i;
        cursorIdx -= sect.length + 1 // add one to include the space after the section
    }

    // if it is still 1 there is a space at the end
    if(cursorIdx === 0) return parsed.length;

    return parsed.length - 1;
}