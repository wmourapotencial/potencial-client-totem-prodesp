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
let wsClients=[];
const { exec, spawn } = require('child_process');
//import * as isPortReachable from 'is-port-reachable'

@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    //private readonly websocketService: WebsocketService,
    private readonly utilsService: UtilsService,
) {}

  private readonly logger = new Logger(AppService.name);

  async onModuleInit() {
    this.logger.log(`Inicializado serviços...`);

    // await setTimeout( async () => {
    //   //"C:\\Program Files (x86)\\BBPotencial\\BB\\PGTO_POTENCIAL.jar"
    //   //"/Users/xitaomoura/Projetos/poupatempo_totem_prodesp/potencial-client-totem-prodesp/PGTO_POTENCIAL.jar"
    //   await exec('java -jar "C:\\Program Files (x86)\\BBPotencial\\BB\\PGTO_POTENCIAL.jar"', (err, stdout, stderr) => {
    //     if (err) {
    //       console.error(err);
    //       return;
    //     }
    //     console.log('iniciando o gcb...')
    //     console.log(stdout);
    //   });
    // }, 60000)
    //for(let i = 0; i<300000;i++){
      //console.log('inicio')
      //if(i == 60){
        // await exec('java -jar "C:\\Program Files (x86)\\BBPotencial\\BB\\PGTO_POTENCIAL.jar"', (err, stdout, stderr) => {
        //   if (err) {
        //     console.error(err);
        //     return;
        //   }
        //   console.log('iniciando o gcb...')
        //   console.log(stdout);
        // });
      //}
      //console.log('fim')
    //}
    this.logger.log(`Iniciou gcb...`);

    await this.websocket()
  
    await setTimeout( async () => {
      //verifica se equipamentos estão connectados, caso contrario fica em looping
      let statusEquipamentos = await this.verificaImpressoaraPinpad()
      do {
        statusEquipamentos = await this.verificaImpressoaraPinpad()
      }while(!statusEquipamentos)
    }, 30000)

    socketIo = await this.connectClient()
    
    //fica ouvindo event send-transacao (o envio de uma transação por nosso socket potencial)
    await socketIo.on("connect", async () => {
      this.logger.log('client connectado ao socket potencial')

      // let client3 = new net.Socket();
      // await client3.connect(5003, environment.socketPotencial.url, async function() {
      //   await client3.write(`_LOGINDT`);
      //   console.log('mensagem _logindt enviada para o jar')
      // })

      // await client3.on('data', async function(data) {
      //   console.log('Received data abort: ' + data);
      // })

      // await client3.on('end', async function() {
      //   console.log('Received end abort: ');
      //   client3.destroy()
      // })

      // client3.on('error', function(ex) {
      //   console.log("handled error");
      //   console.log(ex);
      // });

      await socketIo.on('send-transacao', async (transacao) => {
        await this.connectSocket(transacao)
      })
    })

    //reconecta cliente socket potencial a cada 5 minutos
    setInterval( async () => {

      // let client4 = new net.Socket();
      //   await client4.connect(5003, environment.socketPotencial.url, async function() {
      //   await client4.write(`_LOGINDT`);
      //   console.log('mensagem _logindt enviada para o jar')
      // })

      // await client4.on('data', async function(data) {
      //   console.log('Received data abort: ' + data);
      //   socketIo = await this.connectClient()
      // })

      // await client4.on('end', async function() {
      //   console.log('Received end abort: ');
      //   client4.destroy()
      // })

      //fica ouvindo event send-transacao (o envio de uma transação por nosso socket potencial)
      await socketIo.on("connect", async () => {
        this.logger.log('client connectado ao socket potencial')
        await socketIo.on('send-transacao', async (transacao) => {
          await this.connectSocket(transacao)
        })
      })
    }, 80000)
  }

  async websocket(){
    const wss = new WebSocket.Server({ port: 8181, path: '/client' })
    wss.on('connection', ws => {
      console.log('new connection');
      wsClients.push(ws);

      ws.on('message', message => {
        console.log(`Received message => ${message}`)

        if(message == 'ABORT'){
          console.log('mensagem abort recebida')
            let client2 = new net.Socket();
            client2.connect(5003, environment.socketPotencial.url, async function() {
                client2.write(`_ABORT_`);
                console.log('mensagem abort enviada para o jar')
            })

            client2.on('data', async function(data) {
                console.log('Received data abort: ' + data);
            })

            client2.on('end', async function() {
                console.log('Received end abort: ');
                // client2.destroy()
            })
        }else{
          console.log(`broadcast: ${message}`)
          this.broadcast(message)
        }
      })
    });
  }

  public broadcast(message: any) {
    const broadCastMessage = message;
    for (let c of wsClients) {
        c.send(broadCastMessage.replace('"', ''));
    }
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
    let ioo = await io(environment.socket.url)
    //console.log(ioo)
    return ioo
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
    
    let client = new net.Socket();
    await client.connect(5002, environment.socketPotencial.url, async function() {

      ///////// VERIFICA SE IMPRESSORA ESTA ONLINE INICIO
      async function impressora(){
        try {
          let impressora = await axios.get(`${environment.impressora.url}/api/getstatusprinter`)
          console.log(impressora.data.getstatusprinter)
          //getstatusprinter
          if(impressora.data.getstatusprinter != 1){
            //this.sendMessage('Sem conexão com a impressora. Por favor, verifique.')
            const socket = await new WebSocket('ws://localhost:8181/client');
            socket.onopen = async function() {
              await socket.send('Sem conexão com a impressora. Por favor, verifique.');
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
            // console.log(`mensagem: ${response.message}`)
            // console.log(`mensagem 2: ${response.message.replace('"', '')}`)
            await socket.send(response.message.replace('"', ''));
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
          message = response.message.trim().substr(0, message.length -1)
          //console.log('Mensagem simples')
        }else if(response.hasOwnProperty('DescricaoPendencia')){
          message = response.DescricaoPendencia.trim().substr(0, message.length -1)
          //console.log('Mensagem pendencia')
        }else{
          if(response.Status != 0){
            message = response.StatusMensagem.trim().substr(0, message.length -1)
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
                    await socket.send(`Sem conexão com a impressora. Por favor, verifique.`);
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
                  viaImpressao += 1
                  let clientConfirmacao = new net.Socket();
                  await clientConfirmacao.connect(5002, environment.socketPotencial.url, async function() {
                    let dataLength = `{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`
                    await clientConfirmacao.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`);
                    console.log(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`)
                  });

                  await clientConfirmacao.on('data', async function(data) {
                    console.log('data confirmação impressao')
                    console.log(data.toString())
                  })

                  await clientConfirmacao.on('end', async function(data) {
                    console.log('end confirmação impressao')
                    await clientConfirmacao.destroy()
                  })

                  clientConfirmacao.on('close', async function() {
                    console.log('close confirmação impressao')
                  })

                  socketIo.emit('send-transacao-success', {
                    traNsu: response.IdPotencial
                  });

                  // console.log('reconectou confirmação impressao')
                  // socketIo = await io(environment.socket.url)
                  // await socketIo.on("connect", async () => {
                  //   this.logger.log('client connectado ao socket potencial')
                  //   await socketIo.on('send-transacao', async (transacao) => {
                  //     await this.connectSocket(transacao)
                  //   })
                  // })

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
          await socket.send(message.replace('"', '').substr(0, message.length -1));
          socket.onmessage = function(data) {
            console.log(data.data);
          };
        };
      }
      await client.destroy()
    })

    await client.on('close', async function() {
      console.log('close')
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
                    await socket.send('Sem conexão com a impressora. Por favor, verifique.');
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
                  viaImpressao += 1
                  let clientConfirmacao = new net.Socket();
                  await clientConfirmacao.connect(5002, environment.socketPotencial.url, async function() {
                    let dataLength = `{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`
                    await clientConfirmacao.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`);
                  });

                  await clientConfirmacao.on('data', async function(data) {
                    console.log('data')
                    console.log(data)
                  })

                  await clientConfirmacao.on('end', async function() {
                    console.log('end')
                    await clientConfirmacao.destroy()
                  })

                  socket.on('close', async function() {
                    console.log('close')
                  })

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
          await socket.send(message);
          socket.onmessage = function(data) {
            console.log(data.data);
          };
        };
      }
      await client.destroy()
    })
  }

  async sendMessage(data){
    const socket = await new WebSocket('ws://localhost:8181/client');
    socket.onopen = async function() {
      await socket.send(data);
      socket.onmessage = function(data) {
        console.log(data.data);
      };
    };
  }

  async sendMessageAbort(){
    console.log('service')
    const socket = await new WebSocket('ws://localhost:8181/client');
    socket.onopen = async function() {
      await socket.send('ABORT');
      socket.onmessage = function(data) {
        console.log(data.data);
      };
    };
  }

  async confirmaImpressao(IdProdesp, IdPotencial, Status): Promise<any>{
    let client = new net.Socket();

    let dataLength = `{"IdProdesp":${IdProdesp},"IdPotencial":"${IdPotencial}","Status":${Status}}`

    await client.connect(5002, '192.168.0.23', async function() {
        console.log(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${IdProdesp},"IdPotencial":"${IdPotencial}","Status":${Status}}`)
        await client.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${IdProdesp},"IdPotencial":"${IdPotencial}","Status":${Status}}`);
    });

    await client.on('data', async function(data) {
        console.log('Received: ' + data);
        // await client.destroy();
    });
    
    await client.on('close', async function() {
        console.log('Connection closed');
    });
  }
}