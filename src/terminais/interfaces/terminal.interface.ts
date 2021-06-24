import { Document } from 'mongoose'

export interface Terminal extends Document {
    nome: string,
    macaddress: string,
    ip: string,
    status: string,
    client_id: string
    chavej: string
    terminal: string
    agencia: string
    loja: string
    convenio: string
    createdAt: Date,
    updatedAt: Date,
}