# Task Manager

## Iniciar localmente

Requisitos: Docker y Docker Compose (`docker-compose` en algunas instalaciones). La base de datos, API y frontend se inician juntos:

```bash
docker-compose up --build -d
```

Abre <http://localhost:4300>. La API responde en <http://localhost:8082/api/health>. PostgreSQL queda disponible solo en tu equipo en `localhost:5433`; la aplicación usa la red interna de Compose.

La primera compilación puede tardar unos minutos porque descarga Java, Maven, Node y dependencias. Para ver el arranque y los errores:

```bash
docker-compose logs -f
```

El registro público crea usuarios `DEVELOPER`. Para obtener el primer administrador local:

1. Registra una cuenta desde <http://localhost:4300/auth/register>.
2. Promuévela en la base local, sustituyendo el correo:

   ```bash
   ./scripts/promote-local-admin.sh tu-correo@ejemplo.com
   ```

3. Inicia sesión de nuevo. Desde administración podrás crear cuentas con rol `ADMIN`, `MANAGER`, `SCRUM` o `DEVELOPER`.

Para apagar los servicios sin borrar la base:

```bash
docker-compose down
```

Después de editar código en la carpeta del proyecto, reconstruye con `docker-compose up --build -d` para aplicar cambios.

Para reiniciar la base desde cero y borrar todos los datos locales:

```bash
docker-compose down -v
```

Las credenciales de `compose.yaml` son valores de desarrollo local. Puedes copiarlas a `.env` y cambiarlas. No publiques esos valores ni expongas los puertos localmente configurados a Internet.

## Desarrollo sin Docker para el frontend

Si ejecutas la API en tu máquina en el puerto 8080, instala dependencias y arranca Angular:

```bash
npm ci
npm start
```

`proxy.conf.json` reenvía `/api` a `http://127.0.0.1:8080`.

## Compilar y probar

```bash
npm test -- --watch=false
npm run build
```

Las pruebas de navegador requieren el backend, la base local y Chromium de Playwright:

```bash
npx playwright install chromium
npm run e2e
```

## Variables locales

Compose tiene valores de desarrollo por defecto. Para sobrescribirlos, copia `.env.example` como `.env` y cambia `DB_PASSWORD` y `JWT_SECRET`. El backend valida el secreto JWT y no imprime SQL por defecto.
