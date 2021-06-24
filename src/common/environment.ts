export const environment = {
    socket: {
        //url: 'http://localhost:9005'
        //url: 'https://desenv.poupatempo.potencialtecnologia.com.br'
        //url: 'https://homolog.poupatempo.potencialtecnologia.com.br'
        // url: 'https://preprod-poupatempo.potencialtecnologia.com.br'
        url: 'https://prod-poupatempo.potencialtecnologia.com.br'
        //url: 'http://177.184.29.139:9001'
    },
    impressora: {
        //url: 'http://192.168.88.23:8080',
        url: 'http://localhost:8080'
    },
    socketPotencial: {
        //url: '192.168.88.23'
        url: '127.0.0.1'
    },
    db: {
        //url: process.env.DB_URL || 'mongodb://potencialGatewayTotemProdespHomolog:rewq987aa@localhost:27017', //homologação
        url: process.env.DB_URL || 'mongodb://potencialGatewayTotemProdesp:rewq987aa@localhost:27017', //produção
        //url: process.env.DB_URL || 'mongodb://potencialGatewayTotemProdespHomolog:rewq987aa@177.184.29.139:27017', //local x homologação
        database: process.env.DATA_BASE || 'potencial-gateway-totem-prodesp-api' //produção
        //database: process.env.DATA_BASE || 'potencial-gateway-totem-prodesp-api-homolog' //homologação
    }
}