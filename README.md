# Proyecto 1 TET
Proyecto 1 de aula, realizado por Pablo Maya Villegas, Mariana Vasquez Escobar y Santiago Gonzalez Rodriguez

## Requerimientos del proyecto
Para que el sistema en cuestion funcione, se va a necesitar tener instalado el compilador .NET para NodeJS, el lenguaje de programacion Python, protobuffer y los gRPC correspondientes para cada lenguaje.

## Analisis de la solucion
La solucion llevada a cabo tiene el codigo creado en NodeJS y en Python, optando por usar gRPC en vez de una API REST, similarmente, optamos por el uso de colas en vez de aplicar el sistema de topicos.
Aplicamos un proxy para que los microservicios se conecten con el MOM principal para hacer sus procesos, este MOM esta conectado a otro(s) MOM con fines de replicacion, persistencia de datos (por medio de JSON manejados por cada MOM) y tolerancia a fallos.
Se realiza un sistema de Pull a la hora de manejar el MOM, pues se requiere una peticion para que este actue, y solo actua sobre el microservicio que es necesario.

## Diseño

![Diagrama de arquitectura](https://github.com/pmayavi/ProyectoTelematica/blob/main/ArqDiagram.jpg)

La presente arquitecrura se basa en la comunicación propiciada por el archivo .proto, compartido por todos los componentes de la arquitectura a excepción del cliente (postman). 

Es importante aclarar que las Follower MOMs están constantemente verificando (cada tres segundos) que exista una Leader MOM, se da un caso similar entre el proxy y el leader MOM.

## Implementacion


## Guia de uso

