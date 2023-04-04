import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

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
        const user = call.request.user;
        const pass = call.request.pass;
        const id = call.request.id;
        if (Queues[id]) {
          if (Queues[id][0].user === user && Queues[id][0].pass === pass) {
            delete Queues[id];
            callback(null, { status: true, response: "Queue deleted successfully" });
          } else
            callback(null, { status: false, response: "Wrong user or password" });
        } else
          callback(null, { status: false, response: "Queue doesn't exist" }); 
      }
    });
  },

  SendQueue: (call, callback) => {
    console.log(call.request.item);
    //print
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
      if (!err && mainMom != CurrentMoms[i]) {
        mainMom = CurrentMoms[i];
        mainMom.SendQueue({ item: Queues }, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            console.log('Change in the main MOM: ', data.response);
          }
        });
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