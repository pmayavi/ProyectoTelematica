import dotenv from 'dotenv';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { v4 } from 'uuid';
import {//Importar los metodos de util.js
  getRequestValues,
  sendString,
  sendInt,
  sendQueue,
  sendDelete,
  caesarCrypt,
  caesarCryptog,
  wait
} from './utils.js';

dotenv.config()
//Entender el contenido del archivo .env
const PROTO_PATH = process.env.PROTO_PATH;
const PROXY = process.env.PROXY;
const MOMS = process.env.MOMS.split(','); //Muchas IPs separadas por coma
const HOSTS = process.env.HOSTS.split(',');
const USERS = JSON.parse(process.env.USERS);//UN string vuelto JSON 
const CurrentMoms = new Array(MOMS.length);
const maxHosts = HOSTS.length + 1;
const CurrentHosts = new Array(maxHosts);
var Queues = {};
const address = "0.0.0.0:8080";
var proxy = null;

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

console.info("MOM service is started...");
const proto = grpc.loadPackageDefinition(packageDefinition);
const server = new grpc.Server();

server.addService(proto.MOMService.service, {
  GetRequest: (call, callback) => {
    console.log("New request");
    const [user, pass, mc1, mc2, method] = getRequestValues(call.request, CurrentHosts, maxHosts);//Tomar los datos de la request
    if (!mc1)
      callback(null, { status: false, response: mc2 });
    else if (!mc2)
      callback(null, { status: false, response: mc1 });
    if (!mc1 || !mc2)
      return;

    if (user in USERS && USERS[user] === pass) {//Si el usuario es valido
      console.log(method);
      const id = v4();//Crear ID unica
      call.request["time"] = new Date().toLocaleString();//Guardar el tiempo de creacion de cola
      switch (method) {//Segun que metodo es
        case "sendString":
          Queues[id] = call.request;//Guardar la cola en el registro local
          sendQueue(Queues[id], id, proxy);//Enviar la cola al Proxy para persistencia
          let encrypted = caesarCrypt(method);//Encriptar el primer mensaje ya que el MOM no puede ver los mensajes 
          console.log(encrypted);
          sendString(Queues, mc1, mc2, encrypted, id);//Iniciar el ciclo
          callback(null, { status: true, response: id });
          break;
        case "sendInt":
          Queues[id] = call.request;
          sendQueue(Queues[id], id, proxy);
          encoded = caesarCryptog(1); //Aca iria un input de int en vez del numero quemado si se va a hacer ese cambio
          sendInt(Queues, mc1, mc2, encoded, id);
          callback(null, { status: true, response: id });
          break;
        default:
          callback(null, { status: false, response: "Method doesn't exist" });//El metodo no existe y no se guarda
      }
    }
    else
      callback(null, { status: false, response: "Wrong user or password" });
  },

  GetQueues: (_, callback) => {
    console.log('GetQueues');//Darle al usuario una lista de las colas corriendo actualmente
    'use strict'; //https://stackoverflow.com/questions/34913675/how-to-iterate-keys-values-in-javascript
    var response = "";
    for (const [key, value] of Object.entries(Queues)) {
      response += "||| " + key + " | " + value.time + " | " + value.user + " | " + value.method + " |||";

    }
    callback(null, { status: true, response: response });
  },

  RemoveQueue: (call, callback) => {
    console.log('RemoveQueue');//Remover una cola desde su ID unico
    const user = call.request.user;
    const pass = call.request.pass;
    const id = call.request.id;
    if (Queues[id]) {//Si la cola existe
      if (Queues[id].user === user && Queues[id].pass === pass) {//SI el mismo usuario que la creo es el que la elimina
        delete Queues[id];//Eliminarla
        sendDelete(id, proxy);//Enviarle al Proxy la confirmacion de su eliminacion
        callback(null, { status: true, response: "Queue deleted successfully" });
      } else
        callback(null, { status: false, response: "Wrong user or password" });
    } else
      callback(null, { status: false, response: "Queue doesn't exist" });
  },

  CheckOnline: (_, callback) => {//Metodo para que las otras MOM identifiquen si ya hay una MOM funcional
    callback(null, { status: true, response: "MOM functional" });
  },

  SendQueue: (call, callback) => {//Metodo para recibir la lista de las colas actuales al inicializarse el MOM
    Queues = JSON.parse(call.request.item);
    for (const [key, value] of Object.entries(Queues)) {
      let encrypted;
      switch (value.method) {//Y reinicia todos los procesos 
        case "sendString":
          encrypted = caesarCrypt(value.method);
          sendString(Queues, CurrentHosts[value.mc1], CurrentHosts[value.mc2], encrypted, key);
          break;
        case "sendInt":
          encoded = caesarCryptog(1); //Aca iria un input de int en vez del numero quemado si se va a hacer ese cambio
          sendInt(Queues, CurrentHosts[value.mc1], CurrentHosts[value.mc2], encoded, key);
          break;
      }
    }
    callback(null, { status: true, response: "Queues recieved" });
  },
});

async function checkMoms() {//Ciclo que sucede cuando la MOM no es la principal
  var availableMoms = 0;
  for (let i = 0; i < MOMS.length; i++) {//Mira cuantas MOM estan funcionando
    CurrentMoms[i].CheckOnline({}, (err, data) => {
      if (!err)
        availableMoms += 1;
    });
  }
  await wait(1000);//Espera que todas puedan responder
  console.log('Available MOMs: ', availableMoms);
  if (availableMoms == 0) {//Si no hay MOMs funcionando, esta toma ese rol
    console.log("This is the main MOM");
    server.bindAsync(//Se inicia el lado servidor para recibir requests del Proxy
      address,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        console.log("Server running at ", address);
        server.start();
      }
    );
  } else {
    console.log("There's already a main MOM, checking again in 3 seconds...");
    setTimeout(function () { checkMoms(); }, 2000);//Si ya hay una MOM funcional, vuelve a mirar por si pierde funcionalidad
  }
}

const microService = grpc.loadPackageDefinition(packageDefinition).MicroService;
const momService = grpc.loadPackageDefinition(packageDefinition).MOMService;

function main() {
  proxy = new momService(PROXY, grpc.credentials.createInsecure());//Se inicia la conexion con el Proxy
  for (let i = 0; i < MOMS.length; i++) {//Se inicia la conexion con todas las otras MOM
    CurrentMoms[i] = new momService(MOMS[i], grpc.credentials.createInsecure());
  }
  for (let i = 0; i < HOSTS.length; i++) {//Se inicia la conexion con todos los micro servicios
    console.log(HOSTS[i]);
    CurrentHosts[i + 1] = new microService(HOSTS[i], grpc.credentials.createInsecure());
  }
  checkMoms();//Se mira si ya hay un MOM principal, o toma ese rol
};

main();