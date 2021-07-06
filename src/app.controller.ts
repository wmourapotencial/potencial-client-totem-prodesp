import { Controller, Get, Param, Post } from '@nestjs/common';
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
    this.appService.websocket()
  }

  @Get('confirmaimpressao/:IdProdesp/:IdPotencial/:Status')
  async confirmaImpressao(
      @Param('IdPotencial') IdPotencial: string,
      @Param('IdProdesp') IdProdesp: string,
      @Param('Status') Status: string
      ){
      await this.appService.confirmaImpressao(IdProdesp,IdPotencial,Status)
  }

  @Get('removependencia/:IdProdesp/:IdPotencial')
  async removerPendencia(
      @Param('IdPotencial') IdPotencial: string,
      @Param('IdProdesp') IdProdesp: string
      ){
      await this.appService.removePendencia(IdProdesp)
  }
}
