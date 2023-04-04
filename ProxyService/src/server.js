import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

dotenv.config()

const PROTO_PATH = process.env.PROTO_PATH;
const MOMS = process.env.MOMS.split(',');
const CurrentMoms = new Array(MOMS.length);
const fs = require('fs');
var mainMom;

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

console.info("Consumer service is started...");
const proto = grpc.loadPackageDefinition(packageDefinition);
const server = new grpc.Server();

server.addService(proto.MOMService.service, {
  GetRequest: (call, callback) => {
    console.log(call.request);
    mainMom.GetRequest(call.request, (err, data) => {
      if (err) {
        console.log(err);
        callback(null, { status: false, response: err });
      } else {
        console.log('Response received from remote service:', data);
        callback(null, { status: true, response: data.response });
      }
    });
  },

  GetQueues: (call, callback) => {
    console.log(call.request);
    mainMom.GetRequest(call.request, (err, data) => {
      if (err) {
        console.log(err);
        callback(null, { status: false, response: err });
      } else {
        var response = "";
        for (const [key, value] of Object.entries(Queues)) {
          response += "||| " + key + " | " + value[1] + " | " + value[0].user + " | " + value[0].method + " |||";
        }
        callback(null, { status: true, response: response });
      }
    });

  },

  RemoveQueue: (call, callback) => {
    console.log(call.request);
    mainMom.GetRequest(call.request, (err, data) => {
      if (err) {
        console.log(err);
        callback(null, { status: false, response: err });
      } else {
        console.log('Response received from remote service:', data);
        callback(null, { status: true, response: data.response });
      }
    });
  },

  SendQueue: (call, callback) => {
    console.log(call.request.item);
    JsonComponents = call.request.item.split(';');
    objId = JSON.parse(JsonComponents[0]);
    objBody= JSON.parse(JsonComponents[1]);
    combine = Object.assign(objId, objBody);
    combine = JSON.stringify(combine);
    existingJson = JSON.parse(fs.readFileSync('cache.json'));
    existingJson.newData=combine;

    fs.writeFile('cache.json', JSON.stringify(existingJson), (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('JSON file updated');
      }
    });

  },
});

server.bindAsync(
  "localhost:8081",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    console.log("Server running at 0.0.0.0:8080");
    server.start();
  }
);

async function checkMoms() {
  mainMom = null;
  for (let i = 0; i < MOMS.length; i++) {
    CurrentMoms[i].CheckOnline({}, (err, data) => {
      if (!err)
        mainMom = CurrentMoms[i];
    });
  }
  await wait(3000);
  checkMoms();
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const momService = grpc.loadPackageDefinition(packageDefinition).MOMService;

function main() {
  for (let i = 0; i < MOMS.length; i++) {
    CurrentMoms[i] = new momService(MOMS[i], grpc.credentials.createInsecure());
  }
  checkMoms();
}

main();