import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { v4 } from 'uuid';

dotenv.config()

const PROTO_PATH = process.env.PROTO_PATH;
const HOSTS = process.env.HOSTS.split(',');
const USERS = JSON.parse(process.env.USERS);
const maxHosts = HOSTS.length + 1;
const CurrentHosts = new Array(maxHosts);
const Queues = {};

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

server.addService(proto.MOM.service, {
  GetRequest: (call, callback) => {
    console.log("New request");
    const user = call.request.user;
    const pass = call.request.pass;
    const mc1 = call.request.mc1;
    //console.log(call);
    if (mc1 <= 0 || mc1 >= maxHosts) {
      callback(null, { status: false, response: "Invalid number for mc1" });
      return;
    }
    const MC1 = CurrentHosts[mc1];
    const mc2 = call.request.mc2;
    if (mc2 <= 0 || mc2 >= maxHosts) {
      callback(null, { status: false, response: "Invalid number for mc2" });
      return;
    }
    const MC2 = CurrentHosts[mc2];
    const method = call.request.method;

    if (user in USERS && USERS[user] === pass) {
      console.log(method);
      const id = v4();
      if (method === "sendString") {
        Queues[id] = [call.request, new Date().toLocaleString()];
        sendString(MC1, MC2, method, id);
        callback(null, { status: true, response: method });
      } else if (method === "sendInt") {
        sendInt(MC1, MC2, 1);
        callback(null, { status: true, response: method });
      } else
        callback(null, { status: false, response: "Method doesn't exist" });
    }
    else
      callback(null, { status: false, response: "Wrong user or password" });
  },

  GetQueues: (_, callback) => {
    console.log('GetQueues');
    'use strict'; //https://stackoverflow.com/questions/34913675/how-to-iterate-keys-values-in-javascript
    var response = "";
    for (const [key, value] of Object.entries(Queues)) {
      response += "||| " + key + " | " + value[1] + " | " + value[0].user + " | " + value[0].method + " |||";

    }
    callback(null, { status: true, response: response });
  },

  RemoveQueue: (call, callback) => {
    console.log('RemoveQueue');
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
  },
});

server.bindAsync(
  "127.0.0.1:8080",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    console.log("Server running at 127.0.0.1:8080");
    server.start();
  }
);

function sendInt(sender, client, n, id) {
  sender.SendInt({ num: n }, (err, data) => {
    if (err) {
      if (Queues[id]) {
        console.log("MicroServicio desconectado, reintentando conexion en 5s");
        setTimeout(function () {
          sendInt(sender, client, n, id)
        }, 5000);
      }
    } else {
      console.log('Recived String:', data["response"]); // API response
      if (Queues[id])
        sendString(client, sender, data["response"], id);
    }
  });
}

function sendString(sender, client, s, id) {
  sender.SendString({ item: s }, (err, data) => {
    if (err) {
      if (Queues[id]) {
        console.log("MicroServicio desconectado, reintentando conexion en 5s");
        setTimeout(function () {
          sendString(sender, client, s, id);
        }, 5000);
      }
    } else {
      console.log('Recived Int:', data["response"]); // API response
      if (Queues[id])
        sendInt(client, sender, data["response"], id);
    }
  });
}

const microService = grpc.loadPackageDefinition(packageDefinition).MicroService;

function main() {
  const mc = null;
  var count = 1;
  for (const host in HOSTS) {
    console.log(host);
    CurrentHosts[count] = new microService(host, grpc.credentials.createInsecure());
    count++;
  }
  //sendInt(CurrentHosts[1], CurrentHosts[2], 2);
  console.log("Bien");
  //sendString(mc1, mc2, "Bien ");
};

main();