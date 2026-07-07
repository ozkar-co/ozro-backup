import 'dotenv/config';
import { startAPI } from './api/server.js';
import { initializeMariaDB } from './services/mariadb.js';
import { initializeGameDb } from './api/services/gameDb.js';
import { initializeBackupTask } from './tasks/backup.js';

async function main() {
    try {
        await initializeMariaDB();
        await initializeGameDb();
        await initializeBackupTask();
        await startAPI();

        console.log('Todos los servicios iniciados correctamente');
    } catch (error) {
        console.error('Error al iniciar los servicios:', error);
        process.exit(1);
    }
}

main(); 