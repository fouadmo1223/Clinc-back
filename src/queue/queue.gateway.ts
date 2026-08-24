import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface QueueSocketPayload {
  sub: string;
  clinicId: string | null;
}

/**
 * Real-time push for the front-desk queue board. Staff sockets authenticate with
 * the same access token used for REST calls and are scoped to a per-clinic room —
 * this is the multi-tenant isolation boundary, mirroring AuthenticatedUser.clinicId.
 */
@WebSocketGateway({
  namespace: '/queue',
  cors: { origin: true, credentials: true },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(QueueGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) throw new Error('Missing token');

      const payload = this.jwtService.verify<QueueSocketPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      if (!payload.clinicId) throw new Error('Missing clinicId');

      client.data.clinicId = payload.clinicId;
      client.join(this.roomFor(payload.clinicId));
    } catch (err) {
      this.logger.warn(`Rejected queue socket connection: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect() {
    // socket.io leaves rooms automatically on disconnect
  }

  private roomFor(clinicId: string) {
    return `clinic:${clinicId}`;
  }

  emitCheckedIn(clinicId: string, entry: unknown) {
    this.server.to(this.roomFor(clinicId)).emit('queue:checked-in', entry);
  }

  emitUpdated(clinicId: string, entry: unknown) {
    this.server.to(this.roomFor(clinicId)).emit('queue:updated', entry);
  }
}
