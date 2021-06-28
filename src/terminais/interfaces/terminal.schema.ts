import * as mongoose from 'mongoose';

export const TerminalSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },
    macaddress: {
        type: String,
        unique: true,
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    uptime: {
        type: String,
        required: true
    },
    hostname: {
        type: String,
        required: true
    },
    printStatus: {
        type: String,
        required: true
    },
    pinpadStatus: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        required: true
    },
    client_id: {
        type: String,
        unique: true,
        //required: true
    },
    chavej: {
        type: String,
        required: true
    },
    terminal: {
        type: String,
        required: true
    },
    agencia: {
        type: String,
        required: true
    },
    loja: {
        type: String,
        required: true
    },
    convenio: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date, 
        default: Date.now
    },
    updatedAt: {
        type: Date, 
        default: Date.now
    }
}, { timestamps: true, collection: 'terminais' });