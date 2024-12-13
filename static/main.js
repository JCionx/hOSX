let open_apps = [];
let minimized_apps = [];
let current_z_index = 10;   
let last_window = "";
let frame_uploading_files = "";

function disableWindowInteractions() {
    open_apps.forEach(appId => {
        const appElement = document.getElementById(appId);
        if (appElement) {
            appElement.querySelector('.resizers').style.pointerEvents = 'auto';
        }
    });
}

function enableWindowInteractions() {
    open_apps.forEach(appId => {
        const appElement = document.getElementById(appId);
        if (appElement) {
            appElement.querySelector('.resizers').style.pointerEvents = 'none';
        }
    });
}

function makeResizableWindow(element) {
    const resizers = element.querySelectorAll('.resizer');
    const min_width = 512;
    const min_height = 410;
    let original_width = 0;
    let original_height = 0;
    let original_x = 0;
    let original_y = 0;
    let original_mouse_x = 0;
    let original_mouse_y = 0;

    for (let i = 0; i < resizers.length; i++) {
        const currentResizer = resizers[i];
        currentResizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
            original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
            original_x = element.getBoundingClientRect().left;
            original_y = element.getBoundingClientRect().top;
            original_mouse_x = e.pageX;
            original_mouse_y = e.pageY;
            disableWindowInteractions()
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        });

        function resize(e) {
            if (currentResizer.classList.contains('bottom-right')) {
                const width = original_width + (e.pageX - original_mouse_x);
                const height = original_height + (e.pageY - original_mouse_y);
                if (width > min_width) {
                    element.style.width = width + 'px';
                }
                if (height > min_height) {
                    element.style.height = height + 'px';
                }
            } else if (currentResizer.classList.contains('bottom-left')) {
                const height = original_height + (e.pageY - original_mouse_y);
                const width = original_width - (e.pageX - original_mouse_x);
                if (height > min_height) {
                    element.style.height = height + 'px';
                }
                if (width > min_width) {
                    element.style.width = width + 'px';
                    element.style.left = original_x + (e.pageX - original_mouse_x) + 'px';
                }
            } else if (currentResizer.classList.contains('top-right')) {
                const width = original_width + (e.pageX - original_mouse_x);
                const height = original_height - (e.pageY - original_mouse_y);
                if (width > min_width) {
                    element.style.width = width + 'px';
                }
                if (height > min_height) {
                    element.style.height = height + 'px';
                    element.style.top = original_y + (e.pageY - original_mouse_y) + 'px';
                }
            } else {
                const width = original_width - (e.pageX - original_mouse_x);
                const height = original_height - (e.pageY - original_mouse_y);
                if (width > min_width) {
                    element.style.width = width + 'px';
                    element.style.left = original_x + (e.pageX - original_mouse_x) + 'px';
                }
                if (height > min_height) {
                    element.style.height = height + 'px';
                    element.style.top = original_y + (e.pageY - original_mouse_y) + 'px';
                }
            }
        }

        function stopResize() {
            window.removeEventListener('mousemove', resize);
            enableWindowInteractions()
        }
    }
}

function makeDraggableWindow(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (elmnt.querySelector(".title-bar")) {
        // if present, the header is where you move the DIV from:
        elmnt.querySelector(".title-bar").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }
  
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
        disableWindowInteractions()
    }
  
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
  
    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        enableWindowInteractions()
    }
}

function setLastAppOpen(window) {
    last_window = window.id;
    current_z_index++;
    window.style.zIndex = current_z_index;
}

function openApp(id) {
    if (open_apps.includes(id)) {
        return;
    }

    // request the json file under /app/<id>/info.json
    fetch('/app/' + id + '/info.json')
        .then(response => response.json())
        .then(data => {
            title = data.title;
            icon = data.icon;
            url = "/app/" + id + "/" + data.url;
            createWindow(id, title, url, icon);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function createWindow(id, title, url, icon) {
    if (open_apps.includes(id)) {
        return;
    }

    let newWindow = document.getElementById("default-window").cloneNode(true)
    newWindow.id = id;
    newWindow.querySelector("#title").innerHTML = title;
    newWindow.querySelector("iframe").src = url;
    newWindow.style.display = "flex";
    newWindow.style.zIndex = current_z_index;
    current_z_index++;
    last_window = id;
    document.getElementById("windows").appendChild(newWindow);
    makeDraggableWindow(newWindow);
    makeResizableWindow(newWindow);
    newWindow.addEventListener('mousedown', function() {
        setLastAppOpen(this);
    });
    open_apps.push(id);
}

async function list_files(path) {
    try {
        const response = await fetch('/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function new_folder(path) {
    try {
        const response = await fetch('/new_folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function delete_folder(path) {
    try {
        const response = await fetch('/delete_folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function delete_file(path) {
    try {
        const response = await fetch('/delete_file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function copy_folder(path, dest) {
    try {
        const response = await fetch('/copy_folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path,
                'dest': dest
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function copy_file(path, dest) {
    try {
        const response = await fetch('/copy_file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path,
                'dest': dest
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function move_folder(path, dest) {
    try {
        const response = await fetch('/move_folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path,
                'dest': dest
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function move_file(path, dest) {
    try {
        const response = await fetch('/move_file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'path': path,
                'dest': dest
            })
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function uploadFiles(path, files) {
    const formData = new FormData();
    formData.append('path', path);
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log('Upload successful:', data);
        frame_uploading_files.source.postMessage({ type: 'files_uploaded' }, frame_uploading_files.origin);
    } catch (error) {
        console.error('Error:', error);
    }
}

document.querySelector('#form-multiple-files input[name="files"]').addEventListener('change', function(event) {
    const path = document.querySelector('#form-multiple-files input[name="path"]').value;
    const files = event.target.files;
    uploadFiles(path, files);
});

document.querySelector('#form-single-file input[name="file"]').addEventListener('change', function(event) {
    const path = document.querySelector('#form-multiple-files input[name="path"]').value;
    const files = event.target.files;
    uploadFiles(path, files);
});

async function upload_files(path) {
    document.querySelector('#form-multiple-files input[name="path"]').value = path;
    document.querySelector('#form-multiple-files input[name="files"]').click();
}

async function upload_file(path) {
    document.querySelector('#form-single-file input[name="path"]').value = path;
    document.querySelector('#form-single-file input[name="file"]').click();
}

// receive message from child iframe for the list_files(path) function, receiving a path
window.addEventListener('message', function(e) {
    if (e.data.type === 'list_files') {
        const path = e.data.path;
        list_files(path).then(files => {
            e.source.postMessage({ type: 'list_files', files: files }, e.origin);
        });
    } else if (e.data.type === 'new_folder') {
        const path = e.data.path;
        new_folder(path)
    } else if (e.data.type === 'delete_folder') {
        const path = e.data.path;
        delete_folder(path);
    } else if (e.data.type === 'delete_file') {
        const path = e.data.path;
        delete_file(path);
    } else if (e.data.type === 'copy_folder') {
        const path = e.data.path;
        const dest = e.data.dest;
        copy_folder(path, dest);
    } else if (e.data.type === 'copy_file') {
        const path = e.data.path;
        const dest = e.data.dest;
        copy_file(path, dest);
    } else if (e.data.type === 'move_folder') {
        const path = e.data.path;
        const dest = e.data.dest;
        move_folder(path, dest);
    } else if (e.data.type === 'move_file') {
        const path = e.data.path;
        const dest = e.data.dest;
        move_file(path, dest);
    } else if (e.data.type === 'upload_files') {
        frame_uploading_files = e;
        const path = e.data.path;
        upload_files(path);
    } else if (e.data.type === 'upload_file') {
        const path = e.data.path;
        upload_file(path);
    }
});