import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import fs from 'fs';

dotenv.config()
//Entender el contenido del archivo .env
const PROTO_PATH = process.env.PROTO_PATH;
const MOMS = process.env.MOMS.split(',');
const CurrentMoms = new Array(MOMS.length);
const address = "0.0.0.0:8080";
var mainMom, imom;

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
  GetRequest: (call, callback) => {//Redirige las request al main MOM
    mainMom.GetRequest(call.request, (err, data) => {
      if (err) {
        console.log(err);
        callback(null, { status: false, response: err });
      } else {
        callback(null, { status: true, response: data.response });
      }
    });
  },

  GetQueues: (call, callback) => {//Redirige las request al main MOM
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
    if (call.request.id === "DELETE") {//Cuando el MOM confirma la eliminacion, lo elimina del cache
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
    } else {//Redirige las request al main MOM
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

  CheckOnline: (_, callback) => {//Servicio para que los MOM sepan el estado del Proxy
    callback(null, { status: true, response: "Proxy Online" });
  },

  SendQueue: (call, callback) => {//Cuando el MOM recibe la request, le confirma al Proxy que se creo una nueva 
    var JsonComponents = call.request.item.split(';');//y este la guarda en cache
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

server.bindAsync(//Se inicia la parte de servidor que escuhca las peticiones del cliente
  address,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    console.log("Server running at ", address);
    server.start();
  }
);

async function checkMoms() {//Ciclo infinito de revisar todas las MOM
  console.log("checkMoms");
  for (let i = 0; i < MOMS.length; i++) {
    console.log(CurrentMoms);
    CurrentMoms[i].CheckOnline({}, (err, data) => {
      console.log("CONSOLE 111111111111111111111111111");
      console.log(!err && data != undefined && imom != i);
      console.log(err);
      console.log("CONSOLE 22222222222222222222222222222");
      console.log(data);
      console.log(imom);
      console.log(i);
      console.log("CONSOLE 333333333333333333333333333");
      if (!err && data != undefined && imom != i) {
        mainMom = CurrentMoms[i];//Al encontrar una MOM disponible que no es la main, se cambia la main
        imom = i;
        if (fs.statSync('cache.json').size > 0) {
          mainMom.SendQueue({ item: fs.readFileSync('cache.json').toString('utf8') }, (err, data) => {
            if (err)
              console.log(err);
            else//Se le envian las colas guardadas en cache
              console.log('Change in the main MOM: ', data.response);
          });
        }
      }
    });
  }
  await wait(3000);//Vuelve a revisar cada 3 segundos
  checkMoms();
}

function wait(ms) {//Metodo para esperar en milisegundos
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const momService = grpc.loadPackageDefinition(packageDefinition).MOMService;

function main() {
  for (let i = 0; i < MOMS.length; i++) {//Se inicializa la conexion con todas las MOM
    CurrentMoms[i] = new momService(MOMS[i], grpc.credentials.createInsecure());
  }
  checkMoms();
}

main();