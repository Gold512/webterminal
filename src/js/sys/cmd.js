// this module should handle command execution and autocomplete

import { builtinAutocomplete, terminalBuiltin } from "./builtin.js";

export async function runCommand(terminal, command) {
    const parsed = parseCommand(command);
    const cmdName = parsed.shift();
    
    if(terminalBuiltin[cmdName]) {
        terminalBuiltin.terminal = terminal;
        try {
            const output = await terminalBuiltin[cmdName](...parsed);
        } catch(e) {
            terminal.log(e.message);
            console.error(e)
        }
    } else {
        terminal.log(`Command '${cmdName}' not found`);
    }
}

export function getCommandAutocomplete(cmdName) {
    if(builtinAutocomplete.hasOwnProperty(cmdName)) return builtinAutocomplete[cmdName];
}

// parse command 
export function parseCommand(s) {
    function increment() {
        index++;
        res.push('');
    }
    const QUOTES = [`'`, `"`, '`'];
    let res = [''], index = 0;
    let currentQuote;
    for(let i = 0; i < s.length; i++) {
        const chr = s[i];
        if(currentQuote) {
            if(chr == '\\') {
                if(s[i+1]) {
                    res[index] += s[i+1];
                    i++;
                } else {
                    throw new Error('Command Parse - escape character cannot be at the last character. If this is intentional, escape it (ie. \\\\)')
                }
                continue;
            }
            if(chr != currentQuote) {
                res[index] += chr;
            } else {
                currentQuote = null;
                increment();
                if(s[i+1] == ' ') i++;
            }
            
            continue;
        }

        if(QUOTES.includes(chr)) {
            currentQuote = chr;
            continue;
        }

        switch(chr) {
            case ' ':
                increment();
            break;
            case '\\':
                if(s[i+1]) {
                    res[index] += s[i+1];

                    i++;
                    continue;
                } else {
                    throw new Error('Command Parse - unexpected end of string (trailing escape character)')
                }

            default: res[index] += chr;
        }
    }

    if(currentQuote) throw new Error('Command Parse - unterminated string');

    if(res[res.length - 1] == '') res.pop();
    return res;
}