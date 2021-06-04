import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilsService } from './utils/utils.service';
import { WebsocketService } from './websocket/websocket.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, WebsocketService, UtilsService],
})
export class AppModule {}
