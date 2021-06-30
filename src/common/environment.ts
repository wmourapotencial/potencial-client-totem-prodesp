let env = {
    socket: {
        url: ''
    },
    impressora: {
        url: ''
    },
    socketPotencial: {
        url: ''
    },
    db: {
        url: '',
        database: ''
    }
}

if (process.env.NODE_ENV === 'production') {
    env = {
        socket: {
            url: 'https://prod-poupatempo.potencialtecnologia.com.br'
        },
        impressora: {
            url: 'http://localhost:8080'
        },
        socketPotencial: {
            url: '127.0.0.1'
        },
        db: {
            url: 'mongodb://potencialGatewayTotemProdesp:rewq987aa@177.184.29.139:27017',
            database: 'potencial-gateway-totem-prodesp-api'
        }
    }
} else if (process.env.NODE_ENV === 'homologacao-prod') {
    env = {
        socket: {
            url: 'https://homolog.poupatempo.potencialtecnologia.com.br'
        },
        impressora: {
            url: 'http://localhost:8080'
        },
        socketPotencial: {
            url: '127.0.0.1'
        },
        db: {
            url: 'mongodb://potencialGatewayTotemProdespHomolog:rewq987aa@177.184.29.139:27017',
            database: 'potencial-gateway-totem-prodesp-api-homolog'
        }
    }
} else if (process.env.NODE_ENV === 'homologacao-loc') {
    env = {
        socket: {
            url: 'https://homolog.poupatempo.potencialtecnologia.com.br'
        },
        impressora: {
            url: 'http://192.168.0.23:8080'
        },
        socketPotencial: {
            url: '192.168.0.23'
        },
        db: {
            url: 'mongodb://potencialGatewayTotemProdespHomolog:rewq987aa@177.184.29.139:27017',
            database: 'potencial-gateway-totem-prodesp-api-homolog'
        }
    }
}

export const environment = env