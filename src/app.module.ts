import { Module } from '@nestjs/common';
import { EnvService } from './config/env.service';

@Module({
  // ...existing code...
  providers: [
    // ...existing code...
    EnvService,
    {
      provide: 'APP_INITIALIZER',
      useFactory: (envService: EnvService) => async () => {
        await envService.clearEnvFile();
        await envService.writeDbConnectionsToEnv();
      },
      inject: [EnvService],
    },
  ],
})
export class AppModule {}