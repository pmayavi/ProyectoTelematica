
from concurrent import futures

import json
import grpc
import Service_pb2
import Service_pb2_grpc

HOST = '[::]:8080'


class MicroService(Service_pb2_grpc.MicroServiceServicer):
    def SendString(self, response, context):
        file = open("log.txt", "a")
        item = response.item
        print("Request is received: " + item)
        file.write(item)
        file.close()
        return Service_pb2.TransactionResponse(status=1, inventory=2)

    def SendInt(self, response, context):
        file = open("log.txt", "a")
        num = response.num
        print("Request is received: " + num)
        file.write(str(num))
        file.close()
        return Service_pb2.TransactionResponse(status=1, inventory="Hola ")


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
