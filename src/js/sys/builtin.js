import { directoryAutoComplete, enumAutoCompleteFactory } from "./autocomplete.js";
import { fs, rootfs } from "./fs.js"

export const terminalBuiltin = {
    /**
     * @type {import('../terminal.js').Terminal}
     */
    terminal: null,
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
		const text = await (await fileHandle.getFile()).text();
		this.terminal.log(text + '\n');
	},
	async storage() {
		const space = await navigator.storage.estimate();
		this.terminal.log(`Storage: ${formatBytes(space.usage)} / ${formatBytes(space.quota)}\n`)
	},
	async df() { await this.storage() }
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
	}]
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
