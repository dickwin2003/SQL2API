import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { DbConnService } from '../services/db-conn.service';

@Injectable()
export class EnvService {
  private envPath = '.env';

  constructor(private dbConnService: DbConnService) {}

  async clearEnvFile(): Promise<void> {
    await fs.promises.writeFile(this.envPath, '');
  }

  async writeDbConnectionsToEnv(): Promise<void> {
    const connections = await this.dbConnService.findAll();
    
    let envContent = '';
    connections.forEach((conn, index) => {
      envContent += `# Database Connection ${index + 1}\n`;
      envContent += `DB_HOST_${index + 1}=${conn.host}\n`;
      envContent += `DB_PORT_${index + 1}=${conn.port}\n`;
      envContent += `DB_USER_${index + 1}=${conn.username}\n`;
      envContent += `DB_PASSWORD_${index + 1}=${conn.password}\n`;
      envContent += `DB_NAME_${index + 1}=${conn.database}\n`;
      envContent += `DB_TYPE_${index + 1}=${conn.type}\n\n`;
    });

    await fs.promises.appendFile(this.envPath, envContent);
  }
}
