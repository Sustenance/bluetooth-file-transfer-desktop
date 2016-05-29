require('require-rebuild')();
const _ = require('lodash');
const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

let foundDevices = [];

function searchForDevices() {
  btSerial.on('found', function(address, name) {
      //console.log(`Found ${name} at ${address}`);
      let device = {
        "name": name,
        "address": address
      };
      if (!_.find(foundDevices, function(d) {return d.address === device.address})){
        foundDevices.push(device);
        console.log(JSON.stringify({
        	"what": "device",
        	"payload": device
        }));
      }
  }, function(){
    process.exit(0);
    //console.log("found nothing");
  });
  btSerial.inquire();
}

searchForDevices();