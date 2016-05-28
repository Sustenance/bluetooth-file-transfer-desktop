require('require-rebuild')();
const {ipcRenderer} = require('electron');
const {remote} = require('electron');

let app = angular.module('myApp', []);
app.controller('myCtrl', function($scope) {
    $scope.foundDevices = [];

    ipcRenderer.on('action', (event, message) => {
        console.log(`Message received: ${message}`);
        switch(message) {
            case 'refresh':
                refresh();
                break;
            default:
                console.log(`Recieved an unknown action ${message}`);
                break;
        }
    });
    // This file is required by the index.html file and will
    // be executed in the renderer process for that window.
    // All of the Node.js APIs are available in this process.
    function refresh() {
        $scope.foundDevices = remote.getGlobal('sharedObject').foundDevices;
        $scope.$apply();
        console.log(`${JSON.stringify($scope.foundDevices)}`);
    }

    function getDevices() {
        ipcRenderer.send('asynchronous-message', 'search');
    }

    document.getElementById("deviceSearchBtn").addEventListener("click", getDevices);
});
