import { Terminal } from "./terminal.js";

const input = document.getElementById('input');
const label = document.getElementById('path');
const output = document.getElementById('output');
const scrollContainer = document.getElementById('scroll-container')
const terminal = new Terminal(label, input, output, scrollContainer);
window.terminal = terminal;