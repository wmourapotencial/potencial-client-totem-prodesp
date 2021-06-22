import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { io } from 'socket.io-client'
import { webSocket } from "rxjs/webSocket";
global.WebSocket = require('ws');
const subject = webSocket('ws://localhost:8181/client'); 

@Controller('v1/app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async sendMessage() {
    //return await this.appService.sendMessageAbort();
    // const socket = await new WebSocket('ws://localhost:8181/client');
    // socket.onopen = async function() {
    //   await socket.send(
    //     JSON.stringify({
    //       event: 'client',
    //       data: 'Sem conexão com a impressora. Por favor, verifique.',
    //     }),
    //   );
    //   socket.onmessage = function(data) {
    //     console.log(data.data);
    //   };
    // };
    
    
    subject.subscribe();
    subject.next(JSON.stringify({event: 'events', data: 'ABORT'}));
    subject.complete();
    subject.error({code: 4000, reason: 'I think our app just broke!'});
  }
}
