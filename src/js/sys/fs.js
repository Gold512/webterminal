// path syntax
// ~path/* - mounted directory, where the first folder is the name of the mounted directory
// /path/* - OPFS path
// ./path/* - relative path
// 		./../path/* - traversals are allowed

// API Declaration
class FS {
	
	resolveTraversal(currentPath, path) {

	}

	getFile(path) {

	}

	getDirectory(path) {

	}
}

// global singleton instance
export const fs = new FS;

// constructor for untrusted environments
export const FSConstructor = FS;

// external directory mounting will be handled internally and accessible only through paths
// name collisions will result in the older handle being lost as there is no way to differentiate between 
// them without writing identifiers into those directories

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

async function getHandle(type) {
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

        const folderHandle = await showDirectoryPicker();

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