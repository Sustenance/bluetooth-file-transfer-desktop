require('require-rebuild')();
const cp = require('child_process');
const _ = require('lodash');
const clone = require('clone');
const repeat = require('repeat');
const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

const electron = require('electron');
const {ipcMain} = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const NOT_IT = 'Not it';

//this prefix is required to access app resources (such as bt workers) in a packaged app on Max OSX
const RESOURCE_PREFIX = (process.platform === 'darwin' && !process.env.NODE) ? `${process.resourcesPath}/app/` : `./`;



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
global.sharedObject = {
  foundDevices: [],
  saveDir: '~/ReceivedFiles'
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
  let received = JSON.parse(arg);
  switch(received.action){
    case 'search':
      repeat(searchForDevices).every(1, 'minutes').start.now();
      break;
    case 'test':
      testConnection(received.address);
      break;
    default:
      console.log(`Received unknown command from renderer: ${arg}`);
      break;
  }
  console.log(arg);
});

function refreshRenderer() {
  mainWindow.webContents.send("action", "refresh");
}

function addToFoundDevices(device) {
  if (!_.find(global.sharedObject.foundDevices, function(d) {return d.address === device.address})){
        global.sharedObject.foundDevices.push(device);
  }
}

function searchForDevices() {
  let newEnv = clone(process.env);
  newEnv.PATH = (process.platform === 'darwin') ? newEnv.PATH + ':/usr/local/Cellar/node/6.2.0/bin' : newEnv.PATH;

  let workerPath = `${RESOURCE_PREFIX}bt/bluetoothSearchWorker.js`;
  const bluetoothWorker = cp.spawn('node', [workerPath], {
        env: newEnv
      } );
  console.log("spawned");
    bluetoothWorker.stdout.on('data', (data) => {
      console.log(`${data.toString()}`);
      try{
        data = JSON.parse(data.toString());
        console.log(data.device);
        switch(data.what) {
          case 'devices':
            global.sharedObject.foundDevices = _.get(data, 'payload', []);
          case 'device':
            addToFoundDevices(data.payload);
            break;
          default:
            console.log(`Received unknown message from btWorker ${JSON.stringify(message)}`);
            break;
        }
        refreshRenderer();
      }catch (error){
        console.log(error);
      }
    });
}

function testConnection(address) {
  let foundChannel = false;
  let chan = 1;
  
  function newConnection() {
    if(!foundChannel && chan <= 31){
      let newEnv = clone(process.env);
      newEnv.ADDR = address;
      newEnv.CHAN = chan;
      newEnv.PATH = (process.platform === 'darwin') ? newEnv.PATH + ':/usr/local/Cellar/node/6.2.0/bin' : newEnv.PATH;

      let workerPath = `${RESOURCE_PREFIX}bt/bluetoothConnectWorker.js`;
      const bluetoothWorker = cp.spawn('node', [workerPath], {
        env: newEnv
      } );
      console.log(`Spawned for channel ${chan}`);
      bluetoothWorker.stdout.on("data", (data) => {
        if(data.toString().includes(NOT_IT)){
          bluetoothWorker.kill('SIGKILL');
          console.log("killed on channel" + chan);
          chan++;
          newConnection();
        } else {
          foundChannel = true;
          data = data.toString();
          console.log(data);
        }
      });
    }
  }
  newConnection();
}