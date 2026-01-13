# Ozro Backup

Sistema de backup automatico y API REST para base de datos MariaDB.

## Caracteristicas

- API REST para consultar informacion de la base de datos
- Backup automatico de tablas MariaDB configurables
- Tareas programadas integradas
- Sin autenticacion (datos publicos)

## Requisitos

- Node.js 18 o superior
- MariaDB

## Configuracion

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
# Una tabla por linea
usuarios
productos
ventas
```

## Uso

Iniciar el servidor:
```bash
npm start
```

Para desarrollo con recarga automatica:
```bash
npm run dev
```

## Estructura del Proyecto

```
src/
  ├── api/           # API REST
  ├── services/      # Servicios de conexion (MariaDB)
  └── tasks/         # Tareas programadas (backup)
doc/                 # Documentacion de endpoints
backups/             # Archivos de backup generados
```

## API Endpoints

La API escucha en el puerto 3001 (configurable via API_PORT).

### Endpoints disponibles:

- `GET /health` - Health check del servicio
- `GET /players` - Numero de jugadores en linea
- `GET /stats` - Estadisticas generales del servidor
- `GET /rankings/accounts` - Ranking de cuentas por zeny
- `GET /rankings/characters` - Ranking de personajes por nivel

Ver documentacion completa en: [doc/endpoints.md](doc/endpoints.md)

## Backups

Los backups se realizan automaticamente:
- **Backup diario**: 3 AM (tablas configuradas en backup.conf)
- **Backup completo**: Domingos 4 AM (todas las tablas)

Los archivos de backup se guardan en el directorio `backups/` en formato JSON y SQL. 
