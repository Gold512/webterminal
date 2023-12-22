import { fs, rootfs } from "./fs.js"

export const terminalBuiltin = {
    /**
     * @type {import('../terminal.js').Terminal}
     */
    terminal: null,
    async cd(path) {

        const newPath = fs.resolvePath(path, this.terminal.path);
        this.terminal.currentDir = await fs.getDirectory(path, this.terminal.path);
        this.terminal.path = newPath;
        this.terminal.label.innerText = fs.stringifyPath(newPath) + ' >';
    },
    echo(...msg) {
        this.terminal.log(msg.join(' '));
    },
    mount(subcommand, ...args) {
        if(subcommand) {
            switch(subcommand) {
                case 'remove':
                    rootfs.mnt.dismount(args[0]);
                    break;
            }
            return;
        }
        fs.mountDirectory();
    },
    async dir() {
        const dir = this.terminal.currentDir;        
        const keys = await toArray(dir.keys());
        if(keys.length === 0) return this.terminal.log('[empty directory]');
        this.terminal.log(keys.join('\n'));
    }
}

async function toArray(asyncIterator){ 
    const arr=[]; 
    for await(const i of asyncIterator) arr.push(i); 
    return arr;
}