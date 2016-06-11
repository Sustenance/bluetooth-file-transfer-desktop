require('require-rebuild')();
const {ipcRenderer} = require('electron');
const {remote} = require('electron');

let app = angular.module('myApp', []);
app.controller('myCtrl', function($scope) {
    $scope.foundDevices = [];
    $scope.saveDirectory = "";
    $scope.isScanning = true;

    ipcRenderer.on('action', (event, message) => {
        console.log(`Message received: ${message}`);
        switch(message) {
            case 'refresh':
                refresh();
                break;
            default:
                console.log(`Received an unknown action ${message}`);
                break;
        }
    });


    $scope.changeScanning = function () {
        let message = JSON.stringify({
            "action": "search",
            "isScanning": $scope.isScanning
        });
        ipcRenderer.send('asynchronous-message', message);
    }

    $scope.testConnection = function(device) {
        let message = JSON.stringify({
            "action": "test",
            "address": device.address
        });
        ipcRenderer.send('asynchronous-message', message);
    }

    $scope.changeDirectory = function() {
        console.log(`Direct now ${$scope.saveDirectory}`);
        let message = JSON.stringify({
            "action": "dirChange",
            "path": $scope.saveDirectory
        });
        ipcRenderer.send('asynchronous-message', message);
    }

    $scope.ignoreDevice = function(device) {
        console.log(`Ignoring ${device.name} forever`);
        let message = JSON.stringify({
            "action": "ignore",
            "address": device.address
        });
        ipcRenderer.send('asynchronous-message', message);
    }

    function refresh() {
        $scope.foundDevices = remote.getGlobal('sharedObject').foundDevices;
        $scope.saveDirectory = remote.getGlobal('sharedObject').saveDirectory;
        $scope.$apply();
        console.log(`${JSON.stringify($scope.foundDevices)}`);
    }

    $scope.changeScanning();
});
