import { directoryAutoComplete, enumAutoCompleteFactory, fileAutoComplete } from "./autocomplete.js";
import { EXECUTION_PATH_FOLDER } from "./const.js";
import { fs, rootfs } from "./fs.js"
import { runCode, runScript } from "./run_script.js";

export const terminalBuiltin = {
    /**
     * @type {import('../terminal.js').Terminal}
     */
    // @ts-expect-error terminal is defined externally and will always be object Terminal as expected.
    terminal = null,
    async cd(path) {
		if(path === undefined) return;
        const newPath = fs.resolvePath(path, this.terminal.path);
		this.terminal.currentDir = await fs.getDirectory(path, this.terminal.path);
		this.terminal.path = newPath;
        this.terminal.label.innerText = fs.stringifyPath(newPath) + ' >';
    },
    echo(...msg) {
        this.terminal.log(msg.join(' '));
    },
    async mount(subcommand, ...args) {
        if(subcommand) {
            switch(subcommand) {
                case 'remove':
                    await rootfs.mnt.dismount(args[0]);
					this.terminal.log('dismounted ' + args[0]);
                    break;
            }
            return;
        }
        await fs.mountDirectory();
		this.terminal.log('directory mounted successfully');
    },
    async dir() {
        const dir = this.terminal.currentDir;        
        const keys = await toArray(dir.keys());
        if(keys.length === 0) return this.terminal.log('[empty directory]\n');
        this.terminal.log(keys.join('\n') + '\n');
    },
	async cat(path) {
		const fileHandle = await fs.getFile(path, this.terminal.path);
		const file = await fileHandle.getFile();
        
        // large file warning
        if(file.size > 1e6 && !confirm(`File is large (${formatBytes(file.size)}) print anyway?`)) return;
        const text = await file.text();
		this.terminal.log(text + '\n');
	},
	async storage() {
		const space = await navigator.storage.estimate();
		this.terminal.log(`Storage: ${formatBytes(space.usage)} / ${formatBytes(space.quota)}\n`)
	},
	async df() { await this.storage() },
	async js(path) {
        // js repl
        if(path === undefined) {
            this.terminal.log("JS REPL\nAuto included packages: fs, console\ntype 'exit' to exit\n")
            while(true) {
                const input = await this.terminal.prompt('>>>');
                if(input === 'exit') return;

                // include important packages like console and fs automatically 
                // so this repl is somewhat useful
                const INCLUDE_CODE = 'const console=include("console"),fs=include("fs");';
                const result = await runCode(this.terminal, INCLUDE_CODE + input);
                if(result !== undefined) this.terminal.log(result);
            }
        }

		const resolved = fs.resolvePath(path, this.terminal.path);
		runScript(this.terminal, resolved);
	},
	clear() {
		this.terminal.clear();
	},

	/**
	 * 
	 * @param {string} script 
	 * @returns 
	 */
	async pkg(subcommand, script) {
		if(!pkgManager.hasOwnProperty(subcommand)) throw new Error(`package manager does not have subcommand '${subcommand}'\nValid subcommands: ${extractCommands(pkgManager)}`);
        pkgManager[subcommand].bind(this)(script);
	},
    async help() {
        // show list of commands 
        this.terminal.log('list of commands:');
        this.terminal.log(extractCommands(this).join(' '));
        
        const dir = await fs.getDirectory('/src/cmd');
        const arr = [];
        for await (const [key, value] of dir.entries()) {
            if(key.slice(key.length - 3) === '.js') {
                arr.push(key.slice(0, -3));
            }
        }

        this.terminal.log(arr.join(' '));
    },
    async rm(path = null) {
        if(path === null) throw new Error('expected 1 argument, got 0')
        await fs.deleteFile(path, this.terminal.path);
        this.terminal.log('successfully deleted ' + fs.stringifyPath(fs.resolvePath(path, this.terminal.path)))
    }
}

const pkgManager = {
    async add(script) {
        if(script === undefined || !script.match(/^[A-Za-z0-9_+-\.]+$/)) return this.terminal.log('Invalid script name');
		const path = `/src/js/cmd/${script}.js`;
		this.terminal.log('GET ' + location.origin + path);
        
        const response = await fetch(path);
        if(response.status === 404) return this.terminal.log('file not found')
        const text = await response.text();
		this.terminal.log('Downloaded ' + script + '.js successfully');
		fs.writeFile(`${EXECUTION_PATH_FOLDER}${script}.js`, text);
		this.terminal.log(`Written to ${EXECUTION_PATH_FOLDER}${script}.js`);
    },
    async remove(script) {
        if(script === undefined || !script.match(/^[A-Za-z0-9_+-\.]+$/)) return this.terminal.log('Invalid script name');
        fs.deleteFile(`${EXECUTION_PATH_FOLDER}${script}.js`);
    }
}

function extractCommands(o) {
	return Object.getOwnPropertyNames(o).filter(function (p) {
		return typeof o[p] === 'function';
	})
}

// autocompletion
export const builtinAutocomplete = {
	[Symbol.for('name')]: enumAutoCompleteFactory(extractCommands(terminalBuiltin)),
	cd: [directoryAutoComplete],
	mount: [enumAutoCompleteFactory(['remove']), async value => {
		value = value.toLowerCase();
		const results = [];
		for await (let key of rootfs.mnt.keys()) {
			if(key.slice(0, value.length).toLowerCase() === value) results.push(key);
		}

		return results;
	}],
    cat: [fileAutoComplete],
	js: [fileAutoComplete],
    rm: [fileAutoComplete]
}

async function toArray(asyncIterator){ 
    const arr=[]; 
    for await(const i of asyncIterator) arr.push(i); 
    return arr;
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1000
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
