import { Document } from 'mongoose'

export interface Terminal extends Document {
    nome: string,
    macaddress: string,
    ip: string,
    uptime: number,
    hostname: string,
    printStatus: string,
    pinpadStatus: string,
    status: number,
    client_id: string
    chavej: string
    terminal: string
    agencia: string
    loja: string
    convenio: string
    createdAt: Date,
    updatedAt: Date
}