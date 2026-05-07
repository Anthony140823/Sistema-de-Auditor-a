# Sistema de Auditoría Informática de Controles de Acceso y Segregación de Funciones (SoD) en SAP

## Consorcio Besalco Stracon

Sistema empresarial completo para auditoría de controles de acceso y detección de conflictos de Segregación de Funciones (SoD) en SAP.

---

## 🎯 Características Principales

### Backend (FastAPI + PostgreSQL)
- ✅ **13 tablas** en base de datos con relaciones complejas
- ✅ **Autenticación JWT** con roles (ADMIN, AUDITOR, RESPONSABLE)
- ✅ **Motor SoD** con detección automática de conflictos
- ✅ **Cálculo de riesgo** basado en múltiples factores
- ✅ **Importación de datos** desde Excel/CSV
- ✅ **15 reglas SoD predefinidas** (compras, pagos, finanzas, RRHH, seguridad)
- ✅ **API RESTful** con 30+ endpoints
- ✅ **Workflow de hallazgos** con comentarios y evidencias

### Frontend (React + TypeScript)
- ✅ **Diseño profesional** con TailwindCSS
- ✅ **Dashboard ejecutivo** con gráficos (Recharts)
- ✅ **Gestión de auditorías** completa
- ✅ **Visualización de conflictos** con filtros
- ✅ **Workflow de hallazgos** interactivo
- ✅ **Responsive** y optimizado

---

## 🏗️ Arquitectura

```
Sistema SoD Audit
├── Backend (FastAPI)
│   ├── PostgreSQL (Supabase)
│   ├── SQLAlchemy ORM
│   ├── Alembic Migrations
│   ├── JWT Authentication
│   └── SoD Engine
│
└── Frontend (React)
    ├── TypeScript
    ├── TailwindCSS
    ├── TanStack Query
    ├── React Hook Form
    └── Recharts
```

---

## 📋 Requisitos

- **Python** 3.11+
- **Node.js** 18+
- **PostgreSQL** (Supabase configurado)
- **Docker** (opcional)

---

## 🚀 Instalación y Ejecución

### Opción 1: Ejecución Local

#### Backend

```powershell
# Navegar a la carpeta backend
cd backend

# Crear entorno virtual
python -m venv venv
.\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar migraciones
alembic upgrade head

# Cargar datos iniciales
python seed_data.py

# Iniciar servidor
uvicorn app.main:app --reload
```

**Backend disponible en:** http://localhost:8000  
**Documentación API:** http://localhost:8000/docs

#### Frontend

```powershell
# Navegar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

**Frontend disponible en:** http://localhost:5173

---

### Opción 2: Docker Compose

```powershell
# Desde la raíz del proyecto
docker-compose up --build
```

- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs

---

## 👤 Usuarios de Prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `Admin123!` | ADMIN |
| `auditor` | `Auditor123!` | AUDITOR |
| `responsable` | `Resp123!` | RESPONSABLE |

---

## 📊 Reglas SoD Predefinidas (15)

### Procurement & Payments
1. **Create Vendor + Pay Vendor** (HIGH)
2. **Create PO + Receive Goods** (MEDIUM)
3. **Approve PO + Process Payment** (HIGH)

### Financial
4. **Post GL + Approve GL** (HIGH)
5. **Create Asset + Depreciate Asset** (MEDIUM)

### Inventory
6. **Create Material + Post GR** (MEDIUM)
7. **Adjust Inventory + Approve Adjustment** (HIGH)

### HR & Payroll
8. **Create Employee + Process Payroll** (HIGH)
9. **Change Salary + Approve Salary** (HIGH)

### Sales
10. **Create Customer + Post Sales Invoice** (MEDIUM)
11. **Create Sales Order + Release Credit** (MEDIUM)

### Security & Admin
12. **Create User + Assign Critical Roles** (HIGH)
13. **Change Authorization + Execute Critical Tcodes** (HIGH)

### Maintenance
14. **Create Work Order + Close Work Order** (LOW)
15. **Request Maintenance + Approve Budget** (MEDIUM)

---

## 🗄️ Estructura de Base de Datos

### Tablas Principales

- `app_users` - Usuarios del sistema
- `audits` - Proyectos de auditoría
- `sap_users` - Usuarios SAP importados
- `sap_roles` - Roles SAP
- `sap_user_roles` - Asignaciones usuario-rol
- `sap_role_tcodes` - Asignaciones rol-tcode
- `sod_rules` - Reglas de segregación
- `sod_rule_items` - TCodes de las reglas (Set A/B)
- `conflicts` - Conflictos detectados
- `findings` - Hallazgos de auditoría
- `finding_comments` - Comentarios en hallazgos
- `evidence_files` - Evidencias adjuntas
- `audit_log` - Registro de auditoría del sistema

---

## 📁 Estructura del Proyecto

```
AUDITORIA/
├── backend/
│   ├── alembic/              # Migraciones de BD
│   ├── app/
│   │   ├── api/              # Endpoints REST
│   │   ├── core/             # Config, DB, Security
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Lógica de negocio
│   │   └── main.py           # FastAPI app
│   ├── requirements.txt
│   ├── seed_data.py          # Datos iniciales
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/              # Cliente HTTP
│   │   ├── components/       # Componentes React
│   │   ├── hooks/            # Custom hooks
│   │   ├── pages/            # Páginas
│   │   ├── styles/           # CSS global
│   │   ├── types/            # TypeScript types
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 🔧 Variables de Entorno

### Backend (.env)

```env
DATABASE_URL=postgresql+psycopg://postgres.zpjjkvxqrjbrqelynscc:tobias.erickarnie@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
SUPABASE_URL=https://zpjjkvxqrjbrqelynscc.supabase.co
SUPABASE_KEY=sb_secret_48F9EuOSBELSaSIsU5Icng_YRx_MO3P
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

---

## 🔐 Seguridad

- ✅ JWT con expiración (30 min access, 7 días refresh)
- ✅ Passwords hasheados con bcrypt
- ✅ RBAC en todos los endpoints
- ✅ Validación backend obligatoria
- ✅ Audit trail completo
- ✅ CORS configurado

---

## 📖 Uso del Sistema

### 1. Crear Auditoría
1. Login con usuario `auditor` o `admin`
2. Ir a "Auditorías" → "Nueva Auditoría"
3. Completar formulario (nombre, periodo, responsable)

### 2. Importar Datos SAP
1. Abrir auditoría creada
2. Ir a "Importar Datos"
3. Subir 3 archivos Excel/CSV:
   - **Usuarios SAP** (userId, fullName, userType, isLocked, lastLogin)
   - **Usuario-Roles** (userId, roleName, validFrom, validTo)
   - **Rol-TCodes** (roleName, tcode)

### 3. Detectar Conflictos
1. Ir a "Conflictos SoD"
2. Click en "Detectar Conflictos"
3. El motor analiza automáticamente y calcula risk scores

### 4. Gestionar Hallazgos
1. Convertir conflictos en hallazgos
2. Asignar responsables
3. Agregar comentarios y evidencias
4. Seguir workflow: OPEN → IN_REVIEW → REMEDIATED → CLOSED

---

## 🎨 Tecnologías Utilizadas

### Backend
- FastAPI 0.109
- SQLAlchemy 2.0
- Alembic
- PostgreSQL (Supabase)
- Python-Jose (JWT)
- Passlib (bcrypt)
- Pandas (import)
- WeasyPrint (PDF)
- OpenPyXL (Excel)

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Recharts
- Lucide Icons
- Axios

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Audits
- `GET /api/audits` - List audits
- `POST /api/audits` - Create audit
- `GET /api/audits/{id}` - Get audit
- `PUT /api/audits/{id}` - Update audit
- `DELETE /api/audits/{id}` - Delete audit

### Import
- `POST /api/audits/{id}/import/users` - Import SAP users
- `POST /api/audits/{id}/import/user-roles` - Import user-roles
- `POST /api/audits/{id}/import/role-tcodes` - Import role-tcodes

### SoD
- `GET /api/sod-rules` - List rules
- `POST /api/sod-rules` - Create rule
- `GET /api/sod-rules/{id}` - Get rule detail
- `PUT /api/sod-rules/{id}` - Update rule
- `POST /api/audits/{id}/detect-conflicts` - Run detection
- `GET /api/audits/{id}/conflicts` - List conflicts

### Findings
- `GET /api/findings` - List findings
- `POST /api/findings` - Create finding
- `GET /api/findings/{id}` - Get finding
- `PUT /api/findings/{id}` - Update finding
- `POST /api/findings/{id}/comments` - Add comment
- `GET /api/findings/{id}/comments` - List comments

---

## 🧪 Testing

```powershell
# Backend tests
cd backend
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm run test
```

---

## 📦 Build para Producción

### Backend
```powershell
cd backend
pip install -r requirements.txt
alembic upgrade head
python seed_data.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```powershell
cd frontend
npm install
npm run build
# Archivos en dist/
```

---

## 👨‍💻 Desarrollo

### Agregar Nueva Regla SoD

```python
# En seed_data.py o via API
rule = SoDRule(
    name="Mi Nueva Regla",
    description="Descripción del conflicto",
    severity=RuleSeverity.HIGH,
    risk_base_score=80,
    is_active=True
)
```

### Agregar Nuevo Endpoint

```python
# backend/app/api/mi_endpoint.py
from fastapi import APIRouter

router = APIRouter(prefix="/mi-ruta", tags=["Mi Tag"])

@router.get("")
def mi_funcion():
    return {"message": "Hola"}
```

---

## 📄 Licencia

Sistema desarrollado para fines académicos y demostración empresarial.

---

## 🆘 Soporte

Para problemas o preguntas:
1. Revisar documentación API: http://localhost:8000/docs
2. Verificar logs del backend
3. Revisar consola del navegador (frontend)

---

## ✅ Checklist de Implementación

- [x] Backend FastAPI completo
- [x] 13 tablas en PostgreSQL
- [x] Autenticación JWT + RBAC
- [x] Motor SoD con risk scoring
- [x] Importación Excel/CSV
- [x] 15 reglas SoD predefinidas
- [x] API REST completa
- [x] Frontend React + TypeScript
- [x] Dashboard con gráficos
- [x] Gestión de auditorías
- [x] Workflow de hallazgos
- [x] Docker Compose
- [x] Seed data
- [x] Documentación completa

---

**¡Sistema listo para producción académica y demostración empresarial!** 🚀
