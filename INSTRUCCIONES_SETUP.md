# INSTRUCCIONES DE SETUP - Sistema SAP SoD Audit

## Opcion 1: Con Docker (RECOMENDADO)

> **Requisitos:** Solo necesitas tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.

### Pasos:

```powershell
# 1. Abre una terminal en la carpeta del proyecto
cd "C:\Users\ANTHONY\Documents\CLASES UNT\AUDITORIA"

# 2. Construye y ejecuta todo con un solo comando
docker-compose up --build
```

Espera a que veas estos mensajes:
- Backend: `[OK] Quick seed completed!` seguido de `Uvicorn running on http://0.0.0.0:8000`
- Frontend: `VITE ready in ... ms`

### Acceso:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/docs

### Para detener:
```powershell
docker-compose down
```

### Para reiniciar sin reconstruir:
```powershell
docker-compose up
```

---

## Opcion 2: Ejecucion Local (Sin Docker)

> **Requisitos:** Python 3.10-3.11, Node.js 18+

### Backend:

```powershell
# 1. Ir a la carpeta backend
cd backend

# 2. Crear entorno virtual
python -m venv venv

# 3. Activar entorno virtual
.\venv\Scripts\Activate.ps1

# 4. Instalar dependencias
pip install -r requirements.txt
pip install argon2-cffi

# 5. Crear usuarios en la base de datos
python quick_seed.py

# 6. Iniciar servidor
uvicorn app.main:app --reload
```

### Frontend (en otra terminal):

```powershell
# 1. Ir a la carpeta frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

---

## Credenciales de Prueba

| Rol | Usuario | Contrasena |
| :--- | :--- | :--- |
| Administrador | `admin` | `Admin123!` |
| Auditor | `auditor` | `Auditor123!` |
| Responsable | `responsable` | `Resp123!` |

---

## Solucion de Problemas Comunes

### Error CORS (bloqueado por politica de origen)
Si el frontend corre en un puerto distinto a 5173 (por ejemplo 5174):
1. Edita `backend/.env`
2. Agrega el nuevo puerto a `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5174
   ```
3. Reinicia el backend

### Error "usuario y contrasena incorrecta"
Ejecuta el script de seed para crear/actualizar los usuarios:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python quick_seed.py
```

### Error al instalar dependencias de Python
Usa Python 3.10 o 3.11 (NO 3.13). Python 3.13 tiene incompatibilidades con SQLAlchemy.
Si necesitas usar Python 3.13, usa la **Opcion 1 (Docker)** que ya tiene la version correcta.
