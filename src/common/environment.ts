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
    },
    ftp: {
        host: '',
        user: '',
        password: '',
        directory: ''
    },
    totemConfig: {
        directory: ''
    },
    locationData: {
        jar: '',
        node: ''
    }
}

/////HOMOLOGAÇÃO POTENCIAL
process.env.NODE_ENV = 'local-home'

if (process.env.NODE_ENV === 'production') {
    env = {
        socket: {
            url: 'http://177.184.29.139:9010'
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
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: 'C:\\Program Files (x86)\\BBPotencial\\BB\\log\\'
        },
        totemConfig: {
            directory: 'C:\\Totem\\Downloads\\Totem-Html\\assets\\config\\totem.config.json'
        },
        locationData: {
            jar: '',
            node: ''
        }
    }
} else if (process.env.NODE_ENV === 'production-pot') {
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
            url: 'mongodb://potencialGatewayTotemProdesp:rewq987aa@c:27017',
            database: 'potencial-gateway-totem-prodesp-api'
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: 'C:\\Program Files (x86)\\BBPotencial\\BB\\log\\'
        },
        totemConfig: {
            directory: 'C:\\Totem\\Downloads\\Totem-Html\\assets\\config\\totem.config.json'
        },
        locationData: {
            jar: '',
            node: ''
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
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: 'C:\\Program Files (x86)\\BBPotencial\\BB\\log\\'
        },
        totemConfig: {
            directory: 'C:\\Totem\\Downloads\\Totem-Html\\assets\\config\\totem.config.json'
        },
        locationData: {
            jar: '',
            node: ''
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
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: '/Users/xitaomoura/Projetos/poupatempo_totem_prodesp/potencial-client-totem-prodesp/'
        },
        totemConfig: {
            directory: '/Users/xitaomoura/Projetos/poupatempo_totem_prodesp/potencial-client-totem-prodesp/totem.config.json'
        },
        locationData: {
            jar: '',
            node: ''
        }
    }
} else if (process.env.NODE_ENV === 'homologacao-pot') {
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
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: 'C:\\Program Files (x86)\\BBPotencial\\BB\\log\\'
        },
        totemConfig: {
            directory: 'C:\\Totem\\Downloads\\Totem-Html\\assets\\config\\totem.config.json'
        },
        locationData: {
            jar: '',
            node: ''
        }
    }
} else if (process.env.NODE_ENV === 'local-pot') {
    env = {
        socket: {
            url: 'http://localhost:9003'
        },
        impressora: {
            url: 'http://192.168.50.89:8080'
        },
        socketPotencial: {
            url: '192.168.50.89'
        },
        db: {
            url: 'mongodb://potencialGatewayTotemProdespHomolog:rewq987aa@177.184.29.139:27017',
            database: 'potencial-gateway-totem-prodesp-api-homolog'
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: '/Users/xitaomoura/Projetos/poupatempo_totem_prodesp/potencial-client-totem-prodesp/'
        },
        totemConfig: {
            directory: '/Users/xitaomoura/Projetos/poupatempo_totem_prodesp/potencial-client-totem-prodesp/totem.config.json'
        },
        locationData: {
            jar: '',
            node: ''
        }
    }
} else if (process.env.NODE_ENV === 'local-home') {
    env = {
        socket: {
            url: 'http://192.168.0.13:9010'
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
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: 'C:\\Program Files (x86)\\BBPotencial\\BB\\log\\'
        },
        totemConfig: {
            directory: 'C:\\Totem\\Downloads\\Totem-Html\\assets\\config\\totem.config.json'
        },
        locationData: {
            jar: 'C:\\Program Files (x86)\\BBPotencial\\BB\\',
            node: 'C:\\Program Files (x86)\\BBPotencial\\BB\\'
        }
    }
} else if (process.env.NODE_ENV === 'homologacao-preprod') {
    env = {
        socket: {
            url: 'http://177.184.29.139:9010'
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
        },
        ftp: {
            host: '200.219.222.116',
            user: 'potencialbh',
            password: 'In12pot@1609',
            directory: 'C:\\Program Files (x86)\\BBPotencial\\BB\log\\'
        },
        totemConfig: {
            directory: 'C:\\Totem\\Downloads\\Totem-Html\\assets\\config\\totem.config.json'
        },
        locationData: {
            jar: '',
            node: ''
        }
    }
}

export const environment = env