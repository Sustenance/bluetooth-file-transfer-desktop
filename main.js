require('require-rebuild')();
const cp = require('child_process');
const _ = require('lodash');
const clone = require('clone');
const repeat = require('repeat');
const fs = require('fs');
const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();
const crypto = require('crypto');
//this prefix is required to access app resources (such as bt workers) in a packaged app on Max OSX
const RESOURCE_PREFIX = (process.platform === 'darwin' && !process.env.NODE) ? `${process.resourcesPath}/app/` : `./`;
let DEFAULT_SAVE_PREFIX = '';
switch (process.platform) {
  case 'darwin':
    DEFAULT_SAVE_PREFIX = `/Users/${process.env.USER}`;
    break;
  default :
    break;
};
let config = require(`${RESOURCE_PREFIX}config.json`);
config.ignoredDevices = config.ignoredDevices || [];
config.passHash = config.passHash || "This is content";

const electron = require('electron');
const {ipcMain} = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const NOT_IT = 'Not it';
let searchProcess;
let connectedDevices = [];
let connectingThreads = [];


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
global.sharedObject = {
  foundDevices: [],
  ignoredDevices: config.ignoredDevices,
  saveDirectory: config.saveDir || `${DEFAULT_SAVE_PREFIX}/ReceivedFiles`,
  isScanning: true,
  passHash: config.passHash
};

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()


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
  if(searchProcess)
    searchProcess.kill('SIGKILL');
    _.forEach(connectedDevices, (deviceThread)=>{
      deviceThread.kill('SIGKILL');
    });
    _.forEach(connectingThreads, (connectingThread)=> {
      connectingThread.kill('SIGKILL');
    });
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
  refreshRenderer();
})

ipcMain.on('asynchronous-message', (event, arg) => {
  let received = JSON.parse(arg);
  switch(received.action){
    case 'search':
      global.sharedObject.isScanning = received.isScanning;
      repeat(searchForDevices).every(15, 'seconds').start.now();
      break;
    case 'test':
      testConnection(received.address);
      break;
    case 'ignore':
      ignoreDevice(received.address);
      break;
    case 'clearIgnore':
      clearIgnoredDevicesList();
      break;
    case 'dirChange':
      changeSaveDirectory(received.path);
      break;
    case 'password':
      changePassword(received.rawPassword);
    default:
      console.log(`Received unknown command from renderer: ${arg}`);
      break;
  }
  console.log(arg);
});

function changePassword(newPassword){
  let md5sum = crypto.createHash('md5').update(newPassword).digest('hex');
  global.sharedObject.passHash = md5sum;
  saveConfig();
  if(searchProcess){
    searchProcess.kill('SIGKILL');
  }
}

function clearIgnoredDevicesList() {
  global.sharedObject.ignoredDevices = [];
  refreshRenderer();
  saveConfig();
}

function ignoreDevice(address) {
  if(address){
    global.sharedObject.ignoredDevices.push(address);
    global.sharedObject.foundDevices = _.remove(global.sharedObject.foundDevices, function(o) {
      return o.address !== address;
    } );
  }
  refreshRenderer();
}

function changeSaveDirectory(path) {
  console.log(`checking if we can write to ${path}`);
  checkWrite(function(canWrite) {
    if(!canWrite){
      fs.mkdir(path, (err) => {
        if(err){
          console.log("Could not make dir");
        }else {
          checkWrite(function(){});
        }
      });
    }
    refreshRenderer();
    saveConfig();
  })

  function checkWrite(callback) {
    fs.access(path, fs.W_OK, (err) => {
      if(!err){
        console.log(`Changed save dir to ${path}`);
        global.sharedObject.saveDirectory = path;
        config.saveDir = path;
        callback(true);
      }else{
        console.log(`Cannot write to ${path}`);
        console.log(JSON.stringify(err));
        callback(false);
      }
    }); 
  } 
}

function saveConfig() {
  let config = {
    "saveDir": global.sharedObject.saveDirectory,
    "ignoredDevices": global.sharedObject.ignoredDevices,
    "passHash": global.sharedObject.passHash
  }
  fs.writeFile(`${RESOURCE_PREFIX}config.json`, JSON.stringify(config, null, 2), function(err) {
    if(!err){
      console.log("config saved");
    }else{
      console.log(JSON.stringify(err));
    }
  });
}

function refreshRenderer() {
  mainWindow.webContents.send("action", "refresh");
}

function addToFoundDevices(device) {
  if (!_.find(global.sharedObject.foundDevices, function(d) { return (d.address === device.address); }) && 
    !_.includes(global.sharedObject.ignoredDevices, device.address)) {
    global.sharedObject.foundDevices.push(device);
    testConnection(device.address);
  }
}

function searchForDevices() {
  if(searchProcess)
    searchProcess.kill('SIGKILL');
  if(global.sharedObject.isScanning){
    let newEnv = clone(process.env);
    newEnv.PATH = (process.platform === 'darwin') ? newEnv.PATH + ':/usr/local/Cellar/node/6.2.0/bin' : newEnv.PATH;

    let workerPath = `${RESOURCE_PREFIX}bt/bluetoothSearchWorker.js`;
    searchProcess = cp.spawn('node', [workerPath], {
          env: newEnv
        } );
    console.log("spawned");
      searchProcess .stdout.on('data', (data) => {
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
      newEnv.SAVE_DIR = global.sharedObject.saveDirectory;
      newEnv.PASS_HASH = global.sharedObject.passHash;

      let workerPath = `${RESOURCE_PREFIX}bt/bluetoothConnectWorker.js`;
      const bluetoothWorker = cp.spawn('node', [workerPath], {
        env: newEnv
      } );
      console.log(`Spawned for channel ${chan}`);
      connectingThreads.push(bluetoothWorker);

      bluetoothWorker.stdout.on("data", (data) => {
        let device = _.find(global.sharedObject.foundDevices, {"address":address});
        if(data.toString().includes(NOT_IT)){
          if(device){
            device.isConnected = false;
          }
          _.pull(connectingThreads, bluetoothWorker);
          _.pull(connectedDevices, bluetoothWorker);
          bluetoothWorker.kill('SIGKILL');
          console.log("killed on channel" + chan);
          chan++;
          newConnection();
        } else if(data.toString().includes("FINISHED")){
          if(device){
            device.isConnected = false;
            _.pull(connectingThreads, bluetoothWorker);
            _.pull(connectedDevices, bluetoothWorker);
          }
        } else {
          if(device){
            device.isConnected = true;
            connectedDevices.push(bluetoothWorker);
          }
          foundChannel = true;
          data = data.toString();
          console.log(data);
        }
        refreshRenderer();
      });
    }
  }
  newConnection();
}