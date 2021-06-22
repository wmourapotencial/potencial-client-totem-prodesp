import { Injectable, Logger } from '@nestjs/common';
import { environment } from 'src/common/environment';
const axios = require('axios')
const WebSocket = require('ws')

@Injectable()
export class UtilsService {

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
}
