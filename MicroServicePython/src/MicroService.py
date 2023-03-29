
from concurrent import futures
from time import sleep
from random import uniform

import json
import grpc
import Service_pb2
import Service_pb2_grpc

HOST = '[::]:8080'


class MicroService(Service_pb2_grpc.MicroServiceServicer):
    num = 0
    text = ""

    def SendString(self, response, context):
        text += response.item
        print("Request is received: " + text)
        file = open("log.txt", "a")
        file.write(text)
        file.close()
        sleep(uniform(0.1, 5))
        return Service_pb2.ResponseInt(status=1, response=2)

    def SendInt(self, response, context):
        print(response)
        num += response.num
        print("Request is received: " + str(num))
        file = open("log.txt", "a")
        file.write(str(num))
        file.close()
        sleep(uniform(0.1, 5))
        return Service_pb2.ResponseString(status=1, response="Hola ")


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    Service_pb2_grpc.add_MicroServiceServicer_to_server(
        MicroService(), server)
    server.add_insecure_port(HOST)
    print("Service is running... ")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
