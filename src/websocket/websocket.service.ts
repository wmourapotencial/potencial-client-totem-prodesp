import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/common/environment';
import { Server } from 'ws';
import * as net from 'net'

export const store: any = {}

@WebSocketGateway(8181, {path: '/client'})
export class WebsocketService {
    @WebSocketServer()
    server: Server;
    wsClients=[];

    handleConnection(client: any) {
        //console.log(client)
        this.wsClients.push(client);
        store.client = client
    }

    handleDisconnect(client) {
        for (let i = 0; i < this.wsClients.length; i++) {
            if (this.wsClients[i] === client) {
                this.wsClients.splice(i, 1);
                break;
            }
        }
        this.broadcast('disconnect',{});
    }

    public broadcast(event, message: any) {
        const broadCastMessage = JSON.stringify(message);
        for (let c of this.wsClients) {
            c.send(event, broadCastMessage);
        }
    }

    @SubscribeMessage('client')
    async onChgEvent(client: any, payload: any) {
        // console.log(client)
        // console.log(payload)
        if(payload == 'ABORT'){
            console.log('mensagem abort recebida')
            let client2 = new net.Socket();
            await client2.connect(5003, environment.socketPotencial.url, async function() {
                await client2.write(`_ABORT_`);
                console.log('mensagem abort enviada para o jar')
            })

            await client2.on('data', async function(data) {
                console.log('Received data abort: ' + data);
            })

            await client2.on('end', async function() {
                console.log('Received end abort: ');
            })
        }else{
            this.broadcast(payload, 'client');
        }
    }
}