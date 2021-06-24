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
    status: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Status'
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