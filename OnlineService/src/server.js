import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { v4 } from 'uuid';

dotenv.config()

const PROTO_PATH = process.env.PROTO_PATH;
const MOMS = process.env.MOMS.split(',');
const HOSTS = process.env.HOSTS.split(',');
const USERS = JSON.parse(process.env.USERS);
const CurrentMoms = new Array(MOMS.length);
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

server.addService(proto.MOMService.service, {
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
        let str = method;
        let result = '';
        for (let i = str.length - 1; i >= 0; i--) {
          let charCode = str.charCodeAt(i);
          let newCharCode = charCode + 13;
          let newChar = String.fromCharCode(newCharCode);
          result += newChar;
        }
        sendString(mc1, mc2, result, id);
        callback(null, { status: true, response: id });
      } else if (method === "sendInt") {
        encoded = caesarCryptog(1); //Aca iria un input de int en vez del numero quemado si se va a hacer ese cambio
        sendInt(mc1, mc2, encoded, id);
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

  CheckOnline: (_, callback) => {
    console.log("CheckOnline");
    callback(null, { status: true, response: "MOM functional" });
  },
});

server.bindAsync(
  "0.0.0.0:8080",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    console.log("Server running at 0.0.0.0:8080");
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

function checkMom(mom) {
  mom.CheckOnline({}, (err, data) => {
    if (!err) {
      console.log("MOM!");
    }
  });
}

function checkMoms() {
  console.log("checkMoms");
  //var availableMoms = 0;
  for (let i = 0; i < MOMS.length; i++) {
    checkMom(CurrentMoms[i]);
  }
  //console.log('Available MOMs: ', availableMoms);
}

const microService = grpc.loadPackageDefinition(packageDefinition).MicroService;
const momService = grpc.loadPackageDefinition(packageDefinition).MOMService;

function main() {
  for (let i = 0; i < MOMS.length; i++) {
    CurrentMoms[i] = new momService(MOMS[i], grpc.credentials.createInsecure());
    console.log(MOMS[i]);
  }
  for (let i = 0; i < HOSTS.length; i++) {
    CurrentHosts[i + 1] = new microService(HOSTS[i], grpc.credentials.createInsecure());
    console.log(HOSTS[i]);
  }
  //sendInt(CurrentHosts[1], CurrentHosts[2], 2);
  console.log("Bien");
  //sendString(mc1, mc2, "Bien ");
  checkMoms();

  CurrentMoms[0].CheckOnline({}, (err, data) => {
    if (!err) {
      console.log("MOM funciona");
    }
    console.log(err, data);
  });

};

main();