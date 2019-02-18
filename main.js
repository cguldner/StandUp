const {app, ipcMain, BrowserWindow, Menu, Tray, Notification} = require('electron');
const path = require('path');

let win, tray, contextMenu, standTimer;
let timeUntilNextBreak = 0;

let settings = {
    breakLength: 30,            // In seconds
    timeBetweenBreaks: 20,      // In minutes
    notificationPreTime: 60,    // In seconds
    aggressiveMode: false,
    quietMode: false
};

// Needed to show notifications on Windows
// app.setAppUserModelId(process.execPath);
app.setUserTasks([{
    program: process.execPath,
    arguments: '--new-window',
    iconPath: process.execPath,
    iconIndex: 0,
    title: 'New Window',
    description: 'Create a new window'
}]);

app.on('ready', () => {
    createWindow();
    createTrayIcon();
});

function createWindow() {
    win = new BrowserWindow({
        width: 500,
        height: 500,
        frame: false,
        transparent: true,
        minWidth: 400,
        minHeight: 400,
        icon: path.join(__dirname, 'tray_icon.png')
    });
    win.loadFile('app/index.html');

    win.on('close', e => {
        e.preventDefault();
        win.hide();
    });
    win.webContents.once('dom-ready', () => createTimer(settings.timeBetweenBreaks));
}

function createTrayIcon() {
    tray = new Tray(path.join(__dirname, 'tray_icon.png'));
    contextMenu = Menu.buildFromTemplate([
        {
            label: 'Mode', type: 'submenu', submenu: [
                {
                    label: 'Normal', type: 'radio', click: (item, w, e) => {
                        settings.quietMode = false;
                        settings.aggressiveMode = false;
                    }
                },
                {
                    label: 'Aggressive', type: 'radio', click: (item, w, e) => {
                        settings.quietMode = false;
                        settings.aggressiveMode = true;
                    }
                },
                {
                    label: 'Quiet', type: 'radio', click: (item, w, e) => {
                        settings.quietMode = true;
                        settings.aggressiveMode = false;
                    }
                }
            ]
        },
        {
            label: 'Disable', type: 'checkbox', click: (item, w, e) => {
                if (item.checked) {
                    clearTimer();
                    updateTimeUntilBreak(-1);
                } else {
                    updateTimeUntilBreak(settings.timeBetweenBreaks);
                }
            }
        },
        {
            label: 'Quit', type: 'normal', click: (item, w, e) => {
                app.quit();
                win.destroy();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`Next break in ${timeUntilNextBreak} minutes.`);
    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show();
    })
}

function createNotification() {
    if (Notification.isSupported()) {
        let note = new Notification({
            title: 'Break Coming Up',
            body: 'Get ready to stand!',
            icon: path.join(__dirname, 'tray_icon.png')
        });
        note.show();
    }
}

function updateTimeUntilBreak(time) {
    timeUntilNextBreak = time;
    let htmlMessage = `Next break is in <span class="timeUntilBreak">${time}</span> minutes.`;
    let tooltipMessage = `Next break in ${timeUntilNextBreak} minutes.`;
    if (time === 0) {
        htmlMessage = 'Break is happening right now!';
        tooltipMessage = 'On Break';
        win.show();
        clearTimer();
        setTimeout(() => createTimer(settings.timeBetweenBreaks), settings.breakLength * 1000);
    } else if (time === -1) {
        htmlMessage = 'Currently disabled.';
        tooltipMessage = 'Currently disabled.';
    } else if ((time * 60) === settings.notificationPreTime && !settings.quietMode) {
        createNotification();
    }
    win.webContents.send('time', htmlMessage);
    tray.setToolTip(tooltipMessage);
}

function createTimer(timeInMinutes) {
    updateTimeUntilBreak(timeInMinutes);
    standTimer = setInterval(() => updateTimeUntilBreak(timeUntilNextBreak - 1), 60 * 1000);
}

function clearTimer() {
    clearInterval(standTimer);
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
});
