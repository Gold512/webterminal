import { FSConstructor, fs } from "./fs.js";

export async function runScript(terminal, path) {

	// get the source
	let code;
	try {
		code = await fs.readFile(path, terminal.path);
	} catch (err) { return terminal.log(`file '${fs.stringifyPath(path)}' does not exist`);}
	
	runCode(terminal, code)
}


export async function runCode(terminal, code) {
    // execution path is the path that the script is in
    const executionPath = terminal.path;
    function include(pkg) {
        switch(pkg) {
            case 'fs': return new FSConstructor(executionPath);
            case 'console': return new Console(terminal);
            default: throw new Error('Unknown package ' + pkg);
        }
    }

	// convert the source to a function
	let fn;
	try {
		fn = (async()=>{}).constructor('include', "'use strict';" + code);
	} catch (err) { return terminal.log(err.message); }

	// execute the function
	try{
		return await fn(include);
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
}