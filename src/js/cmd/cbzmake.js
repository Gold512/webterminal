const jszip = await include('lib:jszip');
const fs = include('fs');
const {confirm, log} = include('console');

const delOriginal = argv[0] ? argv[0] === 'y' : await confirm('Delete source folders?');

const dir = await fs.getCurrentDirectory();

for await (let [name, subdir] of dir.entries()) {
	if(subdir.kind !== 'directory') continue;

	const zip = jszip();
	for await (let [n, f] of subdir.entries()) {
		zip.file(n, await f.getFile())
	}

	await fs.writeFile(`${name}.cbz`, await zip.generateAsync({type: 'blob'}));
	if (delOriginal) await fs.deleteFile(name);
	log(`Converted ${name}.cbz`);
}