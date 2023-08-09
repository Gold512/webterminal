import { error } from "../sys.js";

export function install(type, source = '') {
    switch (type) {
        case 'file':
            let [file] = window.showOpenFilePicker();
            if(!file) return error('No file selected');

            
            break;
    
        default:
            break;
    }
}

export function uninstall() {

}