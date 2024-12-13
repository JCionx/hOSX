## API usage

### File management (will require permissions)

List files

```js
// Request file listing
window.parent.postMessage({ type: 'list_files', path: path }, '*');

// Get the list of files
window.addEventListener('message', function(e) {
    if (e.data.type === 'list_files') {
        data = e.data.files;
        files = data.files;           // Array with filenames
        directories = directories;  // Array with directory names
    }}
);
```

New folder

```js
window.parent.postMessage({ type: 'new_folder', path: path }, '*');
```

Delete folder

```js
window.parent.postMessage({ type: 'delete_folder', path: path }, '*');
```

Copy folder

```js
window.parent.postMessage({ type: 'copy_folder', path: path, dest: dest }, '*');
```

Move folder

```js
window.parent.postMessage({ type: 'move_folder', path: path, dest: dest }, '*');
```

Delete file

```js
window.parent.postMessage({ type: 'delete_file', path: path }, '*');
```

Copy file

```js
window.parent.postMessage({ type: 'copy_file', path: path, dest: dest }, '*');
```

Move file

```js
window.parent.postMessage({ type: 'move_file', path: path, dest: dest }, '*');
```

Upload single file

```js
window.parent.postMessage({ type: 'upload_file', path: path }, '*');

window.addEventListener('message', function(e) {
    if (e.data.type == 'files_uploaded') {
        console.log("Upload complete!");
    }
});
```

Upload multiple files

```js
window.parent.postMessage({ type: 'upload_files', path: path }, '*');

window.addEventListener('message', function(e) {
    if (e.data.type == 'files_uploaded') {
        console.log("Upload complete!");
    }
});
```