import { log } from "../sys.js";

function askForFile(ext) {
    if(ext && typeof Object.prototype.toString.call(ext) == '[object Array]') ext = ext.join(',');
    let e = document.createElement('input');
    e.setAttribute('type', 'file');

    if(ext) e.setAttribute('accept', ext);

    e.click();

    return new Promise(function(resolve, reject) {
        e.addEventListener('input', ev => {
            if(e.files) {
                resolve(e.files);
                return;
            }

            reject('no file selected');
        })
    })
}

export default async function(find, replace) {
    const files = await askForFile('.zip')
    if(!files) return log('no zip file selected');
    
    let changes = 0;

    const zip = await JSZip.loadAsync(files[0]);

    // const newZip = new JSZip();
    const completionQueue = [];
    const folderPaths = [];

    zip.forEach(async (path, file) => {
        if(!path.includes(find)) return;

        if(file.dir) {
            folderPaths.push(path)
            return;
        }

        let resolve;
        completionQueue.push(new Promise(res => {
            resolve = res;
        }))

        const newPath = path.replaceAll(find, replace);

        log(`rename: ${path} -> ${newPath}`);
        changes++;

        const fileData = await file.async('blob');

        zip.file(newPath, fileData);
        zip.remove(path);
        resolve();
    });

    await Promise.all(completionQueue);

    // clear folders
    for (let i = 0; i < folderPaths.length; i++) {
        const e = folderPaths[i];
        zip.remove(e);
    }

    log(`Successfully modified ${changes} entries, now downloading...`)

    saveAs(await zip.generateAsync({
        type: 'blob'
    }), `${files[0].name.replace('.zip', '')} Modified.zip`);
}