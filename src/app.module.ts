import { Module } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilsController } from './utils/utils.controller';
import { UtilsService } from './utils/utils.service';
import { WebsocketService } from './websocket/websocket.service';
import { TerminaisModule } from './terminais/terminais.module';
import { MongooseModule } from '@nestjs/mongoose';
import { environment } from './common/environment';
import { TerminaisService } from './terminais/terminais.service';
import { TerminalSchema } from './terminais/interfaces/terminal.schema';

@Module({
  imports: [
    MongooseModule.forRoot(`${environment.db.url}/${environment.db.database}`,
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    }),
    MongooseModule.forFeature([{name: 'Terminal', schema: TerminalSchema}])
  ],
  controllers: [AppController, UtilsController],
  providers: [AppService, UtilsService, TerminaisService],
})
export class AppModule {}
