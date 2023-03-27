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

function sendInt(sender, client, n) {
  sender.SendInt({ number: n }, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Recived String:', data); // API response
      sendString(client, sender, data["response"]);
    }
  });
}

function sendString(sender, client, s) {
  sender.SendString({ item: s }, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Recived Int:', data); // API response
      sendInt(client, sender, data["response"]);
    }
  });
}

const microService = grpc.loadPackageDefinition(packageDefinition).MicroService;

function main() {
  const mc1 = new microService(REMOTE_HOST1, grpc.credentials.createInsecure());
  const mc2 = new microService(REMOTE_HOST2, grpc.credentials.createInsecure());
  sendInt(mc1, mc2, 2);
};

main();