import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

export class SocketIOAdapter extends IoAdapter {
  private readonly frontendUrl: string;
  private readonly isProduction: boolean;

  constructor(app: INestApplicationContext, configService: ConfigService) {
    super(app);
    this.isProduction = configService.get<string>('NODE_ENV') === 'production';
    this.frontendUrl = this.isProduction
      ? configService.getOrThrow<string>('FRONTEND_URL')
      : (configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const corsOptions = {
      origin: this.isProduction ? [this.frontendUrl] : [this.frontendUrl, 'http://127.0.0.1:3000'],
      credentials: true,
    };
    return super.createIOServer(port, { ...options, cors: corsOptions });
  }
}
