import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { CreateTerminalDto } from './dtos/create-terminal.dto'
import { UpdateTerminalDto } from './dtos/update-terminal.dto'
import { Terminal } from './interfaces/terminal.interface'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

@Injectable()
export class TerminaisService {

    constructor(
        @InjectModel('Terminal') private readonly terminalModel: Model<Terminal>
    ) {}

    private readonly logger = new Logger(TerminaisService.name);

    async criarTerminal(createTerminalDto): Promise<any> {
        const terminalCriado = new this.terminalModel(createTerminalDto)
        terminalCriado.save( (error, doc) => {
            if(!error){
                console.log(doc)
            }else{
                console.log(error)
            }
        })
    }

    async atualizarTerminal(_id: string, updateTerminalDto): Promise<Terminal> {
        const terminalEncontrado = await this.terminalModel.findOne({_id}).exec()
        if(!terminalEncontrado){
            throw new BadRequestException(`Terminal com o _id ${_id} não encontrado`)
        }

        return await this.terminalModel.findOneAndUpdate({_id: _id},{$set: updateTerminalDto}).exec()
    }

    async atualizarTerminalCodigo(terminal: string, updateTerminalDto: UpdateTerminalDto): Promise<Terminal> {
        const terminalEncontrado = await this.terminalModel.findOne({nome: terminal}).exec()
        if(!terminalEncontrado){
            throw new BadRequestException(`Terminal com o nome ${terminal} não encontrado`)
        }

        return await this.terminalModel.findOneAndUpdate({nome: terminal},{$set: updateTerminalDto}).exec()
    }

    async consultarTodosTerminal(): Promise<Terminal[]> {
        return await this.terminalModel.find().exec()
    }

    async consultarTerminalKey(_id: string): Promise<Terminal> {
        const terminalEncontrado = await this.terminalModel.findOne({_id}).exec()
        if(!terminalEncontrado){
            throw new BadRequestException(`Terminal com o _id ${_id} não encontrado`)
        }
        return await this.terminalModel.findOne({_id}).exec()
    }

    async consultarTerminalChaveJ(chavej: string): Promise<any> {
        const terminalEncontrado = await this.terminalModel.findOne({chavej: chavej}).exec()
        if(!terminalEncontrado){
            //throw new BadRequestException(`Terminal com a chavej ${chavej} não encontrado`)
            return await { error: 1 }
        }
        return await this.terminalModel.findOne({chavej: chavej}).exec()
    }

    async deletarTerminal(_id: string): Promise<any> {
        const terminalEncontrado = await this.terminalModel.findOne({_id}).exec()
        if(!terminalEncontrado){
            throw new BadRequestException(`Terminal com o _id ${_id} não encontrado`)
        }
        await this.terminalModel.deleteOne({_id}).exec()
    }
}