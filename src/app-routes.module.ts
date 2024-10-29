import { TicketGatewayModule } from './services/ticket-gateway/ticket.gateway.module';
import { OnlineActivityModule } from './services/online-activity/online-activity.module';
import { ChatRoomsModule } from './services/chat-rooms/chat.rooms.module';
import { ChatEventModule } from './services/chat/chat.module';

import {
  Module,
  //  MiddlewareConsumer
} from '@nestjs/common';
// import { DatabaseClientService } from './libs/database/index.service';
// import { LogCorrelationIdMiddleware } from './middlewares/correlation-id';
// import { AccessLoggerMiddleware } from './middlewares/access-logger';

@Module({
  imports: [
    TicketGatewayModule,
    OnlineActivityModule,
    ChatRoomsModule,
    ChatEventModule,
  ],

  providers: [],
})
export class AppRoutesModule {
  configure() {
    /// configure middlewares here
    // consumer.apply(LogCorrelationIdMiddleware).forRoutes('/*');
    // consumer.apply(AccessLoggerMiddleware).forRoutes('/*');
    // consumer.apply(AuthenticateUserMiddleware).forRoutes('/*');
  }
}
