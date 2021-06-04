import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { io } from 'socket.io-client'

@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async sendMessage() {
    return await this.appService.sendMessage('0032|J9619589|210604');
  }
}
