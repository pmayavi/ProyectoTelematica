import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

dotenv.config()

const PROTO_PATH = process.env.PROTO_PATH;
const HOSTS = process.env.HOSTS.split(',');
const USERS = JSON.parse(process.env.USERS);
const maxHosts = HOSTS.length + 1;
const CurrentHosts = new Array(maxHosts);

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
    console.log("New conection");
    const user = call.request.user;
    const pass = call.request.pass;
    const mc1 = call.request.mc1;
    console.log(mc1);
    console.log(mc1 <= 0 || mc1 >= maxHosts);
    if (mc1 <= 0 || mc1 >= maxHosts) {
      callback(null, { status: false, response: "Invalid number for mc1" });
      return;
    }
    const MC1 = CurrentHosts[mc1];
    const mc2 = call.request.mc2;
    console.log(mc2);
    console.log(mc2 <= 0 || mc2 >= maxHosts);
    if (mc2 <= 0 || mc2 >= maxHosts) {
      callback(null, { status: false, response: "Invalid number for mc2" });
      return;
    }
    const MC2 = CurrentHosts[mc2];
    const method = call.request.method;

    if (user in USERS && USERS[user] === pass) {
      if (method === "sendString") {
        console.log(method);
        sendString(MC1, MC2, method);
        callback(null, { status: true, response: method });
      } else if (method === "sendInt") {
        console.log(method);
        sendInt(MC1, MC2, 1);
        callback(null, { status: true, response: method });
      } else
        callback(null, { status: false, response: "Method doesn't exist" });
    }
    else
      callback(null, { status: false, response: "Wrong user or password" });
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

function sendInt(sender, client, n) {
  sender.SendInt({ num: n }, (err, data) => {
    if (err) {
      console.log("MicroServicio desconectado, reintentando conexion en 5s");
      setTimeout(function () {
        sendInt(sender, client, n)
      }, 5000);
    } else {
      console.log('Recived String:', data["response"]); // API response
      sendString(client, sender, data["response"]);
    }
  });
}

function sendString(sender, client, s) {
  sender.SendString({ item: s }, (err, data) => {
    if (err) {
      console.log("MicroServicio desconectado, reintentando conexion en 5s");
      setTimeout(function () {
        sendString(sender, client, s);
      }, 5000);
    } else {
      console.log('Recived Int:', data["response"]); // API response
      sendInt(client, sender, data["response"]);
    }
  });
}

const microService = grpc.loadPackageDefinition(packageDefinition).MicroService;

function main() {
  console.log(HOSTS[0]);
  console.log(HOSTS[1]);
  const mc1 = new microService(HOSTS[0], grpc.credentials.createInsecure());
  const mc2 = new microService(HOSTS[1], grpc.credentials.createInsecure());
  CurrentHosts[1] = mc1;
  CurrentHosts[2] = mc2;
  sendInt(mc1, mc2, 2);
  console.log("Bien");
  //sendString(mc1, mc2, "Bien ");
};

main();