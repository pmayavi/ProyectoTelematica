import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

dotenv.config()

const PROTO_PATH = process.env.PROTO_PATH;
const REMOTE_HOST1 = process.env.REMOTE_HOST1;
const REMOTE_HOST2 = process.env.REMOTE_HOST2;

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
  GetRequest: (_, callback) => {
    callback(null, { status: true, response: "YEah" });
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
  const mc1 = new microService(REMOTE_HOST1, grpc.credentials.createInsecure());
  const mc2 = new microService(REMOTE_HOST2, grpc.credentials.createInsecure());
  sendInt(mc1, mc2, 2);
  console.log("Bien");
  sendString(mc1, mc2, "Bien ");
};

main();