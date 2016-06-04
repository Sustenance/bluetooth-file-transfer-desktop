require('require-rebuild')();
const _ = require('lodash');
const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();
const NOT_IT = "Not it";

//console.log(process.env.ADDR);

// process.on('message', (message) => {
	let address = process.env.ADDR;
	let channel = process.env.CHAN;
	if(address && channel) {
		btSerial.connect(address, channel, function() {
			btSerial.on('data', function(buffer) {
				if(buffer && buffer.toString('utf-8') !== "This is content") {
					btSerial.close();
					console.log(NOT_IT);
				} else {
					btSerial.write(new Buffer('Latitude: Hi', 'utf-8'), function(err, bytesWritten) {
		            });
		            console.log(buffer.toString());
				}
			});
			setTimeout(function() {
				btSerial.close();
				console.log(NOT_IT);
			}, 5000);

		}, function() {
			btSerial.close();
			console.log(NOT_IT);
		});
	}
	btSerial.on('close', function() {
		console.log(NOT_IT);
    })
	// 	btSerial.connect(address, chan, function() {
 //            //console.log('connected');

 //            //require('sleep').sleep(5);
 //            btSerial.write(new Buffer('Latitude: Hi', 'utf-8'), function(err, bytesWritten) {
 //                if (err) console.log(err);
 //            });

 //            btSerial.on('data', function(buffer) {
 //            	if(!buffer.toString('utf-8')){}
 //                console.log(buffer.toString('utf-8'));
 //                if(buffer.toString() === "Welcome"){
 //                	btSerial.write(new Buffer('Latitude: Hi', 'utf-8'), function(err, bytesWritten) {
 //                		if (err) console.log(err);
 //                		btSerial.close();
 //            		});
 //                }
 //            });
 //        }, function () {
 //            	console.log('cannot connect');
 //        });
	// }
	// let doIt = function() {
	// 	btSerial.findSerialPortChannel(address, chan, function(channel) {
	// 		console.log(`Found channel ${channel} on ${address}`);
	//         btSerial.connect(address, channel, function() {
	//             console.log('connected');

	//             btSerial.write(new Buffer('Latitude: Hi', 'utf-8'), function(err, bytesWritten) {
	//                 if (err) console.log(err);
	//             });

	//             btSerial.on('data', function(buffer) {
	//             	if(buffer.toString('utf-8') !== "This is content"){
	//             		chan = channel + 1;
	//             		doIt();
	//             	}else{
	//             		console.log(buffer.toString('utf-8'));
	//             		if(btSerial.isOpen()){
	// 			        	btSerial.close();
	// 			        }
	//             	}
	//             });
	//         }, function () {
	//             console.log('cannot connect');
	//         });

	//     }, function() {
	//         console.log('found nothing');
	//     });
	// };
	// doIt();
	// }else {
	// 	console.log(`Did not get address`);
	// 	console.log(`${JSON.stringify(message)}`);
	// }

	
