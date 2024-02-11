const fs = include('fs');
const console = include('console');

if(argv[0] === '.') argv[0] = './index.html';
const workingDir = fs.resolvePath(argv[0]).slice(0, -1);

const f = await fs.readFile(argv[0]);
const doc = document.createElement('html');
doc.innerHTML = f;

const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
function randomString(len) {
	let result = new Array(len);
	for(let i = 0; i < len; i++) {
		result[i] = chars[Math.floor(Math.random() * chars.length)];
	}
	return result.join('');
}

const scripts = doc.querySelectorAll('script[src]');
for(let i = 0; i < scripts.length; i++) {
	// make script loader tolerant of missing scripts like normal html
	
	try {
		const path = getResourcePath(scripts[i].src);

		const script = await fs.readFile(path, workingDir);
		scripts[i].innerHTML = script;
		scripts[i].removeAttribute('src');
	} catch {
		const path = getResourcePath(scripts[i].src);
		console.error(`script ${path} not found`);
	}
}

const stylesheets = doc.querySelectorAll('link[rel="stylesheet"][href]');
for(let i = 0; i < stylesheets.length; i++) {
	try {
		const path = getResourcePath(stylesheets[i].href);
		const content = await fs.readFile(path, workingDir);
		const style = document.createElement('style');

		style.innerHTML = content;

		stylesheets[i].before(style);
		stylesheets[i].remove();
	} catch {
		const path = getResourcePath(stylesheets[i].href);
		console.error(`style ${path} not found`)
	}
}

const patch = await include('sys').fetchScript('serve/serve_inject').then(t => t.text());
const id = randomString(16);

// optional patch
if(patch) {
	const script = document.createElement('script');
	script.id = randomString(16);
	script.innerHTML = patch.replace('$id', id) + `;document.getElementById('${script.id}').remove();`;
	doc.querySelector('head').children[0].before(script);
}

let idRequested = false;
const win = window.open('about:blank', '_blank');
win.document.write(doc.outerHTML);
win.document.close();

function getResourcePath(url) {
	console.log('resolving ' + url)
	url = new URL(url);
	let path = url.pathname;
	if(path[0] == '/') path = '.' + path;
	return path;
}

async function recieve(msg) {
	const d = msg.data;

	if(!idRequested && d.type === 'ID') {
		msg.source.postMessage(id);
		idRequested = true;
		return;
	}

	if(d.id !== id) console.error('invalid id');
	if(d.type !== 'GET') throw new Error('unsupported type');

	try {
		msg.source.postMessage({
			response: await fs.readFile(fs.resolvePath(d.url, workingDir)),
			requestID: d.requestID
		}, '*');
	} catch {
		msg.source.postMessage({
			response: 404,
			requestID: d.requestID
		}, '*');
	}
}

window.addEventListener('message', recieve);

win.addEventListener('close', () => {
	window.removeEventListener('message', recieve);
})