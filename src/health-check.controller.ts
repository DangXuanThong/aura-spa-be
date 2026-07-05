import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthCheckController {
  @Get('health-check')
  check(): { status: string } {
    return { status: 'ok' };
  }
}
