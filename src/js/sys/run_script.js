import { FSConstructor, fs } from "./fs.js";
import { fetchScript, parsePackage } from "./pkg.js";

export async function runScript(terminal, path, argv) {

	// get the source
	let code;
	try {
		code = await fs.readFile(path, terminal.path);
	} catch (err) { return terminal.log(`file '${fs.stringifyPath(path)}' does not exist`);}
	
	await runCode(terminal, code, argv)
}


export async function runCode(terminal, code, argv) {
    // execution path is the path that the script is in
    const executionPath = terminal.path;
    function include(pkg) {
        switch(pkg) {
            case 'fs': return new FSConstructor(executionPath);
            case 'console': return new Console(terminal);
			case 'sys': return new Sys;
        }

		const libPrefix = 'lib:';

		// lib include 
		if(pkg.slice(0, libPrefix.length) === libPrefix) {
			return libInclude(pkg.slice(libPrefix.length));
		}
		
		throw new Error('Unknown package ' + pkg);
    }

	// convert the source to a function
	let fn;
	try {
		fn = (async() => {}).constructor('include', 'argv', "'use strict';" + code)
	} catch (err) { return terminal.log(err.message); }

	// execute the function
	try{
		return await fn(include, argv);
	} catch(e) {
		terminal.log(e.message);
		console.error(e);
	}
}

// external script only classes

class Console {
	#terminal;

	constructor(terminal) {
		if(!terminal) throw new Error('terminal undefined')
		this.#terminal = terminal;
	}

	// use binded functions to support destructuring
	log = (msg => {
		this.#terminal.log(msg);
	}).bind(this)

	prompt = (async (msg, defaultValue) => {
		return await this.#terminal.prompt(msg, defaultValue);
	}).bind(this)

	confirm = (async (msg) => {
		return await this.#terminal.confirm(msg);
	}).bind(this)

	error = ((msg) => {
		this.#terminal.log('Error: ' + msg);
	}).bind(this)

	execute = (async (cmd) => {
		await this.#terminal.execute(cmd);
	}).bind(this)
}

class Sys {
	fetchScript = fetchScript
}

async function libInclude(lib) {
	if(!lib.match(/^[a-zA-Z0-9]+$/)) throw new Error('invalid library name ' + lib);

	const f = await fs.readFile('/src/lib/' + lib + '.js');
	
	// get lib exports
	const pkg = parsePackage(f);
	if(pkg.tags && pkg.tags.export) {
		if(!pkg.tags.export.match(/^[a-zA-Z][a-zA-Z0-9]*$/)) throw new Error('invalid export meta tag');

		const fn = new Function('window', pkg.body + ';return window.' + pkg.tags.export);
		return fn(createWinProxy());
	}
}

function createWinProxy() {
	const o = {};
	return new Proxy(window, {
		get(target, prop, reciever) {
			if(o.hasOwnProperty(prop)) return o[prop];
			return Reflect.get(...arguments);
		},
		set(obj, prop, value) {
			o[prop] = value; 
		}
	})
}