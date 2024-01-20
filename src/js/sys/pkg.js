import { EXECUTION_PATH_FOLDER } from "./const.js";
import { fs } from "./fs.js";
import { runCode } from "./run_script.js";

export const pkgManager = {
    async add(...scripts) {
		const installed = [];
		for(let i = 0; i < scripts.length; i++) {
			const script = scripts[i];

			try {
				if(script === undefined || !script.match(/^[A-Za-z0-9_+-\.]+$/)) throw new Error(`'${script}' is not a valid package name`);
				const path = `/src/js/cmd/${script}.js`;
				this.terminal.log('GET ' + location.origin + path);
				
				const response = await fetch(path);
				if(response.status === 404) throw new Error(`'${script}' not found`)

				const text = await response.text();
				this.terminal.log('Downloaded ' + script + '.js successfully');
				
				fs.writeFile(`${EXECUTION_PATH_FOLDER}${script}.js`, text);
				installed.push(script);
			} catch(e) {this.terminal.error(e.message)}
		}

		this.terminal.log(`successfully installed ${installed.length} package(s): ${installed.join(' ')}`);
    },

    async remove(script) {
        if(script === undefined || !script.match(/^[A-Za-z0-9_+-\.]+$/)) return this.terminal.log('Invalid script name');
        fs.deleteFile(`${EXECUTION_PATH_FOLDER}${script}.js`);
        this.terminal.log(`removed ${1} package(s)`)
    },

    async exe(script) {
        if(script === undefined || !script.match(/^[A-Za-z0-9_+-\.]+$/)) return this.terminal.log('Invalid script name');
		const path = `/src/js/cmd/${script}.js`;
		this.terminal.log('GET ' + location.origin + path);
        
        const response = await fetch(path);
        if(response.status === 404) return this.terminal.log('file not found')
        const text = await response.text();
        this.terminal.log('executing downloaded file')
        runCode(this.terminal, text);
    }
}

const OPEN_TAG = '// ==meta==';
const CLOSE_TAG = '// ==/meta==';

/**
 * Extract and parse header of scripts
 * @param {string} pkg 
 * @returns 
 */
function parsePackage(pkg) {
	if(pkg[0] !== '/' || pkg[1] !== '/') return {body: pkg};

	// check opening tag
	if(pkg.slice(0, OPEN_TAG.length) !== OPEN_TAG) return {body: pkg}; 
	
	const headerEnd = pkg.indexOf(CLOSE_TAG);
	if(headerEnd === -1) return {body: pkg};

	let header = pkg.slice(OPEN_TAG.length, headerEnd).trimEnd();
	header = header.split('\n// ');

	let prevTag = null;
	let tags = {};

	for(let i = 0; i < header.length; i++) {
		if(header[i][0] === '@') {
			const tagEnd = header[i].indexOf(' ');
			prevTag = header[i].slice(1, tagEnd);
			
			if(!tags.hasOwnProperty(prevTag)) tags[prevTag] = '';
			tags[prevTag] += header[i].slice(tagEnd + 1).replace('\\n', '\n');
		}
	}

	return {tags, body: pkg.slice(headerEnd + CLOSE_TAG.length).trim()};
}