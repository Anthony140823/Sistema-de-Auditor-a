# 🚀 INICIO RÁPIDO - Sistema SAP SoD Audit

## ⚡ Instalación Automática (RECOMENDADO)

```powershell
# Desde la raíz del proyecto
.\install.ps1
```

Este script:
- ✅ Crea el entorno virtual de Python
- ✅ Instala todas las dependencias del backend
- ✅ Instala todas las dependencias del frontend
- ✅ Limpia instalaciones previas

---

## 📋 Configuración de Base de Datos

### 1. Ejecutar SQL en Supabase

1. Abre https://supabase.com/dashboard
2. Ve a tu proyecto
3. Click en "SQL Editor"
4. Abre el archivo `backend/create_tables.sql`
5. Copia TODO el contenido
6. Pégalo en el editor
7. Click "Run" o `Ctrl+Enter`

### 2. Cargar Datos Iniciales

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python seed_data.py
```

---

## 🎯 Iniciar el Sistema

### Opción 1: Script Automático (RECOMENDADO)

```powershell
# Desde la raíz del proyecto
.\start.ps1
```

Esto abrirá 2 ventanas:
- Backend en http://localhost:8000
- Frontend en http://localhost:5173

### Opción 2: Manual

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

---

## 👤 Login

Abre http://localhost:5173 y usa:

| Usuario | Contraseña |
|---------|-----------|
| admin | Admin123! |
| auditor | Auditor123! |
| responsable | Resp123! |

---

## ✅ Verificación

- [ ] Backend corriendo: http://localhost:8000/docs
- [ ] Frontend corriendo: http://localhost:5173
- [ ] Login funciona
- [ ] Dashboard muestra datos

---

## 🆘 Problemas?

Ver `ERRORES_COMUNES.md` para soluciones detalladas.

**Error más común:** No ejecutar `create_tables.sql` en Supabase.

---

## 📁 Archivos Importantes

- `create_tables.sql` - SQL para crear las 13 tablas
- `seed_data.py` - Datos iniciales (3 usuarios + 15 reglas)
- `install.ps1` - Instalación automática
- `start.ps1` - Inicio automático
- `ERRORES_COMUNES.md` - Troubleshooting
- `INSTRUCCIONES_SETUP.md` - Guía detallada paso a paso

---

## 🎉 ¡Listo!

Una vez completados estos pasos, el sistema estará 100% funcional.
