import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilsController } from './utils/utils.controller';
import { UtilsService } from './utils/utils.service';
import { WebsocketService } from './websocket/websocket.service';

@Module({
  imports: [],
  controllers: [AppController, UtilsController],
  providers: [AppService, UtilsService],
})
export class AppModule {}
