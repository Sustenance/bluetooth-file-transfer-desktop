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


    $scope.getDevices = function () {
        let message = JSON.stringify({
            "action": "search"
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

    function refresh() {
        $scope.foundDevices = remote.getGlobal('sharedObject').foundDevices;
        $scope.$apply();
        console.log(`${JSON.stringify($scope.foundDevices)}`);
    }

});
