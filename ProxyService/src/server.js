import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import fs from 'fs';

dotenv.config()

const PROTO_PATH = process.env.PROTO_PATH;
const MOMS = process.env.MOMS.split(',');
const CurrentMoms = new Array(MOMS.length);
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
    mainMom.GetRequest(call.request, (err, data) => {
      if (err) {
        console.log(err);
        callback(null, { status: false, response: err });
      } else {
        callback(null, { status: true, response: data.response });
      }
    });
  },

  GetQueues: (call, callback) => {
    mainMom.GetQueues(call.request, (err, data) => {
      if (err) {
        console.log(err);
        callback(null, { status: false, response: err });
      } else {
        callback(null, { status: true, response: data.response });
      }
    });
  },

  RemoveQueue: (call, callback) => {
    if (call.request.id === "DELETE") {
      let existingJson = {};
      let id = call.request.pass;
      if (fs.statSync('cache.json').size > 0)
        existingJson = JSON.parse(fs.readFileSync('cache.json'));
      if (existingJson[id]) {
        delete existingJson[id];
        fs.writeFile('cache.json', JSON.stringify(existingJson, null, 4), (err) => {
          if (err)
            console.error(err);
        });
      }
    } else {
      mainMom.RemoveQueue(call.request, (err, data) => {
        if (err) {
          console.log(err);
          callback(null, { status: false, response: err });
        } else {
          callback(null, { status: true, response: data.response });
        }
      });
    }
  },

  CheckOnline: (_, callback) => {
    callback(null, { status: true, response: "Proxy Online" });
  },

  SendQueue: (call, callback) => {
    var JsonComponents = call.request.item.split(';');
    var objId = JsonComponents[0];
    var objBody = JSON.parse(JsonComponents[1]);
    let existingJson = {};
    if (fs.statSync('cache.json').size > 0)
      existingJson = JSON.parse(fs.readFileSync('cache.json'));
    existingJson[objId] = objBody;
    fs.writeFile('cache.json', JSON.stringify(existingJson, null, 4), (err) => {
      if (err)
        console.error(err);
    });
    callback(null, { status: true, response: "New Queue" });
  },
});

const address = "localhost:8081";
server.bindAsync(
  address,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    console.log("Server running at ", address);
    server.start();
  }
);

async function checkMoms() {
  mainMom = null;
  for (let i = 0; i < MOMS.length; i++) {
    CurrentMoms[i].CheckOnline({}, (err, data) => {
      if (!err && mainMom != CurrentMoms[i]) {
        mainMom = CurrentMoms[i];
        let existingJson = {};
        if (fs.statSync('cache.json').size > 0) {
          existingJson = JSON.parse(fs.readFileSync('cache.json'));
          mainMom.SendQueue({ item: existingJson }, (err, data) => {
            if (err)
              console.log(err);
            else
              console.log('Change in the main MOM: ', data.response);

          });
        }
      }
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