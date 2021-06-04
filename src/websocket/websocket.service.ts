import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Server } from 'ws';

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

    @SubscribeMessage('events')
    onEvent(client: any, data: any) {
        //console.log(data)
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
        //console.log('chegou')
        //console.log(this.wsClients)
        const broadCastMessage = JSON.stringify(message);
        for (let c of this.wsClients) {
            c.send(event, broadCastMessage);
        }
    }

    @SubscribeMessage('client')
    onChgEvent(client: any, payload: any) {
        //console.log(payload)
        this.broadcast(payload, 'client');
    }
}