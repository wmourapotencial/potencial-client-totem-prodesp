import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as io from "socket.io-client";
import * as address from 'address'
import * as net from 'net'
const WebSocket = require('ws')
const axios = require('axios')
import { WebsocketService, store } from './websocket/websocket.service';
import { UtilsService } from './utils/utils.service';

@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly utilsService: UtilsService
) {}

  private readonly logger = new Logger(AppService.name);

  async onModuleInit() {
    this.logger.log(`Inicializado socket client...`);

    let socket = await this.connectClient()
    
    await socket.on("connect", async () => {
      await socket.on('send-transacao', async (transacao) => {
          await this.connectSocket(transacao)
      })
    })

    // socket.emit('wakeup', {
    //   chavej: 'J9619589',
    //   terminal: '999',
    //   ip: address.ip(),
    //   macaddress: address.mac(function(err, addr){ return addr })
    // });
  }

  async connectClient(){
    return await io('https://homolog.poupatempo.potencialtecnologia.com.br')
  }

  async connectSocket(doc){

    doc = JSON.parse(doc)
    let valor = doc.valorNominal.toString().split('.')
    let total = doc.valorNominal.toString().replace('.', '')
    if(valor[1].length == 1){
        total =  valor[0] + (parseInt(valor[1]) * 10).toString()
    }
    
    let transacao = {
      IdPotencial: doc.traNsu,
      IdProdesp: doc.id,
      CodigoBarras: doc.codigoBarrasDigitavel,
      InformacoesAdicionais: {
        Valor: total
      }
    }

    let client = new net.Socket();
    await client.connect(5002, 'localhost', async function() {
      console.log(`${("00000" + JSON.stringify(transacao).length).slice(-5)}01${JSON.stringify(transacao)}`)
      await client.write(`${("00000" + JSON.stringify(transacao).length).slice(-5)}01${JSON.stringify(transacao)}`);
    });

    let message = ''
    let response
    let d = ''
    let continua = false
    let impressao

    await client.on('data', async function(data) {
      console.log('Received data: ' + data);
      if(data.toString().trim().substr(-1,1) == '}'){
        d = data.toString()
        response = JSON.parse(d)
        console.log(response)

        /////////////ENVIA MENSAGEM/////////////////////
        if(response.hasOwnProperty('message')){
          const socket = await new WebSocket('ws://localhost:8181/client');
          socket.onopen = async function() {
            await socket.send(
              JSON.stringify({
                event: 'client',
                data: response.message,
              }),
            );
            socket.onmessage = function(data) {
              console.log(data.data);
            };
          };
        }
        /////////////ENVIA MENSAGEM/////////////////////
        continua = true
      }else{
        d += data.toString()
      }
    })

    await client.on('end', async function() {
      console.log('Received end: ' + d);
      if(continua){

        response = JSON.parse(d)
        if(response.hasOwnProperty('message')){
          message = response.message.trim()
          console.log('Mensagem simples')
        }else if(response.hasOwnProperty('DescricaoPendencia')){
          message = response.message.trim()
          console.log('Mensagem pendencia')
        }else{
          if(response.Status != 0){
            console.log('Mensagem de erro')
            message = response.StatusMensagem.trim()
          }else if(response.Status == 0){
            console.log('Mensagem sucesso')

            //////// INICIA IMPRESSAO

            let json = [
                {"cmds": ["resetprinter", ""], "txt": ""}
            ]
        
            let i = 0
            let intervalo = 0
        
            //COMPROVANTE BB
            for(i = 0; i<34;i++){
                console.log(response.ComprovanteBB.substr(intervalo, 38))
        
                let itemComprovanteBB = {
                    "cmds": ["centerenable"],
                    "txt": response.ComprovanteBB.substr(intervalo, 38)
                }
        
                json.push(itemComprovanteBB)
                i += 1
                intervalo += 38
            }
        
            //COMPROVANTE SITEF
            json.push({"cmds": [], "txt": ""},{"cmds": [], "txt": ""},{"cmds": [], "txt": ""},{"cmds": [], "txt": ""})
        
            let i2 = 0
            let intervalo2 = 0
        
            for(i2 = 0; i2<30;i2++){
        
                let a = response.ComprovanteTEF.substr(intervalo2, 38).replace(/(\r\n|\n|\r)/gm, "")
                console.log(a)
        
                let itemComprovanteTEF = {
                    "cmds": ["centerenable"],
                    "txt": response.ComprovanteTEF.substr(intervalo2, 38).replace(/(\r\n|\n|\r)/gm, "")
                }
        
                json.push(itemComprovanteTEF)
                i2 += 1
                intervalo2 += 39
            }
        
            json.push({"cmds":["totalcut"],"txt":""})
            console.log(json)
            let impressao
            try {
                impressao = await axios.post(`http://localhost:8080/api/postjsontoprint`, json)
                //return impressao
                console.log(impressao.data)
                if(impressao.data.postjsontoprint == "1"){
                  await client.connect(5002, 'localhost', async function() {
                    let dataLength = `{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`
                    await client.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`);
                  });
                }
            } catch(error){
                console.log(error)
            }
            /////// FINAL IMPRESSAO
          }
        }
        const socket = await new WebSocket('ws://localhost:8181/client');
        socket.onopen = async function() {
          await socket.send(
            JSON.stringify({
              event: 'client',
              data: message,
            }),
          );
          socket.onmessage = function(data) {
            console.log(data.data);
          };
        };
      }
    })
  }
}