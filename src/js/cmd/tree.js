const {log, error} = include('console');
const fs = include('fs');

async function main() {
    let folder = await fs.getCurrentDirectory()

    let files = [];
    let index = 0;

    for await (const entry of folder.entries()) {
        files[index] = entry;
        index++;
    }

    for(let i = 0, l = files.length; i < l; i++) {
        const [name, file] = files[i];
        
        log(name)
        if(file.kind === 'directory') await treeSubFunction(file, SPACE);
        
    }
}

const SPACE = '   ';
const BOX_HEAVY_UP_RIGHT = '\u2517';
const BOX_HEAVY_VERTICAL_RIGHT = '\u2523';
const BOX_HEAVY_VERTICAL = '\u2503';

async function treeSubFunction(folder, str = '') {
    let files = [];
    let index = 0;

    for await (const entry of folder.entries()) {
        files[index] = entry;
        index++;
    }
	
    for(let i = 0, l = files.length; i < l; i++) {
        const [name, file] = files[i];
        const chr = i === l - 1 ? BOX_HEAVY_UP_RIGHT : BOX_HEAVY_VERTICAL_RIGHT;
        const BOX_VERTICAL_OR_SPACE = i === l - 1 ? ' ' : BOX_HEAVY_VERTICAL;
        
        log(`${str}${chr}\u2578${name}`)

        if(file.kind === 'directory') await treeSubFunction(file, str + BOX_VERTICAL_OR_SPACE + SPACE);   
        
    }
}

await main();