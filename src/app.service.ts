import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as io from "socket.io-client";
import * as address from 'address'
import * as net from 'net'
const WebSocket = require('ws')
const axios = require('axios')
import { WebsocketService, store } from './websocket/websocket.service';
import { UtilsService } from './utils/utils.service';
import { environment } from './common/environment';
let socketIo

@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly utilsService: UtilsService
) {}

  private readonly logger = new Logger(AppService.name);

  async onModuleInit() {
    this.logger.log(`Inicializado serviços...`);

    //verifica se equipamentos estão connectados, caso contrario fica em looping
    let statusEquipamentos = await this.verificaImpressoaraPinpad()
    do {
      statusEquipamentos = await this.verificaImpressoaraPinpad()
    }while(!statusEquipamentos)

    //conecta cliente socket potencial
    socketIo = await this.connectClient()

    //fica ouvindo event send-transacao (o envio de uma transação por nosso socket potencial)
    await socketIo.on("connect", async () => {
      this.logger.log('client connectado ao socket potencial')
      await socketIo.on('send-transacao', async (transacao) => {
        //console.log('connect')
        await this.connectSocket(transacao)
      })
    })
  }

  async verificaImpressoaraPinpad(){
    let pinpad = await this.utilsService.getStatusPinpad()
    let impressora = await this.utilsService.getStatusImpressora()
    let statusEquipamentos = {
      pinpad: pinpad.getstatuspinpad,
      impressora: impressora.getstatusprinter
    }

    if(statusEquipamentos.pinpad != 1){
      console.log(statusEquipamentos.pinpad)
      this.sendMessage('Sem conexão com o pinpad. Por favor, verifique.')
      return false
    }

    if(statusEquipamentos.impressora != 1){
      console.log(statusEquipamentos.impressora)
      this.sendMessage('Sem conexão com a impressora. Por favor, verifique.')
      return false
    }

    return true
  }

  async verificaImpressora(){
    let impressora = await this.utilsService.getStatusImpressora()
    let statusEquipamentos = {
      impressora: impressora.getstatusprinter
    }

    if(statusEquipamentos.impressora != 1){
      console.log(statusEquipamentos.impressora)
      this.sendMessage('Sem conexão com a impressora. Por favor, verifique.')
      return false
    }

    return true
  }

  async connectClient(){
    return await io(environment.socket.url)
    //return await io('http://localhost:9000')
  }

  async connectSocket(doc){

    //sempre verifica pendência antes de iniciar uma nova transação
    //await this.removePendencia(doc)

    doc = JSON.parse(doc)
    console.log(doc)
    let valor = doc.valorNominal.toString().split('.')
    let total = doc.valorNominal.toString().replace('.', '')

    if(valor.length == 1){
      valor[1] = '00'
    }

    if(valor.length == 1){
      valor[1] = '00'
      total =  `${valor[0].toString()}${valor[1]}`
    }

    if(valor[1].length == 1){
        //total =  `${valor[0].toString()}${valor[1]}`
        total =  `${valor[0].toString()}${valor[1]}0`
    }

    let transacao = {}
    let tamanhoComprovante = 0

    if(doc.codigoServico == 1){
      tamanhoComprovante = 38
      transacao = {
        IdPotencial: doc.traNsu,
        IdProdesp: doc.id,
        CodigoBarras: doc.codigoBarrasDigitavel,
        CodigoOperacao: doc.codigoServico,
        InformacoesAdicionais: {
          Valor: total
        }
      }
    }else if(
      doc.codigoServico == 2 || 
      doc.codigoServico == 3 || 
      doc.codigoServico == 4 || 
      doc.codigoServico == 5
      ){
      tamanhoComprovante = 48
      transacao = {
        IdPotencial: doc.traNsu,
        IdProdesp: doc.id,
        CodigoOperacao: doc.codigoServico,
        Documento: doc.codigoBarrasDigitavel
      }
    }

    async function impressora(){
      try {
        let impressora = await axios.get(`${environment.impressora.url}/api/getstatususbprinter`)
        console.log(impressora.data.getstatusprinter)
        //getstatusprinter
        if(impressora.data.printerfounded != 1 || impressora.data.printerhaspaper != 1 || impressora.data.printerisready != 1){
          //this.sendMessage('Sem conexão com a impressora. Por favor, verifique.')
          const socket = await new WebSocket('ws://localhost:8181/client');
          socket.onopen = async function() {
            await socket.send(
              JSON.stringify({
                event: 'client',
                data: 'Sem conexão com a impressora. Por favor, verifique.',
              }),
            );
            socket.onmessage = function(data) {
              console.log(data.data);
            };
          };
          return false
        }
    
        return true
      } catch(error) {
          console.log(error)
      }
    }

    let statusImpressora = await impressora()
    do {
      statusImpressora = await impressora()
    }while(!statusImpressora)
    
    let client = new net.Socket();
    await client.connect(5002, environment.socketPotencial.url, async function() {

      ///////// VERIFICA SE IMPRESSORA ESTA ONLINE INICIO
      
      console.log(`${("00000" + JSON.stringify(transacao).length).slice(-5)}01${JSON.stringify(transacao)}`)
      await client.write(`${("00000" + JSON.stringify(transacao).length).slice(-5)}01${JSON.stringify(transacao)}`);
    });

    let message = ''
    let response
    let d = ''
    let continua = false
    let impressao
    let viaImpressao = 0

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
          //console.log('Mensagem simples')
        }else if(response.hasOwnProperty('DescricaoPendencia')){
          message = response.DescricaoPendencia.trim()
          console.log('Mensagem pendencia')
        }else{
          if(response.Status != 0){
            message = response.StatusMensagem.trim()
          }else if(response.Status == 0){
            //////// INICIA IMPRESSAO
            let json = [
                {"cmds": ["resetprinter", ""], "txt": ""}
            ]
            let i = 0
            let intervalo = 0
        
            //COMPROVANTE BB
            for(i = 0; i<response.ComprovanteBB.length/tamanhoComprovante+60;i++){
        
                let itemComprovanteBB = {
                    "cmds": ["centerenable"],
                    "txt": response.ComprovanteBB.substr(intervalo, tamanhoComprovante)
                }
        
                json.push(itemComprovanteBB)
                i += 1
                intervalo += tamanhoComprovante
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

            /////////// VERIFICA SE IMPRESSORA ESTA ONLINE INICIO
            async function impressora(){
              try {
                let impressora = await axios.get(`${environment.impressora.url}/api/getstatususbprinter`)
                console.log(impressora.data.getstatusprinter)
                //getstatusprinter
                if(impressora.data.printerfounded != 1 || impressora.data.printerhaspaper != 1 || impressora.data.printerisready != 1){
                  //this.sendMessage('Sem conexão com a impressora. Por favor, verifique.')
                  const socket = await new WebSocket('ws://localhost:8181/client');
                  socket.onopen = async function() {
                    await socket.send(
                      JSON.stringify({
                        event: 'client',
                        data: 'Sem conexão com a impressora. Por favor, verifique.',
                      }),
                    );
                    socket.onmessage = function(data) {
                      console.log(data.data);
                    };
                  };
                  return false
                }
            
                return true
              } catch(error) {
                  console.log(error)
              }
            }

            let statusImpressora = await impressora()
            do {
              statusImpressora = await impressora()
            }while(!statusImpressora)
            /////////// VERIFICA SE IMPRESSORA ESTA ONLINE FINAL
            
            async function impressao(){
              try {
                let impressao = await axios.post(`${environment.impressora.url}/api/postjsontoprint`, json)
                //return impressao
                if(impressao.data.postjsontoprint == 1){
                  console.log('imprime comprovante')
                  viaImpressao += 1
                  await client.connect(5002, environment.socketPotencial.url, async function() {
                    console.log('confirma impressao')
                    let dataLength = `{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`
                    await client.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`);
                  });

                  await client.on('data', async function(data) {
                    console.log('data')
                    console.log(data)
                  })

                  await client.on('end', async function(data) {
                    console.log('end')
                    console.log(data)
                  })

                  //client.destroy()

                  socketIo.emit('send-transacao-success', {
                    traNsu: response.IdPotencial
                  });
                  return true
                }else{
                  return false
                }
              } catch(error){
                  console.log(error)
                  return false
              }
            }

            let statusImpressao = await impressao()
            do {
              if(viaImpressao == 0){
                statusImpressao = await impressao()
              }
            }while(!statusImpressao && viaImpressao != 1)
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

  async removePendencia(doc){

    console.log('#################### remover pendência')

    let transacao = {}
    let tamanhoComprovante = 0

    if(doc.codigoServico == 1){
      tamanhoComprovante = 38
    }else if(
      doc.codigoServico == 2 || 
      doc.codigoServico == 3 || 
      doc.codigoServico == 4 || 
      doc.codigoServico == 5
      ){
      tamanhoComprovante = 48
    }

    let client = new net.Socket();
    await client.connect(5002, environment.socketPotencial.url, async function() {
      let dataLength = `{"IdPotencial":${doc.traNsu},"IdProdesp":"${doc.id}"}`
      await client.write(`${("00000" + dataLength.length).slice(-5)}03{"IdPotencial":${doc.traNsu},"IdProdesp":"${doc.id}"}`);
    });

    let message = ''
    let response
    let d = ''
    let continua = false
    let impressao
    let viaImpressao = 0

    await client.on('data', async function(data) {
      console.log('Received data: ' + data);
      if(data.toString().trim().substr(-1,1) == '}'){
        d = data.toString()
        response = JSON.parse(d)
        console.log(response)
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
          //console.log('Mensagem simples')
        }else if(response.hasOwnProperty('DescricaoPendencia')){
          message = response.DescricaoPendencia.trim()
          console.log('Mensagem pendencia')
        }else{
          if(response.Status != 0){
            message = response.StatusMensagem.trim()
          }else if(response.Status == 0){
            //////// INICIA IMPRESSAO
            let json = [
                {"cmds": ["resetprinter", ""], "txt": ""}
            ]
            let i = 0
            let intervalo = 0
        
            //COMPROVANTE BB
            for(i = 0; i<response.ComprovanteBB.length/tamanhoComprovante+60;i++){
        
                let itemComprovanteBB = {
                    "cmds": ["centerenable"],
                    "txt": response.ComprovanteBB.substr(intervalo, tamanhoComprovante)
                }
        
                json.push(itemComprovanteBB)
                i += 1
                intervalo += tamanhoComprovante
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

            /////////// VERIFICA SE IMPRESSORA ESTA ONLINE INICIO
            async function impressora(){
              try {
                let impressora = await axios.get(`${environment.impressora.url}/api/getstatusprinter`)
                console.log(impressora.data.getstatusprinter)
                //getstatusprinter
                if(impressora.data.getstatusprinter != 1){
                  //this.sendMessage('Sem conexão com a impressora. Por favor, verifique.')
                  const socket = await new WebSocket('ws://localhost:8181/client');
                  socket.onopen = async function() {
                    await socket.send(
                      JSON.stringify({
                        event: 'client',
                        data: 'Sem conexão com a impressora. Por favor, verifique.',
                      }),
                    );
                    socket.onmessage = function(data) {
                      console.log(data.data);
                    };
                  };
                  return false
                }
            
                return true
              } catch(error) {
                  console.log(error)
              }
            }

            let statusImpressora = await impressora()
            do {
              statusImpressora = await impressora()
            }while(!statusImpressora)
            /////////// VERIFICA SE IMPRESSORA ESTA ONLINE FINAL
            
            async function impressao(){
              try {
                let impressao = await axios.post(`${environment.impressora.url}/api/postjsontoprint`, json)
                //return impressao
                if(impressao.data.postjsontoprint == 1){
                  console.log('imprime comprovante')
                  viaImpressao += 1
                  await client.connect(5002, environment.socketPotencial.url, async function() {
                    console.log('confirma impressao')
                    let dataLength = `{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`
                    await client.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`);
                  });

                  await client.on('data', async function(data) {
                    console.log('data')
                    console.log(data)
                  })

                  await client.on('end', async function(data) {
                    console.log('end')
                    console.log(data)
                  })

                  //client.destroy()

                  socketIo.emit('send-transacao-success', {
                    traNsu: response.IdPotencial
                  });
                  return true
                }else{
                  return false
                }
              } catch(error){
                  console.log(error)
                  return false
              }
            }

            let statusImpressao = await impressao()
            do {
              if(viaImpressao == 0){
                statusImpressao = await impressao()
              }
            }while(!statusImpressao && viaImpressao != 1)
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

  async sendMessage(data){
    const socket = await new WebSocket('ws://localhost:8181/client');
    socket.onopen = async function() {
      await socket.send(
        JSON.stringify({
          event: 'client',
          data: data,
        }),
      );
      socket.onmessage = function(data) {
        console.log(data.data);
      };
    };
  }

  async sendMessageAbort(){
    console.log('service')
    const socket = await new WebSocket('ws://localhost:8181/client');
    socket.onopen = async function() {
      await socket.send(
        JSON.stringify({
          event: 'client',
          data: 'ABORT',
        })
      );
      socket.onmessage = function(data) {
        console.log(data.data);
      };
    };
  }
}