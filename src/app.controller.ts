import { Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { io } from 'socket.io-client'
import { webSocket } from "rxjs/webSocket";
import { environment } from './common/environment';
import { UtilsService } from './utils/utils.service';
global.WebSocket = require('ws');
const subject = webSocket('ws://localhost:8181/client'); 
const axios = require('axios')

@Controller('v1/app')
export class AppController {
  constructor(private readonly appService: AppService, private readonly utilsService: UtilsService) {}

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

  @Get('imprimir')
  async imprimir(){
    
    let json = [{
      "cmds": ["centerenable"],
      "txt": `                 VISA
      CIELO
  PAGAMENTO CARNE ELECTRON
  493100******7752
  1a VIA-CLIENTE           AUT=105826
  DOC=500007  07/07/21     07:05 ONL-C
  VENDA A DEBITO
  VALOR:                          107,00
  
                     (SiTef)
  `
    }]

    json.push({"cmds":["totalcut"],"txt":""})

    let impressao = await axios.post(`${environment.impressora.url}/api/postjsontoprint`, json)
  }

  @Get('version')
  async version(){
    this.utilsService.versionJar()
  }
}
