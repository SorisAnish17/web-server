import { Module } from '@nestjs/common';
import { TicketGatewayController } from './ticket.gateway.controller'; // Change the name if necessary
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { DatabaseClientModule } from '../../libs/database/index.module';

@Module({
  imports: [DatabaseClientModule],
  providers: [TicketGatewayController, OnlineActivityCollection], // Move controller here
  exports: [TicketGatewayController],
})
export class TicketGatewayModule {}
