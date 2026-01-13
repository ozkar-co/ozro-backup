import 'dotenv/config';
import { startAPI } from './api/server.js';
import { initializeMariaDB } from './services/mariadb.js';
import { initializeBackupTask } from './tasks/backup.js';

async function main() {
    try {
        // Inicializar conexion a base de datos
        await initializeMariaDB();

        // Iniciar tarea programada de backup
        await initializeBackupTask();

        // Iniciar API
        await startAPI();

        console.log('Todos los servicios iniciados correctamente');
    } catch (error) {
        console.error('Error al iniciar los servicios:', error);
        process.exit(1);
    }
}

main(); 