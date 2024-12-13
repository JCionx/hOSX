let current_path = '/';
let selected_folder = '';
let selected_file = '';
let clipboard = '';
let clipboard_type = '';
let clipboard_operation = '';

let paste_btn = document.getElementById('paste-btn');

function requestFiles(path) {
    window.parent.postMessage({ type: 'list_files', path: path }, '*');
    if (current_path == '/'){
        current_path= '';
    } else {
        current_path = path;
    }
}

function up() {
    let path = current_path.split('/');
    path.pop();
    path = path.join('/');
    requestFiles(path);
}

function showPopup(id) {
    popup = document.getElementById(id);
    popup.style.display = 'flex';
    let input = popup.querySelector('input');
    if (input) {
        input.focus();
    }
}

function closePopup(id) {
    popup = document.getElementById(id);
    popup.querySelectorAll('input').forEach(input => input.value = '');
    popup.style.display = 'none';
}

function aboutFolder(path) {
    selected_folder = path;
    let folderName = path.split('/').filter(Boolean).pop();
    document.querySelector('#folder-info-popup #folder-name').innerHTML = folderName;
    showPopup('folder-info-popup');
}

function aboutFile(path) {
    selected_file = path;
    let fileName = path.split('/').filter(Boolean).pop();
    document.querySelector('#file-info-popup #file-name').innerHTML = fileName;
    showPopup('file-info-popup');
}

function newFolder(popup) {
    let input = popup.querySelector('#folder-name');
    let folderName = input.value;
    input.value = '';
    popup.style.display = 'none';
    if (folderName) {
        window.parent.postMessage({ type: 'new_folder', path: current_path + '/' + folderName }, '*');
        requestFiles(current_path);
    }
}

function renameFolder(popup) {
    let input = popup.querySelector('#folder-name');
    let folderName = input.value;
    input.value = '';
    popup.style.display = 'none';
    if (folderName) {
        window.parent.postMessage({ type: 'move_folder', path: selected_folder, dest: current_path + '/' + folderName }, '*');
        requestFiles(current_path);
    }
}

function renameFile(popup) {
    let input = popup.querySelector('#file-name');
    let fileName = input.value;
    input.value = '';
    popup.style.display = 'none';
    if (fileName) {
        window.parent.postMessage({ type: 'move_file', path: selected_file, dest: current_path + '/' + fileName }, '*');
        requestFiles(current_path);
    }
}

function deleteFolder() {
    if (selected_folder) {
        window.parent.postMessage({ type: 'delete_folder', path: selected_folder }, '*');
        requestFiles(current_path);
    }
}

function deleteFile() {
    if (selected_file) {
        window.parent.postMessage({ type: 'delete_file', path: selected_file }, '*');
        requestFiles(current_path);
    }
}

function copyFolder() {
    clipboard = selected_folder;
    clipboard_type = 'folder';
    clipboard_operation = 'copy';
    paste_btn.removeAttribute('disabled');
}

function copyFile() {
    clipboard = selected_file;
    clipboard_type = 'file';
    clipboard_operation = 'copy';
    paste_btn.removeAttribute('disabled');
}

function cutFolder() {
    clipboard = selected_folder;
    clipboard_type = 'folder';
    clipboard_operation = 'cut';
    paste_btn.removeAttribute('disabled');
}

function cutFile() {
    clipboard = selected_file;
    clipboard_type = 'file';
    clipboard_operation = 'cut';
    paste_btn.removeAttribute('disabled');
}

function paste() {
    let existingNames = Array.from(document.querySelectorAll('#files #filename')).map(el => el.innerText);
    let newName = clipboard.split('/').filter(Boolean).pop();
    let baseName = newName;
    let copyIndex = 1;
    paste_btn.setAttribute('disabled', 'true');

    while (existingNames.includes(newName)) {
        newName = `${baseName} copy${copyIndex > 1 ? ' ' + copyIndex : ''}`;
        copyIndex++;
    }

    if (clipboard_operation == 'copy') {
        if (clipboard_type === 'folder') {
            window.parent.postMessage({ type: 'copy_folder', path: clipboard, dest: current_path + '/' + newName }, '*');
        } else if (clipboard_type === 'file') {
            window.parent.postMessage({ type: 'copy_file', path: clipboard, dest: current_path + '/' + newName }, '*');
        }
    } else if (clipboard_operation == 'cut') {
        if (clipboard_type === 'folder') {
            window.parent.postMessage({ type: 'move_folder', path: clipboard, dest: current_path + '/' + newName }, '*');
        } else if (clipboard_type === 'file') {
            window.parent.postMessage({ type: 'move_file', path: clipboard, dest: current_path + '/' + newName }, '*');
        }
    }

    requestFiles(current_path);
}

function uploadFiles() {
    window.parent.postMessage({ type: 'upload_files', path: current_path }, '*');
}

window.addEventListener('message', function(e) {
    if (e.data.type === 'list_files') {
        const files = e.data.files;
        const filesContainer = document.getElementById('files');
        
        filesContainer.innerHTML = '';
        document.getElementById('path').innerHTML = current_path;

        const defaultFile = document.getElementById('default-file');
        const defaultFolder = document.getElementById('default-folder');

        files.files.forEach(file => {
            let newFile = defaultFile.cloneNode(true);
            newFile.id = '';
            newFile.querySelector('#filename').innerText = file;
            newFile.querySelector('#otherbtn').setAttribute('onclick', 'aboutFile(\'' + current_path + '/' + file + '\')');
            filesContainer.appendChild(newFile);
        });
        files.directories.forEach(folder => {
            let newFolder = defaultFolder.cloneNode(true);
            newFolder.id = '';
            newFolder.querySelector('#filename').innerText = folder;
            newFolder.querySelector('#openbtn').setAttribute('onclick', 'requestFiles(\'' + current_path + '/' + folder + '\')');
            newFolder.querySelector('#otherbtn').setAttribute('onclick', 'aboutFolder(\'' + current_path + '/' + folder + '\')');
            filesContainer.appendChild(newFolder);
        });
    } else if (e.data.type == 'files_uploaded') {
        requestFiles(current_path)
    }
});
    
requestFiles(current_path);
