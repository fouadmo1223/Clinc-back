import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * Pings both the API process and the database in one request — used by the keep-warm
   * GitHub Action (see .github/workflows/keep-warm.yml) so a single hit both wakes the
   * Render instance out of its free-tier sleep and confirms Mongo is actually reachable,
   * not just that the process is up.
   */
  @Public()
  @Get()
  async check() {
    if (!this.connection.db) throw new ServiceUnavailableException('Database not connected');
    await this.connection.db.admin().ping();
    return { status: 'ok', time: new Date().toISOString() };
  }
}
