const express = require('express');
const config = require('config');
const winston = require('./config/winston');
const morgan = require('morgan');
const bodyParser = require('body-parser');
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

const app = express();
app.use(morgan('combined', { stream: winston.stream }));
app.use(bodyParser.json({ type: 'application/json' }));
app.listen(3000, () => {
 console.log("Server running on port 3000");
});

const azureConnection = config.get('AgedCare.azureConnection');


app.post('/device/:id', (req, res) => {
    const deviceId = req.params.id;
    winston.info('Device Id ' + deviceId);
    const bodyData = req.body;
    winston.info('Data ' + JSON.stringify(bodyData));

    // create client
    const connection = azureConnection.connectionString + ';DeviceId=' + deviceId;
    //var connectionString = 'HostName=Itbyuhub.azure-devices.net;DeviceId=agedcaresensor;SharedAccessKey=HLDj0WKExPKwIfLE1gOJQt+PdXwQt9rOZlwij337Tkw=';
   // winston.info('Connection : ' + connection);
    const client = Client.fromConnectionString(connection,Protocol);
    /*client.open(function (err) {
        if (err) {
            winston.info('Could not connect: ' + err);
        } else {
            winston.info('Client connected');
        }
        client.close(function() {
            winston.info('Client closed');
        });
      });*/
  
    // send azure iot message callback
    const messageCallBack = function (err) {

        winston.info('Start callback');

        if(err) {
            winston.error('Could not connect to Azure IOT Hub: ' + err.message);
        } else {
            winston.info('Device to Azure IOT hub connected');
            client.on('message',function(msg) {
                winston.info('Id: ' + msg.messageId + ' Body: ' + msg.data);
                client.complete(msg, printResultFor('completed'));
            });

            const data = JSON.stringify(bodyData);
            const message = new Message(data);
            winston.info('Sending message ' + message.getData());
            client.sendEvent(message, printResultFor('send'));

            client.on('error', function (err) {
               winston.error(err.message);
            });
            
            client.on('disconnect', function () {
               client.removeAllListeners();
               client.open(messageCallBack);
            });
        }
    }
   
    client.open(messageCallBack);


    return res.send('Received a POST HTTP method from device ' + deviceId);
});

function printResultFor(op) {
    return function printResult(err, res) {
        if (err)  winston.info(op + ' error: ' + err.toString());
        if (res)  winston.info(op + ' status: ' + res.constructor.name);
    };
}

app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // add this line to include winston logging
    winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
    // render the error page
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: err
    })
});
