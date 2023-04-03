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
    const [user, pass, mc1, mc2, method] = getRequestValues(call.request);
    if (!mc1)
      callback(null, { status: false, response: mc2 });
    else if (!mc2)
      callback(null, { status: false, response: mc1 });
    if (!mc1 || !mc2)
      return;

    if (user in USERS && USERS[user] === pass) {
      console.log(method);
      const id = v4();
      if (method === "sendString") {
        Queues[id] = [call.request, new Date().toLocaleString()];
        sendString(mc1, mc2, method, id);
        callback(null, { status: true, response: id });
      } else if (method === "sendInt") {
        sendInt(mc1, mc2, 1);
        callback(null, { status: true, response: id });
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

function getRequestValues(request) {
  const user = request.user;
  const pass = request.pass;
  const mc1 = request.mc1;
  //console.log(request);
  if (mc1 <= 0 || mc1 >= maxHosts)
    return [null, null, null, "Invalid number for mc1", null];
  const MC1 = CurrentHosts[mc1];
  const mc2 = request.mc2;
  if (mc2 <= 0 || mc2 >= maxHosts)
    return [null, null, "Invalid number for mc2", null, null];
  const MC2 = CurrentHosts[mc2];
  const method = request.method;
  return [user, pass, MC1, MC2, method];
}

function sendInt(sender, client, n, id) {
  enctyptedNum = caesarCryptog(n);
  sender.SendInt({ num: enctyptedNum }, (err, data) => {
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
  let str = s;
  let result = '';
  for (let i = str.length - 1; i >= 0; i--) {
    let charCode = str.charCodeAt(i);
    let newCharCode = charCode + 13;
    let newChar = String.fromCharCode(newCharCode);
    result += newChar;
  }
  sender.SendString({ item: result }, (err, data) => {
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

function caesarCryptog(unencoded) {
  const unencodedString = unencoded.toString();
  let encoded = '';
  for (let i = 0; i < unencodedString.length; i++) {
    const charCode = unencodedString.charCodeAt(i);
    if (charCode >= 48 && charCode <= 57) {
      const newDigit = ((charCode - 48 + shift) % 10);
      encoded += newDigit.toString();
    } else {
      encoded += unencodedString[i];
    }
  }
  return parseInt(encoded);
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