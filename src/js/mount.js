import { get, set } from 'https://unpkg.com/idb-keyval@5.0.2/dist/esm/index.js';
import { log, setRoot } from './sys.js';

async function verifyPermission(fileHandle, withWrite) {
    const opts = {};
    if (withWrite) {
      opts.mode = "readwrite";
    }
  
    // Check if we already have permission, if so, return true.
    if ((await fileHandle.queryPermission(opts)) === "granted") {
      return true;
    }
  
    // Request permission to the file, if the user grants permission, return true.
    if ((await fileHandle.requestPermission(opts)) === "granted") {
      return true;
    }
  
    // The user did not grant permission, return false.
    return false;
}

export async function getHandle(type) {
    try {
        const fileHandleOrUndefined = type === 'new' ? undefined : await get('file');    
        if (fileHandleOrUndefined) {
            log(`Retrieved file handle "${fileHandleOrUndefined.name}" from IndexedDB.`);
            
            let permission = await verifyPermission(fileHandleOrUndefined, true);
            if(!permission) {
                log('permission denied');
                return;
            }
            
            setRoot(fileHandleOrUndefined);
            return;
        }

        const folderHandle = await window.showDirectoryPicker();

        let permission = await verifyPermission(folderHandle, true);
        if(!permission) {
            log('permission denied');
            return;
        }
      
        await set('file', folderHandle);    
        log(`Stored file handle for "${folderHandle.name}" in IndexedDB.`);
        setRoot(folderHandle);
        
    } catch (error) {
        console.error(error)
    }
}

window.getHandle = getHandle;