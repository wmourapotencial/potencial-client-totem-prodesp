import { Controller, Get, Logger } from '@nestjs/common';
import { UtilsService } from './utils.service';

@Controller('v1/utils')
export class UtilsController {

    private readonly logger = new Logger(UtilsController.name);

    constructor(private readonly utilsService: UtilsService) {}

    @Get('getstatuspinpad')
    async consultarTransacao() {
        return await this.utilsService.getStatusPinpad();
    }

    @Get()
    async consultarImpressora() {
        return await this.utilsService.getStatusImpressora();
    }

    @Get('setImpressao')
    async setImpressao() {
        let data = {
            IdPotencial: '0048|J9619589|210531',
            IdProdesp: '454556541121',
            Status: 0,
            StatusMensagem: 'SUCESSO',
            ComprovanteBB: '   COBAN:011331 LOJA:008888 PDV:00504231/05/2021   BANCO DO BRASIL  12:14:18798818995 CORRESPONDENTE BANCARIO 0033                                        COMPROVANTE PAGAMENTOS COM COD.BARRA                                      --------------------------------------CONVENIO: TELEMAR RJ (OI FIXO)        -------------------------------------- 84630000001 22720024010 18061010327   12835021902                          NR. DOCUMENTO               88.885.042NR. CONVENIO                  60.533-6DATA DO PAGAMENTO           31/05/2021VLR DO PAGAMENTO                122,72--------------------------------------NR.AUTENTICACAO  9.3BF.E6F.4C0.E5B.E88',
            ComprovanteTEF: '.....S.O.F.T.W.A.R.E.E.X.P.R.E.S.S....\n' +
              'SI                              Rede 5\n' +
              'MU               Codigo transacao: 200\n' +
              'LA               Codigo operacao: 2000\n' +
              'DO                       Valor: 122,72\n' +
              '.....S...I...M...U...L...A...D...O....\n' +
              'SI                   NSU SiTef: 310008\n' +
              'MU                      31/05/21 12:14\n' +
              'LA                    ID PDV: 258SE001\n' +
              'DO             Estab.: 000000000000005\n' +
              '.....S...I...M...U...L...A...D...O....\n' +
              'SI                     Host: 999310008\n' +
              'MU         Transacao Simulada Aprovada\n' +
              '                               (SiTef)\n'
        }
        //console.log(data)
        return await this.utilsService.setImpressao(data)
    }
}
