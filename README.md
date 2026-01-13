# Ozro Backup

Sistema de backup automático y API REST para base de datos MariaDB.

## Características

- API REST para consultar información de la base de datos
- Backup automático de tablas MariaDB configurables
- Tareas programadas integradas
- Sin autenticación (datos públicos)

## Requisitos

- Node.js 18 o superior
- MariaDB

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
   - Copia `.env.example` a `.env`
   ```bash
   cp .env.example .env
   ```
   - Configura las variables en `.env`:
     - Variables de MariaDB
     - Puerto de la API (por defecto 3001)

3. Crear archivo `backup.conf` con las tablas a respaldar:
```
# Una tabla por línea
usuarios
productos
ventas
```

## Uso

Iniciar el servidor:
```bash
npm start
```

Para desarrollo con recarga automática:
```bash
npm run dev
```

## Estructura del Proyecto

```
src/
  ├── api/           # API REST
  ├── services/      # Servicios de conexión (MariaDB)
  └── tasks/         # Tareas programadas (backup)
doc/                 # Documentación de endpoints
backups/             # Archivos de backup generados
```

## API Endpoints

La API escucha en el puerto 3001 (configurable via API_PORT).

### Endpoints disponibles:

- `GET /health` - Health check del servicio
- `GET /players` - Número de jugadores en línea
- `GET /stats` - Estadísticas generales del servidor
- `GET /rankings/accounts` - Ranking de cuentas por zeny
- `GET /rankings/characters` - Ranking de personajes por nivel

Ver documentación completa en: [doc/endpoints.md](doc/endpoints.md)

## Backups

Los backups se realizan automáticamente:
- **Backup diario**: 3 AM (tablas configuradas en backup.conf)
- **Backup completo**: Domingos 4 AM (todas las tablas)

Los archivos de backup se guardan en el directorio `backups/` en formato JSON y SQL. 
