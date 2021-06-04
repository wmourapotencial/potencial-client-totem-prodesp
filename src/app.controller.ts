import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { io } from 'socket.io-client'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    //return this.appService.connectClient();
  }
}
