import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as io from "socket.io-client";
import * as address from 'address'
import * as net from 'net'
import * as os from 'os'
import * as fs from 'fs'
const WebSocket = require('ws')
const axios = require('axios')
import { WebsocketService, store } from './websocket/websocket.service';
import { UtilsService } from './utils/utils.service';
import { environment } from './common/environment';
import { TerminaisService } from './terminais/terminais.service';
let socketIo
let wsClients=[];
let old = []
const { exec, spawn } = require('child_process');
import {PromiseSocket, TimeoutError} from "promise-socket"
import { LogsService } from './logs/logs.service';

@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    //private readonly websocketService: WebsocketService,
    private readonly utilsService: UtilsService,
    private readonly terminaisService: TerminaisService,
    private readonly logsService: LogsService
) {}

  private readonly logger = new Logger(AppService.name);

  async onModuleInit() {
    this.logger.log(`Inicializado serviços...`);
    await this.logger.log('Iniciando PGTO_POTECIAL...')

    //await this.utilsService.initJar()
    
    // await this.logger.log('Iniciando ARIS...')
    // await this.utilsService.initAris()
    setTimeout( async () => {
      await this.websocket()
      await this.logger.log('Conectando no socket potencial')
      socketIo = await this.connectClient()
      //await console.log(socketIo)
      //fica ouvindo event send-transacao (o envio de uma transação por nosso socket potencial)
      await socketIo.on("connect", async () => {
        try{
          await this.atualizaSocketClient(socketIo.id)
        }catch(error){
          this.logger.error(JSON.stringify(error))
        }
        
        await this.logger.log(`client connectado ao socket potencial, client_id: ${socketIo.id}`)
        await socketIo.on('send-transacao', async (transacao) => {
          await this.logger.log(`transação recebida: ${JSON.stringify(transacao)}`)
          await this.connectSocket(transacao)
        })

        await socketIo.on('get-log', async (log) => {
          await this.logger.log('Enviando log ...')
          await this.utilsService.getLog(log)
        })

        let kill
        await socketIo.on('set-update-jar', async (atualizacao) => {
          await this.logger.warn('Iniciando atualização do sistema de pagamento...')
          await this.logger.warn('Verificando versão PGTO_PAGAMENTO...')
          await this.utilsService.versionJar()
          await this.logger.warn('Fazendo download do PGTO_PAGAMENTO...')
          let down = await this.utilsService.downloadJar(atualizacao)
          if(down.status == 2){
            return false
          }
          await this.logger.warn('Parando aplicação PGTO_PAGAMENTO...')
          try{
            kill = await this.utilsService.killJar()
            if(kill.status != 0){
              await this.logger.error(`Terminal em uso, não foi possivel atualizar.`)
              const client = new net.Socket();
              const promiseSocket = new PromiseSocket(client)
              await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})
  
              await promiseSocket.write(`LOGINDT`)
              const response = (await promiseSocket.readAll()) as Buffer
              if (response) {
                let terminal = JSON.parse(response.toString())
                let terminalMongo = await this.terminaisService.consultarTerminalChaveJ(terminal.Operador.chavej)
                socketIo.emit('send-transacao-status', {
                  terminal: terminalMongo
                });
              }
              await this.utilsService.deleteJar()
            }
          }catch(error){
            await this.logger.warn('Atualizando PGTO_PAGAMENTO...')
            await this.utilsService.updateJar()
            setTimeout( async () => {
              await this.logger.warn('Iniciando PGTO_PAGAMENTO atualizado...')
              await this.utilsService.initJar()
            }, 10000)
          }
        })

        await socketIo.on('set-update-node', async (atualizacao) => {

          await this.logger.warn('Iniciando atualização do sistema de pagamento...')
          //await this.logger.warn('Verificando versão PGTO_PAGAMENTO...')
          //await this.utilsService.versionJar()
          await this.logger.warn('Fazendo download do Cliente Node...')
          let down = await this.utilsService.downloadNode(atualizacao)
          if(down.status == 2){
            return false
          }
          try{
            kill = await this.utilsService.killJar()
            if(kill.status != 0){
              await this.logger.error(`Terminal em uso, não foi possivel atualizar.`)
              const client = new net.Socket();
              const promiseSocket = new PromiseSocket(client)
              await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})
  
              await promiseSocket.write(`LOGINDT`)
              const response = (await promiseSocket.readAll()) as Buffer
              if (response) {
                let terminal = JSON.parse(response.toString())
                let terminalMongo = await this.terminaisService.consultarTerminalChaveJ(terminal.Operador.chavej)
                socketIo.emit('send-transacao-status', {
                  terminal: terminalMongo
                });
              }
              await this.utilsService.deleteNode()
            }
          }catch(error){
            await this.logger.warn('Atualizando Client Node...')
            await this.utilsService.updateNode()
          }
        })

        await socketIo.on('send-test-print', async () => {
          await this.utilsService.getStatusImpressora()
        })

        await socketIo.on('send-test-pinpad', async () => {
          await this.utilsService.getStatusPinpad()
        })

        await socketIo.on('send-transacao-response', async (response) => {
          console.log(`response: ${response}`)
        })
      })

      //verifica se equipamentos estão connectados, caso contrario fica em looping
      let statusEquipamentos = await this.verificaImpressoaraPinpad()
      do {
        statusEquipamentos = await this.verificaImpressoaraPinpad()
      }while(!statusEquipamentos)
    },15000)
    
    //reconecta cliente socket potencial a cada 5 minutos
    setInterval( async () => {
      //fica ouvindo event send-transacao (o envio de uma transação por nosso socket potencial)
      await socketIo.on("connect", async () => {
        await this.logger.log(`client connectado ao socket potencial, client_id: ${socketIo.id}`)
        await this.atualizaSocketClient(socketIo.id)
        await socketIo.on('send-transacao', async (transacao) => {
          await this.connectSocket(transacao)
        })
      })
    }, 80000)
  }

  async atualizaSocketClient(client){

    let totem = fs.readFileSync(environment.totemConfig.directory)
    const client3 = new net.Socket();
    const promiseSocket = new PromiseSocket(client3)
    await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})

    await promiseSocket.write(`LOGINDT`)
    const response = (await promiseSocket.readAll()) as Buffer
    let t = {}
    if (response) {
      let terminal = JSON.parse(response.toString())
      let terminalMongo = await this.terminaisService.consultarTerminalChaveJ(terminal.Operador.chavej)
      let statusPrint = await this.utilsService.getStatusImpressora()
      let statusPinpad = await this.utilsService.getStatusPinpad()

      let data = {
        indice: terminal.Operador.indice,
        nome: terminal.Operador.nome,
        macaddress: address.mac(function(err, addr){ return addr }),
        ip: address.ip(),
        uptime: os.uptime(),
        hostname: os.hostname(),
        printStatus: statusPrint.getstatusprinter,
        pinpadStatus: statusPinpad.getstatuspinpad,
        status: terminal.status,
        client_id: client,
        chavej: terminal.Operador.chavej,
        terminal: terminal.terminal,
        agencia: terminal.agencia,
        loja: terminal.loja,
        convenio: terminal.convenio,
        canal_pagamento: JSON.parse(totem.toString()).estacao,
        node_version: '',
        jar_version: ''
        // node_version: await this.utilsService.versionNode(),
        // jar_version: await this.utilsService.versionJar()
      }
      
      if(terminalMongo.hasOwnProperty('error')){
        //console.log(terminalMongo.error)
        this.logger.log('Terminal não encontrado fazendo vinculo com cliente socket')
        try{
          t = await this.terminaisService.criarTerminal(data)

          await this.logsService.criarLog({
            traNsu: '',
            mensagem: 'Vinculando terminal',
            data: JSON.stringify(t)
          })
        }catch(error){
          console.log(error)
        }
        
      }else{
        t = await this.terminaisService.atualizarTerminal(terminalMongo._id, data)
        await this.logsService.criarLog({
          traNsu: '',
          mensagem: 'Atualizando vinculo terminal',
          data: JSON.stringify(t)
        })
      }
    }
    this.logsService.criarLog({
      traNsu: '',
      mensagem: 'Cliente conectado',
      data: JSON.stringify(t)
    })
    await promiseSocket.end()
  }

  async websocket(){
    const wss = new WebSocket.Server({ port: 8181, path: '/client' })
    wss.on('connection', async ws => {
      console.log('new connection');
      await wsClients.push(ws);

      await ws.on('message', async message => {
        let mess = {
          traNsu: '',
          message: ''
        }

        console.log('message socket')
        console.log(message)

        if (message == 'ABORT'){
          mess.message = 'ABORT'
          message = mess
        } else if (message == 'Sem conexão com a impressora. Por favor, verifique.') {
          mess.message = 'Sem conexão com a impressora. Por favor, verifique.'
          message = mess
        } else if (message == 'Erro ao verificar a impressora.') {
          mess.message = 'Erro ao verificar a impressora.'
          message = mess
        } else {
          mess = JSON.parse(message)
        }

        if(mess.message == 'Insira ou passe ou aproxime o cartao na leitora'){
          mess.message = 'INSIRA, PASSE OU APROXIME O CARTÃO NA LEITORA'
        }

        if(mess.message == 'AGUARDE A SENHA'){
          mess.message = 'INSIRA A SENHA'
        }

        if(mess.message == 'Transacao Aprov.'){
          mess.message = 'TRANSAÇÃO APROVADA'
        }

        await this.logsService.criarLog({
          traNsu: mess.traNsu,
          mensagem: mess.message,
          data: ``
        })

        if(mess.message == 'ABORT'){
          const clientAbort = new net.Socket();
          const promiseSocket = new PromiseSocket(clientAbort)
          await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})
          await promiseSocket.write(`_ABORT_`)
          const resp = (await promiseSocket.readAll()) as Buffer
          if (resp) {
            console.log(resp.toString())
          }
        } else {
          console.log(`broadcast: ${mess.message}`)
          if(mess.message != '' || typeof mess.message != 'undefined'){
            this.broadcast(mess.message)
          }
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
      if(
        process.env.NODE_ENV == 'local-home' 
        || process.env.NODE_ENV == 'local-pot'
        || process.env.NODE_ENV == 'homologacao-pot'
        || process.env.NODE_ENV == 'production-pot'){
        return true
      }
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
      if(
        process.env.NODE_ENV == 'local-home' 
        || process.env.NODE_ENV == 'local-pot'
        || process.env.NODE_ENV == 'homologacao-pot'){
        return true
      }
      return false
    }

    return true
  }

  async connectClient(){
    let ioo = await io(environment.socket.url)
    return ioo
  }

  async connectSocket(doc){
    doc = JSON.parse(doc)
    //sempre verifica pendência antes de iniciar uma nova transação
    await this.removePendencia(doc)

    let valor = doc.transacao.valorNominal.toString().split('.')
    let total = doc.transacao.valorNominal.toString().replace('.', '')

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

    if(doc.transacao.codigoServico == 1){
      tamanhoComprovante = 38
      transacao = {
        IdPotencial: doc.transacao.traNsu,
        IdProdesp: doc.transacao.id,
        CodigoBarras: doc.transacao.codigoBarrasDigitavel,
        CodigoOperacao: doc.transacao.codigoServico,
        InformacoesAdicionais: {
          Valor: total
        }
      }
    }else if(
      doc.transacao.codigoServico == 2 || 
      doc.transacao.codigoServico == 3 || 
      doc.transacao.codigoServico == 4 || 
      doc.transacao.codigoServico == 5
      ){
      tamanhoComprovante = 48
      transacao = {
        IdPotencial: doc.transacao.traNsu,
        IdProdesp: doc.transacao.id,
        CodigoOperacao: doc.transacao.codigoServico,
        Documento: doc.transacao.codigoBarrasDigitavel
      }
    }

    ///////// VERIFICA SE IMPRESSORA ESTA ONLINE INICIO
    async function impressora(){
      try {
        let impressora = await axios.get(`${environment.impressora.url}/api/getstatususbprinter`)
        console.log(impressora.data.getstatusprinter)
        //getstatusprinter
        if(impressora.data.printerfounded != 1 || impressora.data.printerhaspaper != 1 || impressora.data.printerisready != 1){
          //this.sendMessage('Sem conexão com a impressora. Por favor, verifique.')
          const socket = await new WebSocket('ws://localhost:8181/client');
          socket.onopen = async function() {
            await socket.send('Sem conexão com a impressora. Por favor, verifique.');
            socket.onmessage = function(data) {
              console.log(data.data);
            };
          };

          //management
          if(doc.transacao.id == 9999999999){
            socketIo.emit('send-transacao-response', {data: doc, message: 'Sem conexão com a impressora. Por favor, verifique.'});
          }

          if(
            process.env.NODE_ENV == 'local-home' 
            || process.env.NODE_ENV == 'local-pot'
            || process.env.NODE_ENV == 'homologacao-pot'
            || process.env.NODE_ENV == 'production-pot'){
            return true
          }
          return false
        }
    
        return true
      } catch(error) {
          console.log(error)
          const socket = await new WebSocket('ws://localhost:8181/client');
          socket.onopen = async function() {
            let mess = JSON.stringify({
              traNsu: doc.transacao.traNsu,
              message: 'Erro ao verificar a impressora.',
              data: JSON.stringify(error)
            })
            await socket.send(mess);
            socket.onmessage = function(data) {
              console.log(data.data);
            };
          };

          //management
          if(doc.transacao.id == 9999999999){
            socketIo.emit('send-transacao-response', {data: doc, message: 'Erro ao verificar a impressora.'});
          }
      }
    }

    let statusImpressora = await impressora()
    do {
      statusImpressora = await impressora()
      await this.logsService.criarLog({
        traNsu: doc.transacao.traNsu,
        mensagem: 'Verificação impressora',
        data: JSON.stringify(statusImpressora)
      })
    }while(!statusImpressora)
    
    let client = new net.Socket();
    await client.connect(5002, environment.socketPotencial.url, async function() {
      console.log(`${("00000" + JSON.stringify(transacao).length).slice(-5)}01${JSON.stringify(transacao)}`)
      await client.write(`${("00000" + JSON.stringify(transacao).length).slice(-5)}01${JSON.stringify(transacao)}`);
    
      const socket = await new WebSocket('ws://localhost:8181/client');
      socket.onopen = async function() {
        let mess = JSON.stringify({
          traNsu: doc.transacao.traNsu,
          message: 'Mensagem enviada ao jar',
          data: `${("00000" + JSON.stringify(transacao).length).slice(-5)}01${JSON.stringify(transacao)}`
        })
        await socket.send(mess);
        socket.onmessage = function(data) {
          console.log(data.data);
        };
      };

      //management
      if(doc.transacao.id == 9999999999){
        console.log('mandou')
        socketIo.emit('send-transacao-response', {data: doc, message: 'Mensagem enviada ao jar'});
      }

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
            let mess = JSON.stringify({
              traNsu: doc.transacao.traNsu,
              message: response.message,
              data: response
            })
            await socket.send(mess);
            socket.onmessage = function(data) {
              console.log(data.data);

              //management
              if(doc.transacao.id == 9999999999){
                socketIo.emit('send-transacao-response', {data: doc, message: data.data});
              }
            };
          };

          
        }if(response.hasOwnProperty('StatusMensagem')){
          const socket = await new WebSocket('ws://localhost:8181/client');
          socket.onopen = async function() {
            let mess = JSON.stringify({
              traNsu: doc.transacao.traNsu,
              message: response.StatusMensagem,
              data: response
            })
            await socket.send(mess);
            socket.onmessage = function(data) {
              console.log(data.data);

              //management
              if(doc.transacao.id == 9999999999){
                socketIo.emit('send-transacao-response', {data: doc, message: data.data});
              }
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
        }else if(response.hasOwnProperty('DescricaoPendencia')){
          message = response.DescricaoPendencia.trim().substr(0, message.length -1)
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

            json.push({
              "cmds": ["centerenable"],
              "txt": response.ComprovanteTEF
            })
        
            //json.push({"cmds":["totalcut"],"txt":""})

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
                    let mess = JSON.stringify({
                      traNsu: doc.transacao.traNsu,
                      message: `Sem conexão com a impressora. Por favor, verifique.`
                    })
                    await socket.send(mess);
                    socket.onmessage = function(data) {
                      console.log(data.data);
                    };
                  };
                  if(
                    process.env.NODE_ENV == 'local-home' 
                    || process.env.NODE_ENV == 'local-pot'
                    || process.env.NODE_ENV == 'homologacao-pot'
                    || process.env.NODE_ENV == 'production-pot'){
                    return true
                  }
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

                  const clientConfirmaImpressao = new net.Socket();
                  const promiseSocket = new PromiseSocket(clientConfirmaImpressao)
                  await promiseSocket.connect({port: 5002, host: environment.socketPotencial.url})
                  let dataLength = `{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`
                  await promiseSocket.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`)
                  const resp = (await promiseSocket.readAll()) as Buffer
                  
                  if (resp) {
                    console.log(resp.toString())
                  }

                  socketIo.emit('send-transacao-success', {
                    traNsu: response.IdPotencial
                  });

                  return true
                }else{
                  if(
                    process.env.NODE_ENV == 'local-home' 
                    || process.env.NODE_ENV == 'local-pot'
                    || process.env.NODE_ENV == 'homologacao-pot'
                    || process.env.NODE_ENV == 'production-pot'){
                    return true
                  }
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
          let mess = JSON.stringify({
            traNsu: doc.transacao.traNsu,
            message: message.replace('"', '').substr(0, message.length -1),
            data: response
          })
          await socket.send(mess);
          socket.onmessage = function(data) {
            console.log(data.data);
            //management
            if(doc.transacao.id == 9999999999){
              socketIo.emit('send-transacao-response', {data: doc, message: data.data});
            }
          };
        };
      }
      await client.destroy()
    })

    await client.on('close', async function() {
      console.log('close')
    })

    await client.on('error', async function() {
      const socket = await new WebSocket('ws://localhost:8181/client');
      socket.onopen = async function() {
        let mess = JSON.stringify({
          traNsu: doc.transacao.traNsu,
          message: 'Erro na conexão do socket',
          data: 'Erro na conexão do socket'
        })
        await socket.send(mess);
        socket.onmessage = function(data) {
          console.log(data.data);
          //management
          if(doc.transacao.id == 9999999999){
            socketIo.emit('send-transacao-response', {data: doc, message: data.data});
          }
        };
      };

      await this.removePendencia(doc)
    })
  }

  async removePendencia(doc){

    let transacao = {}
    let tamanhoComprovante = 0

    if(doc.transacao.codigoServico == 1){
      tamanhoComprovante = 38
    }else if(
      doc.transacao.codigoServico == 2 || 
      doc.transacao.codigoServico == 3 || 
      doc.transacao.codigoServico == 4 || 
      doc.transacao.codigoServico == 5
      ){
      tamanhoComprovante = 48
    }

    let client = new net.Socket();
    await client.connect(5002, environment.socketPotencial.url, async function() {
      let dataLength = `{"IdPotencial":${doc.transacao.traNsu},"IdProdesp":"${doc.transacao.id}"}`
      await client.write(`${("00000" + dataLength.length).slice(-5)}03{"IdPotencial":${doc.transacao.traNsu},"IdProdesp":"${doc.transacao.id}"}`);
      
      const socket = await new WebSocket('ws://localhost:8181/client');
      socket.onopen = async function() {
        let mess = JSON.stringify({
          traNsu: doc.transacao.traNsu,
          message: 'Enviando remoção de pendência',
          data: ''
        })
        await socket.send(mess);
        socket.onmessage = function(data) {
          console.log(data.data);
          if(doc.transacao.id == 9999999999){
            console.log('teste')
            socketIo.emit('send-transacao-response', {data: doc, message: data.data});
          }
        };
      };
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
            let mess = JSON.stringify({
              traNsu: doc.transacao.traNsu,
              message: response.message,
              data: response
            })
            await socket.send(mess);
            socket.onmessage = function(data) {
              console.log(data.data);
            };
          };
        }if(response.hasOwnProperty('StatusMensagem')){
          const socket = await new WebSocket('ws://localhost:8181/client');
          socket.onopen = async function() {
            let mess = JSON.stringify({
              traNsu: doc.transacao.traNsu,
              message: response.StatusMensagem,
              data: response
            })
            await socket.send(mess);
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
        }else if(response.hasOwnProperty('DescricaoPendencia')){
          message = response.DescricaoPendencia.trim().substr(0, message.length -1)
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

            json.push({
              "cmds": ["centerenable"],
              "txt": response.ComprovanteTEF
            })
        
            //json.push({"cmds":["totalcut"],"txt":""})

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
                    let mess = JSON.stringify({
                      traNsu: doc.transacao.traNsu,
                      message: `Sem conexão com a impressora. Por favor, verifique.`
                    })
                    await socket.send(mess);
                    socket.onmessage = function(data) {
                      console.log(data.data);
                    };
                  };
                  if(
                    process.env.NODE_ENV == 'local-home' 
                    || process.env.NODE_ENV == 'local-pot'
                    || process.env.NODE_ENV == 'homologacao-pot'
                    || process.env.NODE_ENV == 'production-pot'){
                    return true
                  }
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

                  const clientConfirmaImpressao = new net.Socket();
                  const promiseSocket = new PromiseSocket(clientConfirmaImpressao)
                  await promiseSocket.connect({port: 5002, host: environment.socketPotencial.url})
                  let dataLength = `{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`
                  await promiseSocket.write(`${("00000" + dataLength.length).slice(-5)}02{"IdProdesp":${response.IdProdesp},"IdPotencial":"${response.IdPotencial}","Status":0}`)
                  const resp = (await promiseSocket.readAll()) as Buffer

                  if (resp) {
                    console.log(resp.toString())
                  }

                  socketIo.emit('send-transacao-success', {
                    traNsu: response.IdPotencial
                  });

                  return true
                }else{
                  if(
                    process.env.NODE_ENV == 'local-home' 
                    || process.env.NODE_ENV == 'local-pot'
                    || process.env.NODE_ENV == 'homologacao-pot'
                    || process.env.NODE_ENV == 'production-pot'){
                    return true
                  }
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
          let mess = JSON.stringify({
            traNsu: doc.transacao.traNsu,
            message: message.replace('"', '').substr(0, message.length -1),
            data: response
          })
          await socket.send(mess);
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

    await client.on('error', async function() {
      const socket = await new WebSocket('ws://localhost:8181/client');
      socket.onopen = async function() {
        let mess = JSON.stringify({
          traNsu: doc.transacao.traNsu,
          message: 'Erro na conexão do socket remoção de pendência',
          data: ''
        })
        await socket.send(mess);
        socket.onmessage = function(data) {
          console.log(data.data);
        };
      };
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