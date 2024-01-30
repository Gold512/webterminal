const fs = include('fs');
const console = include('console');
const sys = include('sys');

// install some basic scripts
const pkgList = [
    'tree', 
    'dd'
]

const EXECUTION_PATH_FOLDER = '/src/cmd/';

const queue = [];
for (let i = 0; i < pkgList.length; i++) {
    queue.push((async(script) => {
        console.log('GET ' + script);
        const response = await sys.fetchScript(script);
        if(response.status === 404) return this.terminal.log('file not found');
        const text = await response.text();

        console.log('Downloaded ' + script + '.js successfully');
        fs.writeFile(`${EXECUTION_PATH_FOLDER}${script}.js`, text);
        console.log(`Written to ${EXECUTION_PATH_FOLDER}${script}.js`);
    })(pkgList[i]));
}

await Promise.all(queue);
console.log(`Successfully installed ${pkgList.length} package(s)`)