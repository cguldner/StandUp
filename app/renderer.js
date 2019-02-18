const {ipcRenderer, remote} = require('electron');

ipcRenderer.on('time', (event, message) => {
    document.getElementsByClassName('message')[0].innerHTML = message;
});

document.getElementsByClassName('minimize')[0].addEventListener('click', function (e) {
    remote.getCurrentWindow().minimize();
});
document.getElementsByClassName('close')[0].addEventListener('click', function (e) {
    remote.getCurrentWindow().close();
});
