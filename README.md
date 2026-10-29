# Task Manager

<div align="center">

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Playwright](https://img.shields.io/badge/Testing-Playwright-45ba4b?logo=playwright&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-success)

</div>

Aplicación web de gestión de tareas desarrollada con Angular, pensada para funcionar con un backend Java y PostgreSQL. El proyecto incluye flujo de autenticación, administración de usuarios, roles y una experiencia de uso preparada para entorno local y desarrollo colaborativo.

## Descripción

Task Manager es una solución de gestión de proyectos y tareas orientada a equipos que necesitan:

- crear, organizar y priorizar tareas,
- asignar roles y permisos por usuario,
- gestionar flujos de trabajo con distintos niveles de acceso,
- ejecutar la aplicación completa en entorno local con Docker.

## Características principales

- Interfaz moderna construida con Angular 21
- Gestión de autenticación y autorización
- Roles: `ADMIN`, `MANAGER`, `SCRUM`, `DEVELOPER`
- Desarrollo local simplificado con Docker Compose
- Proxy de API configurado para entorno frontend/backend
- Pruebas E2E con Playwright
- Configuración de variables de entorno segura

## Stack tecnológico

- Angular 21
- TypeScript
- RxJS
- Tailwind CSS
- Playwright
- Docker / Docker Compose
- PostgreSQL 16
- Java 17 + Spring Boot (backend asociado)

## Requisitos previos

Antes de iniciar el proyecto asegúrate de tener instalado:

- Node.js 22+ (versiones soportadas en `engines.node`)
- npm 10.9+ (el proyecto fija `npm@10.9.2` en `packageManager`)
- Docker
- Docker Compose

## Inicio rápido

### Opción 1: Ejecutar con Docker Compose

```bash
docker-compose up --build -d
```

La aplicación quedará disponible en:

- Frontend: http://localhost:4300
- API: http://localhost:8082/api/health
- Base de datos PostgreSQL: localhost:5433

Para ver logs:

```bash
docker-compose logs -f
```

Para detener los servicios:

```bash
docker-compose down
```

### Opción 2: Desarrollo local sin Docker

```bash
npm ci
npm start
```

Esto arrancará la app frontend en modo de desarrollo y usará el proxy configurado para la API.

## Variables de entorno

El repositorio incluye un archivo `.env.example` como referencia. Cópialo a `.env` y configura valores seguros para tu entorno local:

```bash
cp .env.example .env
```

Variables recomendadas:

- `DB_PASSWORD`
- `JWT_SECRET`
- `STRIPE_PUBLISHABLE_KEY` (opcional para Stripe.js; solo clave pública `pk_test_...` o `pk_live_...`)
- `BILLING_SIMULATE` (opcional; solo `true`, `false` o vacío)
- `API_URL` (opcional; ruta base de la API, por defecto `/api`)

Los comandos `npm start`, `npm run build` y `npm test` generan temporalmente la configuración Angular a partir de `STRIPE_PUBLISHABLE_KEY`, `API_URL` y `BILLING_SIMULATE`, y la eliminan al terminar. Para Compose, define esas variables en `.env` antes de construir el frontend. Nunca uses aquí `STRIPE_SECRET_KEY` ni `STRIPE_WEBHOOK_SECRET`.

No compartas estos valores ni los subas a repositorios públicos.

### Despliegue en Vercel

`vercel.json` publica `dist/task-front/browser` y reescribe `/api/:path*` hacia el backend en Render. En Vercel **no definas `API_URL`** (o déjala vacía): el front usa `/api`, el rewrite enruta al backend y las cookies HttpOnly de autenticación se mantienen en el mismo origen.

Si defines `API_URL` con la URL completa del backend (por ejemplo `https://task-back-vosa.onrender.com/api`), las peticiones pasan a ser cross-site y las cookies `SameSite=Lax` no se envían, por lo que el login falla aunque las credenciales sean correctas.

`BILLING_SIMULATE` solo admite `true`, `false` o vacío; cualquier otro valor detiene el build con un mensaje explícito.

El proyecto fija `npm@10.9.2` en `packageManager` porque Vercel compila con Node 22 y npm 10. Al añadir o actualizar dependencias usa ese mismo npm:

```bash
npx -y npm@10.9.2 install
```

Un `package-lock.json` regenerado con npm 11 puede ser rechazado por `npm ci` en Vercel con errores del tipo `Missing: <paquete> from lock file`.

## Scripts disponibles

```bash
npm run start
npm run build
npm test -- --watch=false
npm run e2e
```

## Estructura del proyecto

```text
.
├── .env.example
├── .gitignore
├── README.md
├── angular.json
├── compose.yaml
├── package.json
├── proxy.conf.json
├── proxy.docker.conf.json
├── proxy.e2e.conf.json
├── public/
├── scripts/
├── src/
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.spec.json
└── e2e/
```

## Pruebas

Para ejecutar la suite de pruebas del frontend:

```bash
npm test -- --watch=false
```

Para pruebas de navegador con Playwright:

```bash
npx playwright install chromium
npm run e2e
```

## Seguridad

Este proyecto sigue buenas prácticas para evitar la exposición de secretos:

- no se deben commitear archivos `.env` ni credenciales reales,
- se usa `.env.example` como base segura de configuración,
- la documentación evita incluir contraseñas o tokens en el repositorio.

## Contribución

Las contribuciones son bienvenidas. Si deseas colaborar:

1. Haz fork del proyecto.
2. Crea una rama para tu cambio.
3. Realiza tus modificaciones.
4. Abre un pull request con una descripción clara.

## Contacto

Si necesitas ayuda o quieres colaborar en el proyecto, puedes contactar con el responsable del repositorio o abrir una issue en GitHub.

---

Hecho con Angular, TypeScript y Docker para desarrollo moderno y escalable.
