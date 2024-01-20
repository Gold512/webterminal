const fs = include('fs');
const console = include('console');

// install some basic scripts
const pkgList = [
    'tree', 
    'dd'
]

const EXECUTION_PATH_FOLDER = '/src/cmd/';

const queue = [];
for (let i = 0; i < pkgList.length; i++) {
    queue.push((async(script) => {
        const path = `/src/js/cmd/${script}.js`;
        console.log('GET ' + location.origin + path);
        const response = await fetch(path);
        if(response.status === 404) return this.terminal.log('file not found');
        const text = await response.text();

        console.log('Downloaded ' + script + '.js successfully');
        fs.writeFile(`${EXECUTION_PATH_FOLDER}${script}.js`, text);
        console.log(`Written to ${EXECUTION_PATH_FOLDER}${script}.js`);
    })(pkgList[i]));
}

await Promise.all(queue);
console.log(`Successfully installed ${pkgList.length} package(s)`)