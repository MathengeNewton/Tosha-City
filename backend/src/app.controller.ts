import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import {
  formatInstantForDisplay,
  getAppTimeZone,
  todayYmdInAppTz,
} from './common/time/app-time';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): {
    status: string;
    timestamp: string;
    timezone: string;
    localTime: string;
    businessDate: string;
  } {
    const now = new Date();
    return {
      status: 'ok',
      timestamp: now.toISOString(),
      timezone: getAppTimeZone(),
      localTime: formatInstantForDisplay(now),
      businessDate: todayYmdInAppTz(now),
    };
  }
}
