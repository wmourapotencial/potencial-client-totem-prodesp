import { Injectable, Logger } from '@nestjs/common';
import { environment } from 'src/common/environment';
const axios = require('axios')
const WebSocket = require('ws')
import * as net from 'net'
import PromiseSocket from "promise-socket"
import * as ftp from 'basic-ftp'
const { exec, spawn } = require('child_process');
import { getFileProperties, WmicDataObject } from 'get-file-properties'
import * as fs from 'fs'
import * as address from 'address'
import * as os from 'os'
import { TerminaisService } from 'src/terminais/terminais.service';
import { LogsService } from 'src/logs/logs.service';

@Injectable()
export class UtilsService {

    constructor(
        private readonly terminaisService: TerminaisService,
        private readonly logsService: LogsService
    ) {}

    private readonly logger = new Logger(UtilsService.name);

    async getStatusPinpad(){
        try {
            let pinpad = await axios.get(`${environment.impressora.url}/api/getstatuspinpad`)
            return pinpad.data
        } catch(error){
            console.log(error)
        }
    }
    
    async getStatusImpressora(){
        try {
            let impressora = await axios.get(`${environment.impressora.url}/api/getstatusprinter`)
            return impressora.data
        } catch(error){
            console.log(error)
        }
    }

    async getStatusUsbImpressora(){
        try {
            let impressora = await axios.get(`${environment.impressora.url}/api/getstatususbprinter`)
            return impressora.data
        } catch(error){
            console.log(error)
        }
    }

    async setImpressao(data){
        
        let json = [
            {"cmds": ["resetprinter", ""], "txt": ""}
        ]

        let i = 0
        let intervalo = 0

        //COMPROVANTE BB
        for(i = 0; i<34;i++){
            console.log(data.ComprovanteBB.substr(intervalo, 38))

            let itemComprovanteBB = {
                "cmds": [],
                "txt": data.ComprovanteBB.substr(intervalo, 38)
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

            let a = data.ComprovanteTEF.substr(intervalo2, 38).replace(/(\r\n|\n|\r)/gm, "")
            console.log(a)

            let itemComprovanteTEF = {
                "cmds": [],
                "txt": data.ComprovanteTEF.substr(intervalo2, 38).replace(/(\r\n|\n|\r)/gm, "")
            }

            json.push(itemComprovanteTEF)
            i2 += 1
            intervalo2 += 39
        }

        json.push({"cmds":["totalcut"],"txt":""})
        console.log(json)

        let verificaImpressora = await this.getStatusImpressora()

        console.log(verificaImpressora)

        if(verificaImpressora.getstatusprinter == "1"){
            try {
                let impressao = await axios.post(`${environment.impressora.url}/api/postjsontoprint`, json)
                return impressao
            } catch(error){
                console.log(error)
            }
        }else{
            const ws = new WebSocket(`ws://localhost:8181/client`);
            ws.onopen = function(e) {
                ws.send(
                    JSON.stringify({
                        event: 'client',
                        data: 'Impressora inativa',
                    })
                );
            };

            ws.onerror = function(error) {
                console.log(`[error] ${error}`);
            };

            ws.onmessage = function(data) {
                //console.log(data);
            };

            await ws.on('close', async function() {
                console.log('Connection closed');
            });

            await this.setImpressao(data)
        }
    }

    async getLog(log){
        console.log(log)
        const client3 = new net.Socket();
        const promiseSocket = new PromiseSocket(client3)
        await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})
        await promiseSocket.write(`LOGINDT`)
        const response = (await promiseSocket.readAll()) as Buffer
        let terminal = JSON.parse(response.toString())

        const client = new ftp.Client()
        client.ftp.verbose = true
        try {
            await client.access({
                host: environment.ftp.host,
                user: environment.ftp.user,
                password: environment.ftp.password,
                secure: false
            })
            //console.log(await client.list())
            await client.uploadFrom(`${environment.ftp.directory}${log}`, `totem-prodesp/${terminal.Operador.chavej}-${log}`)
            //await client.downloadTo("README_COPY.md", "README_FTP.md")
        }
        catch(err) {
            console.log(err)
        }
        client.close()
    }

    async downloadJar(){
        const client = new ftp.Client()
        client.ftp.verbose = true
        try {
            await client.access({
                host: environment.ftp.host,
                user: environment.ftp.user,
                password: environment.ftp.password,
                secure: false
            })
            //console.log(await client.list())
            //await client.uploadFrom(`${environment.ftp.directory}${log}`, `totem-prodesp/${terminal.Operador.chavej}-${log}`)
            await client.downloadTo(`PGTO_POTENCIAL_1.jar`, "totem-prodesp/potencial-pagamentos/PGTO_POTENCIAL_1.jar")
        }
        catch(err) {
            console.log(err)
        }
        client.close()
    }

    async downloadNode(){
        const client = new ftp.Client()
        client.ftp.verbose = true
        try {
            await client.access({
                host: environment.ftp.host,
                user: environment.ftp.user,
                password: environment.ftp.password,
                secure: false
            })
            //console.log(await client.list())
            //await client.uploadFrom(`${environment.ftp.directory}${log}`, `totem-prodesp/${terminal.Operador.chavej}-${log}`)
            await client.downloadTo(`potencial-client-totem-prodesp_1.exe`, "totem-prodesp/client-node/potencial-client-totem-prodesp.exe")
        }
        catch(err) {
            console.log(err)
        }
        client.close()
    }

    async initJar(){
        await exec('start /min "PGTO_PAGAMENTO" java -jar PGTO_POTENCIAL.jar', (err, stdout, stderr) => {
            console.log(err)
            console.log(stdout)
            console.log(stderr)
        })
    }

    async initAris(){
        await exec('start /min "ARIS" c:\\arquiv~1\\Redhat\\java-11-openjdk-11.0.9-3\\bin\\java.exe -Dfile.encoding=UTF8 -jar C:\\arquiv~1\\aris\\ProdespAutomacao-0.0.1-SNAPSHOT.jar WIN PROD', (err, stdout, stderr) => {
            console.log(err)
            console.log(stdout)
            console.log(stderr)
        })
        await setTimeout(async ()=>{}, 25000)
    }

    async versionJar(){
        const client= new net.Socket();
        const promiseSocket = new PromiseSocket(client)
        await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})

        await promiseSocket.write(`VERSION`)
        const response = (await promiseSocket.readAll()) as Buffer
        console.log('version')
        console.log(response.toString())
        if (response) {
            console.log(JSON.parse(response.toString()))
            console.log(JSON.parse(response.toString()).mensagem)
            return await JSON.parse(response.toString()).mensagem.replace("Versao: ", "")
        }
        return false
    }

    async versionNode(){
        const metadata: WmicDataObject = await getFileProperties('C:\\Program Files (x86)\\BBPotencial\\BB\\potencial-client-totem-prodesp.exe')
        console.log(metadata.Version)
        return metadata.Version
    }

    async killJar(){
        const client = new net.Socket();
        const promiseSocket = new PromiseSocket(client)
        await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})

        await promiseSocket.write(`_KILL__`)
        const response = (await promiseSocket.readAll()) as Buffer
        if (response) {
            console.log(response.toString())
            return await JSON.parse(response.toString())
        }
        return false
    }

    async updateJar(){
        setTimeout( async () => {
            await exec(`rename PGTO_POTENCIAL.jar PGTO_POTENCIAL-${new Date().getTime()}.jar`, (err, stdout, stderr) => {
                console.log(err)
                console.log(stdout)
                console.log(stderr)
            })
        }, 6000)

        setTimeout( async () => {
            await exec(`rename PGTO_POTENCIAL_1.jar PGTO_POTENCIAL.jar`, (err, stdout, stderr) => {
                console.log(err)
                console.log(stdout)
                console.log(stderr)
            })
        }, 6000)
    }

    async updateNode(){
        await exec(`start /min CMD /k update-potencial.bat`, (err, stdout, stderr) => {
            console.log(err)
            console.log(stdout)
            console.log(stderr)
        })
    }

    async deleteJar(){
        return await exec(`del /f PGTO_POTENCIAL_1.jar`, (err, stdout, stderr) => {
            console.log(err)
            console.log(stdout)
            console.log(stderr)
        })
    }

    async deleteNode(){
        return await exec(`del /f potencial-client-totem-prodesp_1.exe`, (err, stdout, stderr) => {
            console.log(err)
            console.log(stdout)
            console.log(stderr)
        })
    }

    // async initServices(client){
    //     let totem = fs.readFileSync(environment.totemConfig.directory)
    //     const client3 = new net.Socket();
    //     const promiseSocket = new PromiseSocket(client3)
    //     await promiseSocket.connect({port: 5003, host: environment.socketPotencial.url})

    //     await promiseSocket.write(`LOGINDT`)
    //     const response = (await promiseSocket.readAll()) as Buffer
    //     let t = {}
    //     if (response) {
    //     let terminal = JSON.parse(response.toString())
    //     let terminalMongo = await this.terminaisService.consultarTerminalChaveJ(terminal.Operador.chavej)
    //     let statusPrint = await this.getStatusImpressora()
    //     let statusPinpad = await this.getStatusPinpad()

    //     let data = {
    //         indice: terminal.Operador.indice,
    //         nome: terminal.Operador.nome,
    //         macaddress: address.mac(function(err, addr){ return addr }),
    //         ip: address.ip(),
    //         uptime: os.uptime(),
    //         hostname: os.hostname(),
    //         printStatus: statusPrint.getstatusprinter,
    //         pinpadStatus: statusPinpad.getstatuspinpad,
    //         status: terminal.status,
    //         client_id: client,
    //         chavej: terminal.Operador.chavej,
    //         terminal: terminal.terminal,
    //         agencia: terminal.agencia,
    //         loja: terminal.loja,
    //         convenio: terminal.convenio,
    //         canal_pagamento: JSON.parse(totem.toString()).estacao,
    //         node_version: await this.versionNode(),
    //         jar_version: await this.versionJar()
    //     }
        
    //     if(terminalMongo.hasOwnProperty('error')){
    //         //console.log(terminalMongo.error)
    //         this.logger.log('Terminal não encontrado fazendo vinculo com cliente socket')
    //         try{
    //         t = await this.terminaisService.criarTerminal(data)

    //         await this.logsService.criarLog({
    //             traNsu: '',
    //             mensagem: 'Vinculando terminal',
    //             data: JSON.stringify(t)
    //         })
    //         }catch(error){
    //         console.log(error)
    //         }
            
    //     }else{
    //         t = await this.terminaisService.atualizarTerminal(terminalMongo._id, data)
    //         await this.logsService.criarLog({
    //         traNsu: '',
    //         mensagem: 'Atualizando vinculo terminal',
    //         data: JSON.stringify(t)
    //         })
    //     }
    //     }
    // }
}
