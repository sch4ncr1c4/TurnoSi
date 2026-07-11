# Project Constitution

Versión: 1.0  
Uso: estándar base para proyectos SaaS, micro-SaaS, dashboards, APIs, productos internos y sistemas comerciales.

---

## 1. Propósito

Este documento define los principios técnicos, arquitectónicos, operativos y de producto que deben guiar todos los proyectos del ecosistema.

Toda decisión debe priorizar:

1. Simplicidad.
2. Seguridad.
3. Mantenibilidad.
4. Claridad para humanos e IA.
5. Experiencia de usuario.
6. Rendimiento.
7. Bajo costo operativo.
8. Escalabilidad progresiva.
9. Consistencia entre proyectos.

La mejor solución no es la más sofisticada.  
La mejor solución es la más simple que resuelve correctamente el problema real.

---

## 2. Principios Fundamentales

### 2.1 Simplicidad Primero

Preferir soluciones directas, legibles y fáciles de mantener.

Evitar:

- sobreingeniería;
- abstracciones prematuras;
- patrones innecesarios;
- dependencias sin justificación;
- optimizaciones para problemas que todavía no existen.

### 2.2 Construir para Hoy, Preparar para Mañana

No diseñar desde el inicio para millones de usuarios si el producto todavía está validando mercado.

Diseñar para:

- crecer progresivamente;
- reemplazar piezas sin reescrituras masivas;
- aislar dominios de negocio;
- escalar primero por arquitectura y cache, después por infraestructura.

### 2.3 Complejidad Justificada

Toda decisión compleja debe responder:

- ¿Qué problema real resuelve?
- ¿Qué costo técnico, económico u operativo agrega?
- ¿Qué riesgo reduce?
- ¿Qué alternativa simple se evaluó?

Si la respuesta no es clara, no se implementa.

### 2.4 Seguridad por Defecto

La seguridad no se agrega al final. Cada feature debe considerar autenticación, autorización, validación, privacidad, auditoría y abuso desde el diseño.

### 2.5 Producto Antes que Tecnología

La tecnología debe servir al negocio y a los usuarios.

Antes de construir una feature, definir:

- quién la usa;
- qué problema resuelve;
- qué resultado espera el usuario;
- cómo se medirá si funciona;
- qué pasa si falla.

---

## 3. Stack Tecnológico Oficial

### 3.1 Frontend

- React.
- TypeScript.
- Tailwind CSS.
- Vite o framework equivalente cuando el proyecto lo justifique.

### 3.2 Backend

- Node.js.
- Express.
- TypeScript.
- Zod.
- Prisma.

### 3.3 Base de Datos

- PostgreSQL.
- Supabase cuando aporte velocidad, autenticación, storage o infraestructura administrada.

### 3.4 Infraestructura

- Cloudflare Pages.
- Cloudflare CDN y cache.
- Render para servicios backend cuando corresponda.
- GitHub para repositorio, issues, CI/CD y automatización.

### 3.5 Servicios Externos

- Resend para emails.
- GitHub para control de versiones y despliegue.
- Stripe, Lemon Squeezy, Mercado Pago u otro proveedor de pagos solo cuando el producto lo requiera.

### 3.6 Regla de Stack

No agregar tecnología nueva sin justificar:

- problema que resuelve;
- costo operativo;
- curva de aprendizaje;
- impacto en deploy;
- impacto en testing;
- plan de salida si deja de servir.

---

### 3.7 Gestión de Dependencias

#### Gestor de Paquetes Oficial

El gestor de paquetes oficial para proyectos Node.js es **pnpm**.

Razones:

* instalación más rápida;
* menor consumo de espacio en disco;
* gestión de dependencias más estricta;
* mejor aislamiento de paquetes;
* reducción de problemas asociados a dependencias transitivas;
* mayor consistencia entre entornos de desarrollo y CI/CD.

No utilizar npm o yarn en nuevos proyectos salvo justificación explícita.

#### Seguridad de Dependencias

La seguridad de un proyecto depende principalmente de las dependencias utilizadas, no del gestor de paquetes.

Por lo tanto:

* revisar nuevas dependencias antes de incorporarlas;
* eliminar dependencias sin uso;
* mantener dependencias actualizadas;
* ejecutar auditorías periódicas;
* evitar paquetes abandonados o con bajo mantenimiento;
* minimizar la cantidad total de dependencias externas.

Antes de agregar una dependencia nueva responder:

1. ¿Resuelve un problema real?
2. ¿Puede resolverse con código propio simple?
3. ¿Está mantenida activamente?
4. ¿Cuál es el impacto en seguridad, bundle y mantenimiento?

Toda dependencia nueva debe estar justificada.

### 3.8 Herramientas de IA

Los asistentes de IA, agentes y herramientas de generación de código deben seguir esta constitución como fuente principal de decisiones técnicas.

Reglas:

- Priorizar simplicidad sobre sofisticación.
- Realizar el cambio mínimo necesario.
- Seguir la arquitectura existente.
- No agregar dependencias sin justificación.
- Preferir pnpm como gestor de paquetes.
- Mantener compatibilidad con TypeScript strict.
- Utilizar Zod para validaciones.
- No introducir abstracciones prematuras.
- No generar documentación, tests o refactors masivos salvo solicitud explícita.
- Preferir modificaciones incrementales sobre reescrituras completas.

Las respuestas de herramientas de IA deben ser concisas y enfocadas en la tarea solicitada.

## 4. Alcance SaaS

Todo proyecto SaaS o micro-SaaS debe considerar desde el inicio:

- usuarios;
- organizaciones o workspaces cuando aplique;
- roles y permisos;
- planes y límites de uso;
- billing y suscripciones;
- onboarding;
- estados de cuenta;
- emails transaccionales;
- auditoría;
- soporte;
- métricas de producto;
- backups;
- privacidad de datos;
- operación en producción.

No todos los proyectos necesitan implementar todo desde el día uno, pero la arquitectura no debe bloquear estas capacidades.

---

## 5. Arquitectura General

### 5.1 Separación de Responsabilidades

Frontend:

- interfaz;
- experiencia de usuario;
- estado de UI;
- consumo de APIs;
- validación de ayuda, no de seguridad.

Backend:

- lógica de negocio;
- autenticación;
- autorización;
- validación real;
- integraciones externas;
- jobs;
- webhooks;
- auditoría.

Base de datos:

- verdad persistente del negocio;
- integridad referencial;
- relaciones;
- índices;
- auditoría crítica.

Infraestructura:

- despliegue;
- cache;
- CDN;
- monitoreo;
- secretos;
- escalabilidad.

### 5.2 Modularidad

Cada módulo debe representar un dominio claro.

Ejemplos:

- auth;
- users;
- organizations;
- billing;
- subscriptions;
- products;
- orders;
- notifications;
- files;
- audit;
- admin;
- integrations.

Evitar mezclar lógica de dominios distintos en un mismo servicio.

### 5.3 Monolito Modular Primero

Para SaaS pequeños y medianos, preferir un monolito modular antes que microservicios.

Microservicios solo se justifican si existe:

- necesidad de escalar partes de forma independiente;
- equipos separados;
- límites de dominio maduros;
- carga técnica que el monolito no puede absorber;
- capacidad operativa para mantenerlos.

---

## 6. Estructura Recomendada

### 6.1 Backend

```text
src/
├── app.ts
├── server.ts
├── config/
├── database/
├── middlewares/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   └── auth.schemas.ts
│   ├── users/
│   ├── organizations/
│   ├── billing/
│   └── notifications/
├── repositories/
├── services/
├── jobs/
├── webhooks/
├── lib/
├── utils/
├── types/
└── tests/
```

### 6.2 Frontend

```text
src/
├── app/
├── assets/
├── components/
│   ├── ui/
│   └── domain/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── billing/
│   └── settings/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── stores/
├── types/
└── utils/
```

### 6.3 Documentación del Proyecto

Todo proyecto debe incluir:

```text
README.md
.env.example
PROJECT-CONSTITUTION.md o link a esta constitución
docs/
├── architecture.md
├── api.md
├── setup.md
├── deployment.md
└── decisions/
```

Las decisiones importantes deben registrarse como ADRs simples en `docs/decisions/`.

---

## 7. TypeScript y Calidad de Código

### 7.1 TypeScript Estricto

Siempre usar:

```json
{
  "strict": true
}
```

Evitar:

- `any`;
- `@ts-ignore`;
- tipos duplicados;
- objetos sin contrato;
- soluciones temporales permanentes.

Si se usa `any`, debe estar justificado y aislado.

### 7.2 Convenciones

Priorizar:

- nombres descriptivos;
- funciones pequeñas;
- responsabilidades claras;
- código legible;
- módulos cohesivos;
- consistencia sobre preferencias personales.

### 7.3 Reutilización

No duplicar lógica de negocio.

Antes de crear código nuevo verificar:

1. si ya existe;
2. si puede reutilizarse;
3. si puede extraerse sin crear una abstracción artificial.

### 7.4 Comentarios

Comentar el porqué, no lo obvio.

Usar comentarios para:

- decisiones no evidentes;
- reglas de negocio;
- integraciones externas;
- workarounds temporales con fecha o condición de eliminación.

---

## 8. Validación y Contratos

### 8.1 Regla General

Toda entrada externa debe validarse.

Fuentes externas:

- formularios;
- APIs;
- webhooks;
- query params;
- route params;
- headers;
- archivos;
- variables de entorno;
- datos de servicios externos.

### 8.2 Herramienta Oficial

Zod es la herramienta estándar de validación.

Usar schemas para:

- requests;
- responses cuando corresponda;
- variables de entorno;
- payloads de webhooks;
- formularios;
- configuración.

### 8.3 Validación Frontend vs Backend

Frontend valida para mejorar UX.  
Backend valida para proteger el sistema.

Nunca confiar únicamente en el frontend.

---

## 9. APIs

### 9.1 Estilo

Usar REST consistente salvo que exista una razón clara para otro enfoque.

Ejemplos:

```text
/api/v1/auth
/api/v1/users
/api/v1/organizations
/api/v1/products
/api/v1/billing
```

### 9.2 Convenciones

Usar métodos HTTP correctamente:

- `GET` para leer;
- `POST` para crear o ejecutar acciones;
- `PATCH` para actualizar parcialmente;
- `PUT` para reemplazar;
- `DELETE` para eliminar.

### 9.3 Respuestas Uniformes

Éxito:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Descripción del error",
  "code": "ERROR_CODE"
}
```

### 9.4 Errores

Centralizar errores en middleware.

Nunca exponer al cliente:

- stack traces;
- secretos;
- detalles internos de infraestructura;
- errores crudos de base de datos.

### 9.5 Paginación y Filtros

Toda lista potencialmente grande debe soportar:

- paginación;
- filtros;
- ordenamiento;
- límites máximos.

Evitar endpoints que devuelvan cantidades ilimitadas de datos.

### 9.6 Versionado

Versionar APIs públicas desde el inicio:

```text
/api/v1
```

Cambios incompatibles requieren nueva versión o plan de migración.

---

## 10. Autenticación, Autorización y Tenancy

### 10.1 Autenticación

Toda sesión debe ser segura, expirable y revocable.

Considerar:

- login por email y password;
- OAuth si aporta valor real;
- magic links si mejora onboarding;
- recuperación de contraseña;
- verificación de email;
- rotación de tokens;
- cierre de sesión.

### 10.2 Autorización

No alcanza con saber quién es el usuario. Cada acción debe verificar si puede realizarla.

Modelos posibles:

- roles simples: owner, admin, member, viewer;
- permisos granulares;
- políticas por recurso.

### 10.3 Multi-Tenant

Cuando el producto tenga organizaciones, workspaces, clientes o cuentas separadas, cada recurso debe estar asociado a su tenant.

Reglas:

- toda query sensible debe filtrar por tenant;
- nunca confiar en IDs enviados por el cliente sin verificar pertenencia;
- los admins internos deben tener permisos explícitos;
- las acciones cross-tenant deben auditarse.

### 10.4 Cuentas y Organizaciones

Separar claramente:

- usuario: persona que inicia sesión;
- organización/workspace: entidad de negocio;
- membership: relación entre usuario y organización;
- role: permisos dentro de esa organización.

---

## 11. Billing, Planes y Límites

### 11.1 Billing Como Dominio Crítico

Billing debe tratarse como lógica crítica.

Debe contemplar:

- planes;
- suscripciones;
- estado de pago;
- trial;
- cancelaciones;
- upgrades;
- downgrades;
- invoices;
- límites de uso;
- webhooks del proveedor.

### 11.2 Estados de Suscripción

Modelar estados explícitos:

- trialing;
- active;
- past_due;
- canceled;
- unpaid;
- paused.

No representar billing solo con un booleano `isPaid`.

### 11.3 Límites de Uso

Cada plan puede tener límites:

- usuarios;
- proyectos;
- almacenamiento;
- requests;
- exports;
- integraciones;
- features.

Los límites deben verificarse en backend.

### 11.4 Webhooks de Pago

Los webhooks deben ser:

- verificados con firma;
- idempotentes;
- registrados;
- reintentables;
- seguros ante eventos fuera de orden.

Nunca actualizar billing desde el frontend como fuente de verdad.

---

## 12. Base de Datos y Prisma

### 12.1 ORM Oficial

Prisma es el ORM estándar.

Objetivos:

- tipado seguro;
- productividad;
- migraciones controladas;
- consistencia entre proyectos.

### 12.2 Migraciones

Todo cambio de esquema debe realizarse mediante migraciones.

Nunca modificar producción manualmente sin:

- backup;
- plan de rollback;
- registro del cambio;
- validación posterior.

### 12.3 Modelado

Priorizar:

- nombres claros;
- relaciones explícitas;
- integridad referencial;
- constraints;
- índices adecuados;
- timestamps consistentes.

Campos comunes:

```text
id
createdAt
updatedAt
deletedAt cuando aplique
createdById cuando aplique
organizationId cuando aplique
```

### 12.4 Consultas

Evitar:

- overfetching;
- consultas innecesarias;
- N+1 queries;
- filtros hechos en memoria cuando deben hacerse en SQL.

Seleccionar solo los campos necesarios.

### 12.5 Soft Delete

Usar soft delete cuando el negocio requiera:

- recuperación;
- auditoría;
- historial;
- cumplimiento legal;
- evitar pérdida accidental.

No usar soft delete si complica innecesariamente un recurso simple.

### 12.6 Auditoría

Registrar acciones críticas:

- login;
- cambios de contraseña;
- cambios de rol;
- cambios de billing;
- creación, edición y eliminación de recursos importantes;
- exportaciones;
- accesos administrativos;
- cambios de configuración sensible.

### 12.7 Backups

Todo proyecto en producción debe tener:

- backups automáticos;
- política de retención;
- prueba de restauración;
- responsable claro;
- documentación del proceso.

Un backup no probado no cuenta como backup confiable.

---

## 13. Seguridad

### 13.1 Secretos

Nunca commitear:

- API keys;
- tokens;
- passwords;
- private keys;
- connection strings;
- secretos de webhooks.

Todo proyecto debe incluir `.env.example` sin valores reales.

### 13.2 Variables de Entorno

Validar variables al iniciar la app.

Separar por ambiente:

- development;
- preview/staging si existe;
- production.

Nunca compartir secretos entre ambientes.

### 13.3 Principio de Mínimo Privilegio

Cada servicio, token y usuario debe tener solo los permisos necesarios.

### 13.4 Protección de API

Implementar según corresponda:

- autenticación;
- autorización;
- rate limiting;
- validación;
- CORS configurado;
- headers de seguridad;
- protección CSRF si aplica;
- límites de payload;
- sanitización.

### 13.5 Rate Limiting y Abuso

Aplicar rate limiting especialmente en:

- login;
- registro;
- recuperación de contraseña;
- endpoints públicos;
- webhooks;
- generación de recursos costosos;
- acciones con IA;
- exports.

### 13.6 Archivos

Si el sistema acepta archivos:

- validar tipo;
- validar tamaño;
- renombrar archivos;
- evitar ejecución;
- usar storage privado por defecto;
- firmar URLs cuando corresponda;
- escanear contenido si el riesgo lo amerita.

### 13.7 Datos Sensibles

Minimizar almacenamiento de datos sensibles.

No guardar lo que no se necesita.

Cuando corresponda:

- cifrar;
- anonimizar;
- limitar acceso;
- registrar accesos;
- definir retención.

---

## 14. Rendimiento

### 14.1 Performance Como Feature

El rendimiento es parte del producto.

Cada feature debe considerar:

- tamaño de bundle;
- cantidad de requests;
- tiempo de respuesta;
- consultas a base de datos;
- costo de servicios externos;
- experiencia en mobile.

### 14.2 Optimizar Antes de Escalar

Antes de aumentar infraestructura revisar:

1. consultas;
2. índices;
3. payloads;
4. cache;
5. assets;
6. renderizado;
7. arquitectura.

### 14.3 Cache

Evaluar cache para:

- datos públicos;
- configuraciones;
- catálogos;
- dashboards pesados;
- resultados costosos;
- assets estáticos.

Toda cache debe tener:

- clave clara;
- TTL;
- estrategia de invalidación;
- comportamiento ante fallo.

### 14.4 Presupuesto Frontend

Objetivos:

- reducir JavaScript innecesario;
- minimizar requests;
- optimizar imágenes;
- evitar librerías pesadas;
- lazy load cuando corresponda;
- evitar renders innecesarios.

---

## 15. Cost Optimization

### 15.1 Filosofía

Cada operación tiene costo.

Evaluar:

- costo económico;
- consumo de CPU y memoria;
- consumo de base de datos;
- llamadas a APIs externas;
- almacenamiento;
- transferencia;
- costo humano de mantenimiento.

### 15.2 Orden de Escalado de Bajo Costo

Priorizar:

1. cache;
2. JSON estáticos;
3. CDN;
4. optimización de consultas;
5. jobs asíncronos;
6. escalado vertical;
7. escalado horizontal;
8. servicios especializados.

### 15.3 Cloudflare First

Siempre que sea posible evaluar primero:

- Cloudflare Pages;
- Cloudflare CDN;
- Cloudflare Cache;
- assets estáticos;
- edge redirects;
- cache rules.

### 15.4 Regla Fundamental

La base de datos almacena la verdad del negocio.  
No necesariamente debe responder cada lectura del usuario final.

Ejemplo correcto para lecturas masivas:

1. El administrador modifica datos.
2. El backend valida y guarda en PostgreSQL.
3. Se genera snapshot JSON.
4. Cloudflare distribuye el contenido.
5. Los usuarios finales consumen desde CDN.

---

## 16. Jobs, Colas y Procesos Asíncronos

Usar jobs para tareas que:

- tardan demasiado para una request;
- dependen de servicios externos lentos;
- pueden reintentarse;
- se ejecutan programadas;
- generan archivos;
- envían emails;
- procesan webhooks;
- sincronizan integraciones.

Todo job debe contemplar:

- idempotencia;
- reintentos;
- logs;
- estado;
- manejo de errores;
- límite de tiempo;
- alerta si falla repetidamente.

---

## 17. Emails y Notificaciones

### 17.1 Emails Transaccionales

Usar emails para:

- verificación de cuenta;
- recuperación de contraseña;
- invitaciones;
- recibos;
- alertas importantes;
- cambios sensibles;
- onboarding crítico.

### 17.2 Reglas

Los emails deben:

- ser claros;
- tener asunto específico;
- evitar información sensible innecesaria;
- incluir acción principal;
- manejar errores de envío;
- registrar eventos relevantes.

### 17.3 Preferencias

Cuando existan notificaciones no críticas, permitir preferencias de usuario.

---

## 18. Integraciones y Webhooks

Toda integración externa debe tener:

- módulo aislado;
- configuración por ambiente;
- manejo de errores;
- timeouts;
- retries;
- logs;
- documentación;
- estrategia si el proveedor falla.

Webhooks entrantes:

- verificar firma;
- validar payload;
- responder rápido;
- procesar pesado en background;
- guardar eventos recibidos;
- hacerlos idempotentes.

Webhooks salientes:

- firmar payloads cuando corresponda;
- registrar envíos;
- reintentar fallos;
- documentar contrato.

---

## 19. Frontend y UX

### 19.1 Mobile First

Diseñar primero para mobile:

1. mobile;
2. tablet;
3. desktop.

No diseñar desktop primero para luego comprimir.

### 19.2 Estados Obligatorios

Toda pantalla o acción debe contemplar:

- loading;
- success;
- error;
- empty;
- disabled;
- unauthorized;
- not found.

El usuario nunca debe preguntarse si el sistema está funcionando.

### 19.3 Formularios

Todo formulario debe tener:

- labels claros;
- validación visible;
- mensajes de error útiles;
- estado de envío;
- prevención de doble submit;
- persistencia razonable cuando falle;
- accesibilidad por teclado.

### 19.4 Diseño SaaS

Para SaaS, priorizar interfaces:

- claras;
- densas pero ordenadas;
- rápidas de escanear;
- consistentes;
- orientadas a tareas;
- sin decoración innecesaria.

Evitar que dashboards y herramientas internas parezcan landing pages.

### 19.5 Accesibilidad

Aplicar como mínimo:

- HTML semántico;
- navegación por teclado;
- labels correctos;
- contraste adecuado;
- foco visible;
- textos alternativos;
- mensajes de error asociados al campo.

---

## 20. SEO y Marketing Pages

Cuando el proyecto tenga páginas públicas:

- títulos descriptivos;
- meta descriptions;
- URLs amigables;
- Open Graph;
- sitemap.xml;
- robots.txt;
- canonical URLs cuando aplique;
- performance mobile;
- contenido indexable.

Las páginas privadas de aplicación no necesitan SEO, pero sí performance y accesibilidad.

---

## 21. Testing

### 21.1 Prioridad

Testear primero:

1. lógica crítica de negocio;
2. autorización;
3. billing;
4. webhooks;
5. validaciones;
6. servicios;
7. integraciones;
8. flujos principales de usuario.

### 21.2 Tipos de Tests

Usar según riesgo:

- unit tests para lógica pura;
- integration tests para servicios, base de datos y APIs;
- end-to-end tests para flujos críticos;
- contract tests para integraciones importantes;
- visual checks cuando la UI sea crítica.

### 21.3 Objetivo

Detectar errores antes de producción.

No escribir tests únicamente para inflar cobertura.

### 21.4 Mínimo Antes de Producción

Antes de producción deben estar cubiertos:

- login;
- autorización básica;
- creación del recurso principal;
- billing si existe;
- webhook de pago si existe;
- acciones destructivas;
- migraciones.

---

## 22. Observabilidad

Todo sistema debe poder responder:

- ¿Qué ocurrió?
- ¿Cuándo ocurrió?
- ¿A quién afectó?
- ¿Por qué ocurrió?
- ¿Qué servicio falló?
- ¿Se recuperó?

### 22.1 Logs

Registrar:

- errores;
- eventos importantes;
- acciones críticas;
- webhooks;
- jobs;
- integraciones externas;
- cambios de billing;
- acciones administrativas.

No loguear secretos ni datos sensibles innecesarios.

### 22.2 Métricas

Medir:

- disponibilidad;
- latencia;
- errores;
- uso de endpoints;
- uso de recursos;
- costos relevantes;
- tasa de conversión si aplica;
- activación y retención si aplica.

### 22.3 Alertas

Alertar por:

- caída del servicio;
- errores recurrentes;
- jobs fallando;
- webhooks fallando;
- base de datos inaccesible;
- fallos de pago;
- uso anormal o abuso.

---

## 23. Analytics de Producto

Cuando el producto esté en validación o crecimiento, medir:

- registro;
- activación;
- uso de features clave;
- conversión a pago;
- cancelaciones;
- retención;
- errores visibles para usuarios;
- embudos principales.

No recolectar datos innecesarios.

La analítica debe ayudar a decidir, no decorar dashboards.

---

## 24. Feature Flags y Configuración

Usar feature flags cuando se necesite:

- lanzar progresivamente;
- activar por plan;
- activar por usuario u organización;
- probar features;
- desactivar rápido algo riesgoso.

Las flags deben:

- tener dueño;
- tener propósito;
- limpiarse cuando ya no se usan;
- no reemplazar permisos de seguridad.

---

## 25. CI/CD y Ambientes

### 25.1 Ambientes

Mantener separados:

- development;
- preview/staging cuando aplique;
- production.

Cada ambiente debe tener:

- base de datos separada;
- variables separadas;
- servicios externos separados cuando sea posible;
- configuración clara.

### 25.2 Deploy

Todo deploy debe ser automático mediante GitHub o plataforma conectada.

Evitar procesos manuales no documentados.

### 25.3 Pipeline Mínimo

Antes de deploy:

- instalar dependencias;
- verificar tipos;
- correr lint;
- correr tests relevantes;
- generar build;
- validar migraciones cuando aplique.

### 25.4 Rollback

Todo proyecto en producción debe tener estrategia de rollback:

- rollback de código;
- rollback o forward-fix de migraciones;
- restauración de backup;
- comunicación interna.

---

## 26. Git y Trabajo en Equipo

### 26.1 Ramas

Estrategia recomendada:

```text
main
develop opcional
feature/*
fix/*
hotfix/*
```

Para proyectos pequeños, `main` + branches cortas es suficiente.

### 26.2 Commits

Formato recomendado:

```text
feat:
fix:
refactor:
docs:
chore:
style:
test:
perf:
security:
```

Ejemplos:

```text
feat: add organization invitations
fix: validate billing webhook signature
refactor: simplify product service
```

### 26.3 Pull Requests

Todo PR debe explicar:

- qué cambia;
- por qué cambia;
- cómo se probó;
- riesgos;
- screenshots si toca UI;
- migraciones si toca DB.

---

## 27. Documentación

La documentación es parte del producto.

Debe existir documentación clara para:

- setup local;
- variables de entorno;
- arquitectura;
- deploy;
- APIs;
- jobs;
- webhooks;
- decisiones técnicas;
- troubleshooting;
- operaciones de producción.

La documentación debe actualizarse junto con el código.

---

## 28. IA y Código AI-Friendly

Todo proyecto debe ser fácil de entender para desarrolladores e IA.

Reglas:

- nombres descriptivos;
- módulos pequeños;
- responsabilidades claras;
- estructura consistente;
- documentación breve pero útil;
- contratos explícitos;
- schemas reutilizables;
- evitar magia innecesaria.

Al usar IA para generar código:

- no aceptar cambios sin revisión;
- verificar seguridad;
- correr tests;
- revisar dependencias nuevas;
- evitar funcionalidades no solicitadas;
- preferir cambios pequeños y comprobables.

---

## 29. Privacidad, Legal y Compliance

Todo SaaS debe considerar:

- política de privacidad;
- términos de uso;
- consentimiento cuando aplique;
- eliminación de cuenta;
- exportación de datos cuando aplique;
- retención de datos;
- cookies y tracking;
- cumplimiento local según mercado objetivo.

No almacenar datos personales que el producto no necesita.

Si el producto maneja datos sensibles, salud, finanzas, menores de edad o información regulada, se requiere revisión específica antes de producción.

---

## 30. Soporte y Operación

Todo producto en producción debe tener:

- canal de soporte;
- forma de identificar usuario/organización afectada;
- logs suficientes;
- panel o procedimiento administrativo;
- proceso para incidentes;
- proceso para reembolsos si existe billing;
- documentación de problemas frecuentes.

Las herramientas internas deben ser seguras y auditables.

---

## 31. Checklist Antes de Producción

### Producto

- Problema y usuario objetivo claros.
- Flujo principal completo.
- Onboarding funcional.
- Estados vacíos, loading y error implementados.
- Copy principal revisado.
- Responsive validado.

### Seguridad

- Variables configuradas por ambiente.
- `.env.example` actualizado.
- Autenticación funcionando.
- Autorización verificada.
- Rate limiting en endpoints sensibles.
- Validación backend implementada.
- CORS y headers revisados.
- Secretos fuera del repositorio.

### Base de Datos

- Migraciones ejecutadas.
- Índices revisados.
- Backups configurados.
- Restauración documentada.
- Datos seed separados de producción.

### Billing, Si Aplica

- Planes definidos.
- Límites implementados en backend.
- Webhooks verificados con firma.
- Webhooks idempotentes.
- Estados de suscripción modelados.
- Flujos de cancelación y error contemplados.

### Operación

- Logs funcionando.
- Monitoreo básico activo.
- Alertas críticas configuradas.
- Deploy automático.
- Rollback documentado.
- Costos estimados.

### Calidad

- TypeScript strict.
- Lint sin errores críticos.
- Build exitoso.
- Tests críticos pasando.
- Documentación mínima actualizada.
- Dependencias revisadas.

### Frontend

- Mobile first validado.
- Accesibilidad básica revisada.
- Formularios con errores claros.
- Performance razonable.
- SEO configurado si hay páginas públicas.

---

## 32. Checklist Para Cada Nueva Feature

Antes de implementar:

- ¿Qué problema resuelve?
- ¿Quién la usa?
- ¿Existe una forma más simple?
- ¿Qué datos necesita?
- ¿Qué permisos requiere?
- ¿Qué pasa si falla?
- ¿Impacta billing o límites?
- ¿Impacta performance?
- ¿Necesita logs?
- ¿Necesita tests?
- ¿Necesita documentación?

Después de implementar:

- Validación backend completa.
- Manejo de errores.
- Estados de UI.
- Tests según riesgo.
- Logs si corresponde.
- Documentación si corresponde.
- Revisión de seguridad.

---

## 33. Regla Final de Decisión

Si existen varias soluciones válidas, elegir la que sea:

1. más simple;
2. más segura;
3. más barata de operar;
4. más mantenible;
5. más fácil de entender;
6. más fácil de reemplazar;
7. más alineada con el producto real.

La complejidad siempre debe justificarse.  
El costo siempre debe considerarse.  
La seguridad nunca debe quedar para después.
