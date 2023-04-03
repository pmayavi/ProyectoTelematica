
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
        decrypted=self.cryptog(text)
        print("Decrypted text reads: " + decrypted)
        file = open("log.txt", "a")
        file.write(decrypted)
        file.close()
        sleep(uniform(0.1, 5))
        return Service_pb2.ResponseInt(status=1, response=2)

    def SendInt(self, response, context):
        print(response)
        num += response.num
        print("Request is received: " + self.cryptog(str(num)))
        file = open("log.txt", "a")
        file.write(str(num))
        file.close()
        sleep(uniform(0.1, 5))
        return Service_pb2.ResponseString(status=1, response=self.cryptog("Hola"))
    
    def cryptog(self, iniText):
        convText=""
        with open("Encryption.json") as json_file:
            convert=json.load(json_file)
            for v in iniText:
                convText=iniText.replace(v, convert(v))
        return(convText)
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
