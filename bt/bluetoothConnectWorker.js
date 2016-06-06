require('require-rebuild')();
const _ = require('lodash');
const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();
const fs = require('fs');
const crypto = require('crypto');
const NOT_IT = "Not it";
const pw = "This is content";

let address = process.env.ADDR;
let channel = process.env.CHAN;
let isFound = false;
let lastChunk = -1;

let fileName,
	fileLength,
	fileChunks,
	fileHash,
	writeStream,
	foundData;
if(address && channel) {

	btSerial.connect(address, channel, function() {

		btSerial.on('data', function(buffer) {
			if(buffer && buffer.toString()){
				let bufString = buffer.toString('utf-8');
				foundData += bufString;
				let bufJSON = null;
				try {
					bufJSON = JSON.parse(foundData);
				} catch (e) {

				}
				if(bufString === pw){
					foundData = "";
					console.log("Pw true");
					isFound = true;
					btSerial.write(new Buffer(JSON.stringify({
						"status": "PASS",
						"pass": pw
					}), 'utf-8'), function(err, bytesWritten) {

					});
				} else if (bufJSON){
					if(bufJSON.name){
						console.log(foundData);
						//is the metadata
						fileName = bufJSON.name;
						fileLength = bufJSON.length;
						fileChunks = bufJSON.chunks;
						fileHash = bufJSON.hash;
						writeStream = fs.createWriteStream(`${fileName}`);

						writeStream.on('open', function() {
							foundData = "";
							btSerial.write(new Buffer(JSON.stringify({
								"status": "READY",
								"lastChunk": "-1"
							}), "utf-8"), function(err, bytesWritten) {});
						});

						writeStream.on('finish', function() {
							btSerial.close();
							console.log(`WriteStream for ${fileName} closed`);
						});

					} else if(bufJSON.payload) {
						console.log(`Got ${bufJSON.chunk}`);
						//is a chunk of file data
						let chunk = bufJSON.chunk;
						let payload = bufJSON.payload ? bufJSON.payload.toString('hex') : null;
						let hash = bufJSON.hash;

						if(chunk && chunk < fileChunks){
							if(hash){
								let md5sum = crypto.createHash('md5').update(payload).digest('hex');
								//if md5sum !== hash, ask to resend this chunk
								if(md5sum !== hash){
									foundData = "";
									btSerial.write(new Buffer(JSON.stringify({
									"status": "RESEND",
									"lastChunk": `${chunk}`
									}), "utf-8"), function(err, bytesWritten) {});
									return;
								}
								console.log(`Checksum OK`);
							}
							payload = new Buffer(payload, 'hex');
							foundData = "";
							writeStream.write(payload);

							if(chunk === (fileChunks - 1)) {
								console.log(`wrote all chunks`);
								//was last chunk
								writeStream.end();
							} else {
								btSerial.write(new Buffer(JSON.stringify({
									"status": "READY",
									"lastChunk": `${chunk}`
								}), "utf-8"), function(err, bytesWritten) {});
							}

						} else {
							writeStream.end();
							//somehow have more chunks than we are supposed to
						}
					} 
				}  //end of bufJSON
			} 

		}); //end of onData callback

		setTimeout(function() {
			if(!isFound){
				btSerial.close();
				console.log(NOT_IT);
			} 
		}, 5000);

	}, function() {
		btSerial.close();
		console.log(NOT_IT);
	});  //end of onConnect
}

btSerial.on('close', function() {
	console.log(NOT_IT);
});
