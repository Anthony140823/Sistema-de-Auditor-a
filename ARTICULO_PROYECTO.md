# Sistema de Auditoria Informatica para Controles de Acceso y Segregacion de Funciones en SAP

## Resumen

Este proyecto implementa una plataforma web para auditoria de controles de acceso y deteccion de conflictos de Segregacion de Funciones, tambien conocida como SoD, en entornos SAP. El sistema permite crear auditorias, importar informacion de usuarios y roles SAP, ejecutar un motor de deteccion de conflictos, gestionar hallazgos, adjuntar evidencias, generar reportes ejecutivos y apoyar al usuario mediante un asistente flotante llamado Gomezito.

La solucion esta orientada a procesos de auditoria TI, control interno, gestion de riesgos y seguridad de accesos. Su objetivo principal es facilitar la identificacion de usuarios con combinaciones incompatibles de permisos, priorizar riesgos y documentar acciones de remediacion.

## Contexto del Problema

En sistemas empresariales como SAP, los usuarios pueden acumular permisos a traves de multiples roles. Esto puede generar riesgos cuando una misma persona tiene acceso a funciones que deberian estar separadas. Por ejemplo, crear proveedores y ejecutar pagos, modificar datos maestros y aprobar operaciones, o administrar usuarios y realizar procesos financieros.

Estos escenarios representan conflictos SoD, porque concentran funciones incompatibles en un solo usuario. Una revision manual de estos accesos puede ser lenta, propensa a errores y dificil de documentar. Por ello, el proyecto automatiza la deteccion y seguimiento de estos conflictos.

## Objetivos del Proyecto

- Centralizar auditorias de accesos SAP.
- Importar datos de usuarios, roles y transacciones SAP desde archivos Excel o CSV.
- Definir y administrar reglas SoD.
- Detectar conflictos automaticamente.
- Calcular puntajes de riesgo.
- Convertir conflictos relevantes en hallazgos de auditoria.
- Gestionar comentarios, responsables, estados y evidencias.
- Generar reportes ejecutivos en PDF y reportes de conflictos en Excel.
- Guiar al usuario dentro del sistema mediante un asistente conversacional.

## Arquitectura General

El sistema esta construido como una aplicacion full stack.

### Backend

El backend utiliza FastAPI como framework principal. Expone una API REST para autenticacion, auditorias, importacion de datos SAP, reglas SoD, conflictos, hallazgos, dashboard, reportes, usuarios internos e inteligencia artificial.

Tecnologias principales:

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL / Supabase
- Pydantic
- JWT
- Argon2 para hashing de contrasenas
- Pandas para importacion de datos
- OpenPyXL para Excel
- ReportLab para PDF
- Google Gemini para funciones de IA

### Frontend

El frontend esta construido con React y TypeScript mediante Vite. Ofrece una interfaz administrativa para ejecutar el flujo de auditoria completo.

Tecnologias principales:

- React
- TypeScript
- Vite
- TailwindCSS
- TanStack Query
- Axios
- Recharts
- Lucide Icons
- React Hook Form
- Zod

### Base de Datos

La base de datos utiliza PostgreSQL. El modelo contempla usuarios internos, auditorias, usuarios SAP, roles SAP, transacciones, reglas SoD, conflictos, hallazgos, comentarios, evidencias y registro de auditoria.

## Estructura del Proyecto

```text
AUDITORIA/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── seed_data.py
│   ├── quick_seed.py
│   ├── create_tables.sql
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── README.md
└── ARTICULO_PROYECTO.md
```

## Modulos del Backend

### Autenticacion

El sistema maneja autenticacion por JWT. Los usuarios internos pueden iniciar sesion con nombre de usuario y contrasena. Las contrasenas se almacenan usando hashes Argon2.

Roles disponibles:

- ADMIN
- AUDITOR
- RESPONSABLE

Usuarios de prueba:

| Usuario | Contrasena | Rol |
|---------|------------|-----|
| admin | Admin123! | ADMIN |
| auditor | Auditor123! | AUDITOR |
| responsable | Resp123! | RESPONSABLE |

### Auditorias

Permite crear, listar, consultar, actualizar y eliminar auditorias. Cada auditoria contiene:

- Nombre
- Empresa
- Periodo de inicio
- Periodo de fin
- Estado
- Usuario responsable

Los estados principales son:

- DRAFT
- IN_PROGRESS
- CLOSED

### Importacion SAP

El sistema permite importar tres tipos de archivos:

- Usuarios SAP
- Asignaciones usuario-rol
- Asignaciones rol-transaccion

Los formatos esperados son Excel o CSV. La importacion valida columnas requeridas y registra errores por fila cuando existen problemas.

### Reglas SoD

Las reglas SoD definen combinaciones incompatibles de transacciones SAP. Cada regla contiene:

- Nombre
- Descripcion
- Severidad
- Puntaje base de riesgo
- Estado activo/inactivo
- Set A de transacciones
- Set B de transacciones

Un conflicto ocurre cuando un usuario tiene al menos una transaccion del Set A y una transaccion del Set B de una misma regla.

### Motor de Deteccion SoD

El motor SoD analiza los roles y transacciones efectivas de cada usuario SAP dentro de una auditoria. Su flujo general es:

1. Obtener usuarios SAP de la auditoria.
2. Obtener roles asignados a cada usuario.
3. Obtener transacciones asociadas a esos roles.
4. Comparar transacciones efectivas contra reglas SoD activas.
5. Crear registros de conflicto cuando exista coincidencia entre Set A y Set B.
6. Calcular puntaje de riesgo.

El puntaje de riesgo considera:

- Puntaje base de la regla.
- Si el usuario esta activo.
- Si tuvo login reciente.
- Si es usuario critico.
- Cantidad de transacciones en conflicto.

### Hallazgos

Los conflictos pueden convertirse en hallazgos formales de auditoria. Cada hallazgo permite:

- Titulo
- Descripcion
- Estado
- Responsable asignado
- Fecha compromiso
- Comentarios
- Evidencias adjuntas

Estados de hallazgo:

- OPEN
- IN_REVIEW
- ACCEPTED
- REMEDIATED
- EXCEPTION_APPROVED
- CLOSED

### Evidencias

Los usuarios pueden adjuntar archivos a los hallazgos. Estos archivos se almacenan localmente en el backend y se registran en la tabla de evidencias.

### Dashboard

El dashboard presenta indicadores clave:

- Total de usuarios SAP.
- Usuarios activos.
- Total de conflictos.
- Conflictos por severidad.
- Usuarios con mayor riesgo.
- Reglas mas vulneradas.
- Hallazgos por estado.

### Reportes

El sistema genera:

- Reporte ejecutivo en PDF.
- Reporte de conflictos en Excel.

El PDF ejecutivo resume el estado de la auditoria, conflictos detectados, usuarios afectados, reglas mas vulneradas, hallazgos y recomendaciones.

### Inteligencia Artificial

El backend integra Google Gemini para:

- Sugerir planes de mitigacion para conflictos.
- Generar resumen ejecutivo de auditorias.
- Dar inteligencia conversacional al asistente Gomezito.

El endpoint de Gomezito devuelve respuestas estructuradas y acciones sugeridas. El frontend solo ejecuta acciones permitidas y controladas.

## Modulos del Frontend

### Login

Pantalla de autenticacion para usuarios internos. Al iniciar sesion, se almacenan tokens y se consulta la informacion del usuario actual.

### Layout Principal

Incluye navegacion lateral con accesos a:

- Dashboard
- Auditorias
- Reglas SoD
- Hallazgos
- Reportes

Tambien muestra informacion del usuario autenticado y boton de cierre de sesion.

### Dashboard Ejecutivo

Presenta graficos y tarjetas de resumen. Permite seleccionar auditorias y visualizar sus indicadores principales.

### Auditorias

Incluye listado de auditorias, creacion de nuevas auditorias y detalle de cada auditoria. En el detalle se gestiona:

- Importacion de usuarios SAP.
- Importacion de usuario-roles.
- Importacion de rol-transacciones.
- Ejecucion de deteccion de conflictos.
- Filtros de conflictos.
- Creacion masiva de hallazgos.
- Acciones con IA.

### Reglas SoD

Permite visualizar y crear reglas SoD. Una regla se compone de Set A, Set B, severidad y riesgo base.

### Hallazgos

Permite revisar hallazgos, cambiar estados, agregar comentarios, adjuntar evidencias y visualizar narrativas automaticas.

### Reportes

Permite seleccionar una auditoria y descargar:

- PDF ejecutivo.
- Excel de conflictos.

## Gomezito: Asistente Flotante

Gomezito es un agente flotante integrado en la interfaz. Su objetivo es guiar al usuario dentro del sistema y ejecutar acciones operativas.

### Funciones Principales

- Explicar la pantalla actual.
- Navegar a secciones del sistema.
- Crear auditorias por conversacion.
- Pedir datos faltantes.
- Listar auditorias.
- Descargar reportes PDF.
- Descargar reportes Excel.
- Explicar conceptos de SoD.
- Usar voz y texto.
- Responder mediante sintesis de voz del navegador.
- Usar inteligencia artificial cuando esta disponible.
- Mantener fallback por comandos si falla la IA.

### Interaccion por Voz

Gomezito usa APIs del navegador:

- Speech Synthesis para hablar.
- Speech Recognition cuando el navegador lo soporta.

Si el navegador no soporta reconocimiento de voz, el asistente sigue funcionando por escritura.

### Diseno Visual

El asistente se presenta como un robot flotante con una interfaz tecnologica. El panel muestra:

- Estado operativo.
- Canal de comunicacion.
- Capacidades activas.
- Conversacion.
- Acciones rapidas.
- Entrada por voz o texto.

## Flujo Funcional Principal

1. El usuario inicia sesion.
2. Crea una auditoria.
3. Importa usuarios SAP.
4. Importa asignaciones usuario-rol.
5. Importa asignaciones rol-transaccion.
6. Ejecuta la deteccion de conflictos SoD.
7. Revisa los conflictos detectados.
8. Convierte conflictos relevantes en hallazgos.
9. Agrega responsables, comentarios y evidencias.
10. Genera reportes PDF y Excel.

## Modelo de Datos Principal

Tablas principales:

- app_users
- app_roles
- audits
- sap_users
- sap_roles
- sap_user_roles
- sap_role_tcodes
- sod_rules
- sod_rule_items
- conflicts
- findings
- finding_comments
- evidence_files
- audit_log

## Seguridad

El sistema implementa:

- Autenticacion JWT.
- Hashing Argon2 para contrasenas.
- Roles internos.
- Dependencias de autorizacion por endpoint.
- Registro de acciones criticas en audit_log.
- CORS configurado.

Para un despliegue productivo se recomienda:

- Rotar credenciales expuestas.
- Usar variables de entorno seguras.
- No versionar claves ni archivos `.env`.
- Activar expiracion real de tokens.
- Fortalecer autorizacion por auditoria.
- Validar estrictamente archivos de evidencia.
- Agregar limites de tamano de carga.

## Pruebas y Validacion

El backend cuenta con pruebas automatizadas. La ejecucion local verificada fue:

```text
pytest tests -q
```

Resultado:

```text
9 passed
```

El frontend fue validado con:

```text
npm run build
```

Resultado:

```text
Build exitoso
```

Existe una advertencia de bundle grande en Vite, por lo que se recomienda aplicar lazy loading y division de chunks en futuras mejoras.

## Despliegue

El proyecto incluye Dockerfiles para backend y frontend, ademas de un archivo `docker-compose.yml`.

Servicios:

- Backend en puerto 8000.
- Frontend en puerto 5173.

Tambien puede ejecutarse localmente con:

Backend:

```powershell
cd backend
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm run dev
```

## Aportes del Proyecto

El proyecto aporta una herramienta practica para auditoria de accesos SAP. Combina importacion de datos, motor de deteccion, scoring de riesgo, gestion de hallazgos, evidencias, reportes y asistencia conversacional.

Su valor esta en integrar el ciclo completo de auditoria:

- Deteccion.
- Analisis.
- Priorizacion.
- Documentacion.
- Seguimiento.
- Reporteria.

## Limitaciones

Algunas limitaciones identificadas:

- Las migraciones Alembic no estan completas.
- El repositorio contiene entornos virtuales, dependencias instaladas y archivos generados que deberian excluirse.
- Algunas credenciales aparecen en archivos de configuracion y documentacion.
- La autorizacion por auditoria puede fortalecerse.
- La validacion de evidencias puede mejorar.
- El asistente depende de disponibilidad de API de IA para respuestas avanzadas.

## Mejoras Futuras

- Implementar migraciones Alembic completas.
- Aplicar control de acceso por auditoria.
- Crear un modulo de administracion de usuarios en frontend.
- Mejorar validacion y seguridad de archivos.
- Implementar refresh token real.
- Agregar tests end-to-end.
- Optimizar bundle frontend.
- Permitir carga asistida de archivos mediante Gomezito.
- Agregar analitica historica de auditorias.
- Integrar matriz SoD configurable por industria.

## Conclusion

El sistema desarrollado constituye una plataforma integral para auditoria de accesos y segregacion de funciones en SAP. Automatiza tareas que normalmente requieren alto esfuerzo manual y ofrece trazabilidad sobre conflictos, hallazgos y reportes.

La incorporacion de Gomezito transforma la experiencia de usuario, ya que permite interactuar con el sistema mediante lenguaje natural, voz y acciones guiadas. Esto reduce la curva de aprendizaje y convierte la plataforma en una herramienta mas accesible para auditores, administradores y responsables de remediacion.

En conjunto, el proyecto demuestra como una arquitectura web moderna, combinada con reglas de control interno e inteligencia artificial, puede apoyar procesos de auditoria TI de manera eficiente, documentada y escalable.
