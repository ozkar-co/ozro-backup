# Documentación de Endpoints

API REST para consultar información de la base de datos del servidor.

Base URL: `http://localhost:3001` (producción: `https://ozro-api.ozkr.net`)

## GET /assets/*

Archivos estáticos de imágenes del juego (atlases WebP + manifest JSON). Generados localmente con `ozro-cli` → `npm run assets`.

- `GET /assets/manifest.json` — índice de atlases (iconos, ilustraciones, sprites)
- `GET /assets/items/icons/atlas_N.webp` — atlas de iconos
- `GET /assets/items/illustrations/atlas_N.webp` — atlas de ilustraciones
- `GET /assets/mobs/sprites/atlas_N.webp` — atlas de sprites de monstruos

Cada atlas tiene un `.json` hermano con coordenadas `{ "itemId": { "x", "y", "w", "h" } }`.

---

Health check del servicio.

**Respuesta exitosa:**
```json
{
  "status": "OK"
}
```

---

## GET /uptime

Obtiene el tiempo de actividad de la API.

**Respuesta exitosa:**
```json
{
  "uptime": {
    "seconds": 3661.234,
    "milliseconds": 3661234.567,
    "formatted": "0d 1h 1m 1s"
  }
}
```

**Campos:**
- `uptime` (object): Información del tiempo de actividad
  - `seconds` (number): Tiempo de actividad en segundos
  - `milliseconds` (number): Tiempo de actividad en milisegundos
  - `formatted` (string): Formato legible (días, horas, minutos, segundos)

---

## GET /status

Verifica el estado de los servicios de game server (login, char, map).

**Respuesta exitosa:**
```json
{
  "timestamp": "2026-01-15T10:30:45.123Z",
  "services": {
    "login": {
      "status": "online"
    },
    "char": {
      "status": "online"
    },
    "map": {
      "status": "online"
    }
  }
}
```

**Campos:**
- `timestamp` (string): Fecha y hora de la consulta
- `services` (object): Estado de los servicios
  - `login` (object): Estado del servicio de login (puerto 6900)
    - `status` (string): `online` u `offline`
  - `char` (object): Estado del servicio de character (puerto 6121)
    - `status` (string): `online` u `offline`
  - `map` (object): Estado del servicio de map (puerto 5121)
    - `status` (string): `online` u `offline`

---

## GET /players

Obtiene el número de jugadores actualmente en línea.

**Respuesta exitosa:**
```json
{
  "online": 42
}
```

**Campos:**
- `online` (number): Número de jugadores conectados actualmente

---

## GET /stats

Obtiene estadísticas generales del servidor.

**Respuesta exitosa:**
```json
{
  "timestamp": "2026-01-13T14:00:00.000Z",
  "accounts": {
    "total": 1500,
    "activeLastWeek": 450
  },
  "characters": {
    "total": 3200,
    "activeLast24h": 280,
    "highestLevel": 99,
    "averageLevel": 65,
    "maxLevelCount": 15
  },
  "guilds": {
    "total": 45
  },
  "economy": {
    "totalZeny": "1234567890",
    "bankZeny": "567890123",
    "averageZenyPerChar": 385802,
    "averageZenyPerAccount": 823045
  }
}
```

**Campos:**
- `timestamp` (string): Fecha y hora de la consulta
- `accounts` (object): Estadísticas de cuentas
  - `total` (number): Total de cuentas (excluyendo admins)
  - `activeLastWeek` (number): Cuentas activas en la última semana
- `characters` (object): Estadísticas de personajes
  - `total` (number): Total de personajes (excluyendo borrados y admins)
  - `activeLast24h` (number): Personajes activos en las últimas 24 horas
  - `highestLevel` (number): Nivel base más alto
  - `averageLevel` (number): Nivel base promedio
  - `maxLevelCount` (number): Cantidad de personajes en el nivel máximo
- `guilds` (object): Estadísticas de gremios
  - `total` (number): Total de gremios
- `economy` (object): Estadísticas económicas
  - `totalZeny` (string): Zeny total en el servidor
  - `bankZeny` (string): Zeny en bancos
  - `averageZenyPerChar` (number): Promedio de zeny por personaje
  - `averageZenyPerAccount` (number): Promedio de zeny por cuenta

---

## GET /rankings/accounts

Obtiene el ranking de cuentas ordenado por zeny total.

**Respuesta exitosa:**
```json
{
  "timestamp": "2026-01-13T14:00:00.000Z",
  "rankings": [
    {
      "account_id": 123,
      "userid": "player1",
      "logincount": 450,
      "total_zeny": "5000000",
      "total_cards": "150",
      "total_cards_distinct": "80",
      "total_mvp_cards": "5",
      "total_boss_cards": "12",
      "total_diamonds": "25"
    }
  ]
}
```

**Campos:**
- `timestamp` (string): Fecha y hora de la consulta
- `rankings` (array): Lista de cuentas ordenadas por total_zeny descendente
  - `account_id` (number): ID de la cuenta
  - `userid` (string): Nombre de usuario
  - `logincount` (number): Cantidad de inicios de sesión
  - `total_zeny` (string): Zeny total (personajes + banco)
  - `total_cards` (string): Total de cartas
  - `total_cards_distinct` (string): Total de cartas distintas
  - `total_mvp_cards` (string): Total de cartas MVP
  - `total_boss_cards` (string): Total de cartas Boss
  - `total_diamonds` (string): Total de diamantes (item 6024)

---

## GET /rankings/characters

Obtiene el ranking de personajes ordenado por nivel y experiencia.

**Respuesta exitosa:**
```json
{
  "timestamp": "2026-01-13T14:00:00.000Z",
  "rankings": [
    {
      "char_id": 456,
      "account_id": 123,
      "userid": "player1",
      "name": "CharName",
      "class": 4002,
      "base_level": 99,
      "base_exp": 3500000,
      "job_exp": "1500000",
      "fame": 100
    }
  ]
}
```

**Campos:**
- `timestamp` (string): Fecha y hora de la consulta
- `rankings` (array): Lista de personajes ordenados por base_level y base_exp descendente
  - `char_id` (number): ID del personaje
  - `account_id` (number): ID de la cuenta
  - `userid` (string): Nombre de usuario de la cuenta
  - `name` (string): Nombre del personaje
  - `class` (number): Clase del personaje
  - `base_level` (number): Nivel base
  - `base_exp` (number): Experiencia base total acumulada
  - `job_exp` (string): Experiencia de trabajo
  - `fame` (number): Puntos de fama

---

## GET /mobs

Búsqueda de monstruos con filtros. Usa tablas renewal (`mob_db_re` + `mob_db2_re`).

**Query params (todos opcionales):**

| Param | Descripción |
|-------|-------------|
| `q` | Nombre o ID |
| `element` | Elementos separados por coma (`Fire,Water`) |
| `race` | Razas separadas por coma (`Brute,Demon`) |
| `size` | Tamaños (`Small,Medium,Large`) |
| `levelMin` / `levelMax` | Rango de nivel |
| `baseExpMin` / `baseExpMax` | Rango de base exp |
| `jobExpMin` / `jobExpMax` | Rango de job exp |
| `attackRange` | Rango de ataque |
| `mvp` | `true` o `false` |
| `page` | Página (default: 1) |
| `limit` | Resultados por página (default: 20, max: 100) |

**Ejemplo:** `GET /mobs?q=poring&element=Neutral&mvp=false&page=1&limit=20`

**Respuesta exitosa:**
```json
{
  "total": 1,
  "page": 1,
  "limit": 20,
  "results": [
    {
      "id": 1002,
      "name": "Poring",
      "nameAegis": "PORING",
      "level": 1,
      "element": "Neutral",
      "race": "Plant",
      "size": "Medium",
      "baseExp": 2,
      "jobExp": 1,
      "isMvp": false
    }
  ]
}
```

---

## GET /mobs/meta

Opciones de filtro disponibles en la base de datos.

**Respuesta exitosa:**
```json
{
  "elements": ["Fire", "Neutral", "Water"],
  "races": ["Brute", "Plant"],
  "sizes": ["Medium", "Small"],
  "defaults": {
    "elements": ["Neutral", "Water", "Earth", "Fire", "Wind", "Poison", "Holy", "Shadow", "Ghost", "Undead"],
    "races": ["Formless", "Undead", "Brute", "Plant", "Insect", "Fish", "Demon", "Demi-Human", "Angel", "Dragon"],
    "sizes": ["Small", "Medium", "Large"]
  }
}
```

---

## GET /mobs/:id

Detalle de un monstruo con stats, modos y drops resueltos contra `item_db_re_*`.

**Respuesta exitosa:** objeto con campos del listado más `str`, `agi`, `vit`, `int`, `dex`, `luk`, `modes`, `drops`.

**404:** monstruo no encontrado.

**Nota:** el filtro `hasSpawn` (ocultar monstruos sin ubicación de spawn) queda pendiente hasta importar datos de spawn.

---

## GET /items

Búsqueda de objetos con filtros. Usa tablas renewal unidas (`item_db_re_usable` + `item_db_re_equip` + `item_db_re_etc`, más `item_db2_re` si existe).

**Query params (todos opcionales):**

| Param | Descripción |
|-------|-------------|
| `q` | Nombre o ID |
| `type` | Tipos separados por coma (`Weapon,Armor,Card`) |
| `class` | Clases (`normal,upper,third,fourth`) |
| `jobs` | Jobs separados por coma (`knight,mage,archer`) |
| `jobsStrict` | `true` = no incluir items con `job_all` |
| `script` | Keyword en columna `script` |
| `slots` | Slots separados por coma (`0,1,2,3,4`) |
| `hasDrop` | `true` = solo items que algún mob dropea; `false` = sin drop |
| `page` | Página (default: 1) |
| `limit` | Resultados por página (default: 20, max: 100) |

**Ejemplo:** `GET /items?type=Weapon&jobs=knight&hasDrop=true&slots=2,3`

**Respuesta exitosa:**
```json
{
  "total": 5,
  "page": 1,
  "limit": 20,
  "results": [
    {
      "id": 1101,
      "name": "Sword",
      "nameAegis": "Sword",
      "type": "Weapon",
      "subtype": "1hSword",
      "attack": 25,
      "slots": 3
    }
  ]
}
```

**Nota:** filtro por descripción de item no disponible en v1 (no está en las tablas `item_db_re_*`).

---

## GET /items/meta

Opciones de filtro para objetos.

**Respuesta exitosa:**
```json
{
  "types": ["Armor", "Weapon", "Card"],
  "classes": ["normal", "upper", "baby", "third", "third_upper", "third_baby", "fourth"],
  "jobs": ["novice", "swordman", "mage", "knight"],
  "defaults": {
    "types": ["Healing", "Usable", "Etc", "Armor", "Weapon", "Card"]
  }
}
```

---

## GET /items/:id

Detalle de un objeto con jobs, clases, ubicaciones de equip, scripts y lista `droppedBy` (mobs que lo dropean).

**404:** objeto no encontrado.

---

## Códigos de Error

**500 Internal Server Error:**
```json
{
  "error": "Error al obtener [recurso]"
}
```

Se retorna cuando hay un error en la consulta a la base de datos.
