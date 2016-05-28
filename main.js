require('require-rebuild')();
const _ = require('lodash');
const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

const electron = require('electron');
const {ipcMain} = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
global.sharedObject = {
  foundDevices: []
};

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('asynchronous-message', (event, arg) => {
  switch(arg){
    case 'search':
      searchForDevices();
      break;
    default:
      console.log(`Received unknown command from renderer: ${arg}`);
      break;
  }
  console.log(arg);  // prints "ping"
  event.sender.send('asynchronous-reply', 'pong');
});

function refreshRenderer() {
  mainWindow.webContents.send("action", "refresh");
}

function searchForDevices() {
  btSerial.on('found', function(address, name) {
      console.log(`Found ${name} at ${address}`);
      let device = {
        "name": name,
        "address": address
      };
      if (!_.find(global.sharedObject.foundDevices, function(d) {return d.address === device.address})){
        global.sharedObject.foundDevices.push(device);
        refreshRenderer();
      }
      console.log(`FoundDevices: ${JSON.stringify(global.sharedObject.foundDevices)}`);

  }, function(){
    console.log("found nothing");
  });
  btSerial.inquire();
}