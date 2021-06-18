import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { io } from 'socket.io-client'

@Controller('v1/app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async sendMessage() {
    return await this.appService.testHttpsAgent();
  }
}
