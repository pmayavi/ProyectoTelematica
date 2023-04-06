export function getRequestValues(request, CurrentHosts, maxHosts) {//Interpeta el JSON de la request
    const user = request.user;
    const pass = request.pass;
    const mc1 = request.mc1;
    //console.log(request);
    if (mc1 <= 0 || mc1 >= maxHosts)//No pueden ser micro servicios inexistentes
        return [null, null, null, "Invalid number for mc1", null];
    const MC1 = CurrentHosts[mc1];
    const mc2 = request.mc2;
    if (mc2 <= 0 || mc2 >= maxHosts)
        return [null, null, "Invalid number for mc2", null, null];
    const MC2 = CurrentHosts[mc2];
    const method = request.method;
    return [user, pass, MC1, MC2, method];
}

export function sendString(Queues, sender, client, s, id) {//Metodo para enviar de un micro servicio a otro un string
    sender.SendString({ item: s }, (err, data) => {
        if (err) {//Si hay un error, no se pudo conectar con el Host
            if (Queues[id]) {//Si la cola no se ha eliminado
                console.log(err);
                console.log(mc1);
                console.log(mc2);
                console.log("MicroServicio desconectado, reintentando conexion en 5s");
                setTimeout(function () {//Reintentar la conexion
                    sendString(Queues, sender, client, s, id);
                }, 5000);
            } else
                console.log("MicroServicio desconectado.");
        } else {
            console.log('Recived Int:', data["response"]); // API response
            if (Queues[id])//Si la cola no se ha eliminado continuar el ciclo
                sendInt(Queues, client, sender, data["response"], id);
        }
    });
}

export function sendInt(Queues, sender, client, n, id) {//Metodo para enviar de un micro servicio a otro un numero
    sender.SendInt({ num: n }, (err, data) => {
        if (err) {
            if (Queues[id]) {
                console.log("MicroServicio desconectado, reintentando conexion en 5s");
                setTimeout(function () {
                    sendInt(Queues, sender, client, n, id)
                }, 5000);
            } else
                console.log("MicroServicio desconectado.");
        } else {
            console.log('Recived String:', data["response"]);
            if (Queues[id])
                sendString(Queues, client, sender, data["response"], id);
        }
    });
}

export function sendQueue(queue, id, proxy) {//Enviar al Proxy la confirmacion de la nueva cola creada
    //console.log(id + ";" + JSON.stringify(queue));
    proxy.SendQueue({ item: id + ";" + JSON.stringify(queue) }, (err, data) => {
        if (err) {
            console.log("Proxy desconectado, reintentando conexion en 3s");
            setTimeout(function () {//Si no hay conexion con el proxy, reintentar
                sendQueue(queue, id, proxy);
            }, 3000);
        }
    });
}

export function sendDelete(id, proxy) {//Enviar al Proxy confirmacion de la eliminacion de la cola
    proxy.RemoveQueue({ user: "", pass: id, id: "DELETE" }, (err, data) => {
        if (err) {
            console.log("Proxy desconectado, reintentando conexion en 3s");
            setTimeout(function () {
                sendDelete(id, proxy);
            }, 3000);
        }
    });
}

export function caesarCrypt(unencoded) {//Encriptar el string
    let str = unencoded;
    let result = '';
    for (let i = str.length - 1; i >= 0; i--) {
        let charCode = str.charCodeAt(i);
        let newCharCode = charCode + 13;
        let newChar = String.fromCharCode(newCharCode);
        result += newChar;
    }
    return result;
}

export function caesarCryptog(unencoded) {//Encriptar un numero
    const unencodedString = unencoded.toString();
    let encoded = '';
    for (let i = 0; i < unencodedString.length; i++) {
        const charCode = unencodedString.charCodeAt(i);
        if (charCode >= 48 && charCode <= 57) {
            const newDigit = ((charCode - 48 + shift) % 10);
            encoded += newDigit.toString();
        } else {
            encoded += unencodedString[i];
        }
    }
    return parseInt(encoded);
}

export function wait(ms) {//Metodo para esperar cierta cantidad de milisegundos
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}