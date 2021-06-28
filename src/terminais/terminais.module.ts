import { Module } from '@nestjs/common';
import { TerminaisService } from './terminais.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminalSchema } from './interfaces/terminal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{name: 'Terminal', schema: TerminalSchema}])
  ],
  exports: [TerminaisService],
  providers: [TerminaisService],
  controllers: []
})
export class TerminaisModule {}
