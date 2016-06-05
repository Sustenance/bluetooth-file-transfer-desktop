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

let fileName,
	fileLength,
	fileChunks,
	fileHash,
	writeStream;
if(address && channel) {

	btSerial.connect(address, channel, function() {

		btSerial.on('data', function(buffer) {
			if(buffer && buffer.toString()){
				let bufString = buffer.toString('utf-8');
				let bufJSON = null;
				try {
					bufJSON = JSON.parse(bufString);
				} catch (e) {

				}
				if(bufString === pw){
					console.log("Pw true");
					isFound = true;
					btSerial.write(new Buffer(JSON.stringify({
						"status": "PASS",
						"pass": pw
					}), 'utf-8'), function(err, bytesWritten) {

					});
				} else if (bufJSON){
					if(bufJSON.name){
						//console.log(bufString);
						//is the metadata
						fileName = bufJSON.name;
						fileLength = bufJSON.length;
						fileChunks = bufJSON.chunks;
						fileHash = bufJSON.hash;
						writeStream = fs.createWriteStream(`${fileName}`);

						writeStream.on('open', function() {
							btSerial.write(new Buffer(JSON.stringify({
								"status": "READY"
							}), "utf-8"), function(err, bytesWritten) {});
						});

						writeStream.on('finish', function() {
							btSerial.close();
							console.log(`WriteStream for ${fileName} closed`);
						});

					} else if(bufJSON.payload) {
						//console.log(bufJSON.payload.toString());
						//is a chunk of file data
						let chunk = bufJSON.chunk;
						let payload = bufJSON.payload ? new Buffer(bufJSON.payload.toString('binary')) : null;
						let hash = bufJSON.hash;

						if(chunk && chunk <= fileChunks){
							if(hash){
								let md5sum = crypto.createHash('md5').update(payload).digest('hex');
								//if md5sum !== hash, ask to resend this chunk
								if(md5sum !== hash){
									btSerial.write(new Buffer(JSON.stringify({
									"status": "RESEND",
									"chunk": chunk
									}), "utf-8"), function(err, bytesWritten) {});
									return;
								}
							}
							writeStream.write(payload);
							btSerial.write(new Buffer(JSON.stringify({
								"status": "READY"
							}), "utf-8"), function(err, bytesWritten) {});

							if(chunk === fileChunks) {
								//was last chunk
								writeStream.end();
							}

						} else {
							//somehow have more chunks than we are supposed to
						}
					}
				} //end of bufJSON
			} 

		}); //end of onData callback

		setTimeout(function() {
			if(!isFound){
				btSerial.close();
				console.log(NOT_IT);
			} else {
				console.log("Am here");
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
