# Proyecto 1 TET
Proyecto 1 de aula, realizado por Pablo Maya Villegas, Mariana Vasquez Escobar y Santiago Gonzalez Rodriguez

## Requerimientos del proyecto
Para que el sistema en cuestion funcione, se va a necesitar tener instalado el compilador .NET para NodeJS, el lenguaje de programacion Python, protobuffer y los gRPC correspondientes para cada lenguaje. Se deben correr unos comandos detallados en la Guia de uso. 

## Analisis de la solucion
La solucion llevada a cabo tiene el codigo creado en NodeJS y en Python, optando por usar gRPC en vez de una API REST, similarmente, optamos por el uso de colas en vez de aplicar el sistema de topicos.  
Aplicamos un proxy para que el usuario solo necesite conexion con un servicio, y el MOM principal se conecte con los microservicios para llamar sus procesos, este MOM tiene conexion a otro(s) MOM con fines de replicacion, persistencia de datos (por medio de JSON guardado localmente en un archivo en el Proxy) y tolerancia a fallos.  
Se realiza un sistema de Pull a la hora de manejar el MOM, pues se requiere una peticion para que este actue, y solo actua sobre el microservicio que es necesario.  

## Diseño

![Diagrama de arquitectura](https://github.com/pmayavi/ProyectoTelematica/blob/main/ArqDiagram.jpg)

La presente arquitecrura se basa en la comunicación propiciada por el archivo .proto, compartido por todos los componentes de la arquitectura a excepción del cliente (postman). 

Es importante aclarar que las Follower MOMs están constantemente verificando que exista una Leader MOM, y el proxy tambien constantemente verifica la conexion con los MOM, (cada tres segundos ambos casos) y si el MOM no se puede comunicar con el microservicio requerido, se reintenta la conexion (a los 5 segundos) hasta que se restablesca o se elimine la cola.

## Implementacion

Nuestra solucion es facilmente escalable, solo hay que añadir direcciones IP en el archivo .env para incrementar los MOMs y los microservicios  

## Guia de uso

Tanto el Proxy como los MOM al crearse en maquinas nuevas se le ingresan estos comandos
```sh
sudo apt update && sudo apt upgrade -y
```
```sh
sudo curl -fsSL https://deb.nodesource.com/setup_19.x | sudo -E bash - && sudo apt-get install -y nodejs
```
```sh
sudo git clone https://github.com/pmayavi/ProyectoTelematica.git
```
Cuando ya estan creados, el Proxy se incia con estos comandos:
```sh
cd ProyectoTelematica/ProxyService/src/
sudo node server.js
```
Y los MOM con estos:
```sh
cd ProyectoTelematica/OnlineService/src/
sudo node server.js
```
Para las maquinas de los microservicios de Python:
```sh
sudo apt update && sudo apt upgrade -y && sudo apt-get install python3 && sudo apt-get install python3-pip -y
```
```sh
sudo python3 -m pip install grpcio
sudo python3 -m pip install grpcio-tools
sudo git clone https://github.com/pmayavi/ProyectoTelematica.git
cd ProyectoTelematica/MicroServicePython/src/
sudo python3 -m grpc_tools.protoc -I ../../protobufs --python_out=. --pyi_out=. --grpc_python_out=. ../../protobufs/Service.proto
sudo python3 MicroService.py
```
Y ya se conectan por sus cuentas entre si los servicios!  
Finalmente, se comunica una aplicacion de Postman con la direccion IP publica del servidor Proxy en el puerto 8080, se ingresa el archivo Service.proto al Postman y se invoca un metodo, el mensaje puede ser por ejemplo
```json
{
    "user": "pmayav",
    "pass": "1234",
    "id": "de260f4e-41a3-4071-bb2c-9c111fdbcb6f",
    "mc1": 1,
    "mc2": 2,
    "method": "sendString"
}
```
Siendo el user y pass el usuario y contraseña verificados que se encuentran en el .env  
El id es el objeto a eliminar para el metodo RemoveQueue  
los mc son cuales microservicio se comunicaran entre si en cola  
Y el method seria el metodo que van a comunicarse los microservicios  