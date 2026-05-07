# 🔧 Errores Comunes y Soluciones

## Frontend

### ❌ Error: "Cannot find module '@/api/client'"

**Causa:** El alias `@` no está configurado correctamente.

**Solución:**
```powershell
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### ❌ Error: "Cannot find module 'path'"

**Causa:** Vite.config intentaba usar el módulo `path` de Node.js.

**Solución:** Ya está corregido en `vite.config.ts`. Si persiste:
```powershell
cd frontend
npm install
```

---

### ❌ Error: Pantalla en blanco al abrir http://localhost:5173

**Causa:** El backend no está corriendo o hay errores de CORS.

**Solución:**
1. Verifica que el backend esté corriendo en http://localhost:8000
2. Abre la consola del navegador (F12) y revisa errores
3. Verifica que `ALLOWED_ORIGINS` en backend/.env incluya `http://localhost:5173`

---

### ❌ Error: "401 Unauthorized" al hacer login

**Causa:** Las credenciales son incorrectas o los usuarios no existen en la BD.

**Solución:**
```powershell
cd backend
python seed_data.py
```

Luego usa:
- Usuario: `admin`
- Contraseña: `Admin123!`

---

## Backend

### ❌ Error: "relation 'app_users' does not exist"

**Causa:** Las tablas no están creadas en Supabase.

**Solución:**
1. Ve a Supabase SQL Editor
2. Ejecuta el archivo `backend/create_tables.sql` completo
3. O usa: `alembic upgrade head`

---

### ❌ Error: "could not connect to server"

**Causa:** Credenciales incorrectas de Supabase o conexión de red.

**Solución:**
1. Verifica `backend/.env`:
```env
DATABASE_URL=postgresql+psycopg://postgres.zpjjkvxqrjbrqelynscc:tobias.erickarnie@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require
```
2. Verifica que tu IP esté permitida en Supabase (Settings → Database → Connection Pooling)

---

### ❌ Error: "ModuleNotFoundError: No module named 'app'"

**Causa:** No estás en el directorio correcto o el venv no está activado.

**Solución:**
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

---

### ❌ Error: "alembic.util.exc.CommandError: Can't locate revision"

**Causa:** Alembic no está inicializado correctamente.

**Solución:**
Usa el SQL directo en lugar de Alembic:
1. Abre Supabase SQL Editor
2. Ejecuta `backend/create_tables.sql`

---

## Base de Datos

### ❌ Error: "duplicate key value violates unique constraint"

**Causa:** Intentas insertar datos que ya existen (ej: ejecutar seed_data.py dos veces).

**Solución:**
El script `seed_data.py` ya maneja duplicados. Si quieres empezar de cero:
```sql
-- En Supabase SQL Editor
TRUNCATE TABLE app_users, sod_rules, sod_rule_items CASCADE;
```
Luego ejecuta `python seed_data.py` de nuevo.

---

## Docker

### ❌ Error: "port is already allocated"

**Causa:** Los puertos 8000 o 5173 ya están en uso.

**Solución:**
```powershell
# Detener contenedores
docker-compose down

# O cambiar puertos en docker-compose.yml
```

---

### ❌ Error: "no configuration file provided"

**Causa:** No estás en el directorio raíz del proyecto.

**Solución:**
```powershell
cd "c:\Users\ANTHONY\Documents\CLASES UNT\AUDITORIA"
docker-compose up --build
```

---

## General

### ❌ Nada funciona

**Solución paso a paso:**

1. **Verifica Supabase:**
   - Abre Supabase → Table Editor
   - Deberías ver 13 tablas
   - Si no, ejecuta `create_tables.sql`

2. **Verifica Backend:**
   ```powershell
   cd backend
   .\venv\Scripts\activate
   python seed_data.py
   uvicorn app.main:app --reload
   ```
   - Abre http://localhost:8000/docs
   - Deberías ver la documentación de la API

3. **Verifica Frontend:**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
   - Abre http://localhost:5173
   - Deberías ver la página de login

4. **Prueba Login:**
   - Usuario: `admin`
   - Contraseña: `Admin123!`

---

## 📞 Última Opción

Si nada funciona, empieza desde cero:

```powershell
# 1. Limpiar todo
cd frontend
rm -rf node_modules package-lock.json
cd ../backend
rm -rf venv

# 2. Backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# 3. Supabase
# Ejecuta create_tables.sql en Supabase SQL Editor

# 4. Seed
python seed_data.py

# 5. Iniciar backend
uvicorn app.main:app --reload

# 6. Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

---

## ✅ Checklist de Verificación

- [ ] Supabase: 13 tablas creadas
- [ ] Backend: venv activado
- [ ] Backend: dependencias instaladas
- [ ] Backend: seed_data ejecutado
- [ ] Backend: servidor corriendo (puerto 8000)
- [ ] Frontend: node_modules instalado
- [ ] Frontend: servidor corriendo (puerto 5173)
- [ ] Login funciona con admin/Admin123!
