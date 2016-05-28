//require('require-rebuild')();
const _ = require('lodash');
const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

process.on('message', (message) => {
	let address = message.address;
	if(address) {
		btSerial.connect("10:d3:8a:ab:b1:42", 6, function() {
	            console.log('connected');

	            //require('sleep').sleep(5);
	            btSerial.write(new Buffer('Latitude: Hi', 'utf-8'), function(err, bytesWritten) {
	                if (err) console.log(err);
	            });

	            btSerial.on('data', function(buffer) {
	                console.log(buffer.toString('utf-8'));
	            });
	        }, function () {
	            console.log('cannot connect');
	        });

	        if(btSerial.isOpen()){
	        	btSerial.close();
	        }
		// btSerial.findSerialPortChannel(address, function(channel) {
		// 	console.log(`Found channel ${channel} on ${address}`);
	 //        btSerial.connect(address, channel, function() {
	 //            console.log('connected');

	 //            require('sleep').sleep(5);
	 //            // btSerial.write(new Buffer('Latitude: Hi', 'utf-8'), function(err, bytesWritten) {
	 //            //     if (err) console.log(err);
	 //            // });

	 //            // btSerial.on('data', function(buffer) {
	 //            //     console.log(buffer.toString('utf-8'));
	 //            // });
	 //        }, function () {
	 //            console.log('cannot connect');
	 //        });

	 //        if(btSerial.isOpen()){
	 //        	btSerial.close();
	 //        }
	 //    }, function() {
	 //        console.log('found nothing');
	 //    });
	}else {
		console.log(`Did not get address`);
		console.log(`${JSON.stringify(message)}`);
	}
});
