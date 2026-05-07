# Script de instalación completa del sistema
# Ejecutar desde la raíz del proyecto

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SAP SoD Audit System - Instalación" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "1. Instalando Backend..." -ForegroundColor Yellow
Set-Location backend

if (Test-Path "venv") {
    Write-Host "   - Eliminando venv antiguo..." -ForegroundColor Gray
    Remove-Item -Recurse -Force venv
}

Write-Host "   - Creando entorno virtual..." -ForegroundColor Gray
python -m venv venv

Write-Host "   - Activando venv..." -ForegroundColor Gray
.\venv\Scripts\Activate.ps1

Write-Host "   - Instalando dependencias..." -ForegroundColor Gray
pip install -r requirements.txt

Write-Host "   ✓ Backend instalado" -ForegroundColor Green
Write-Host ""

# Frontend
Write-Host "2. Instalando Frontend..." -ForegroundColor Yellow
Set-Location ../frontend

if (Test-Path "node_modules") {
    Write-Host "   - Eliminando node_modules antiguo..." -ForegroundColor Gray
    Remove-Item -Recurse -Force node_modules
}

if (Test-Path "package-lock.json") {
    Remove-Item package-lock.json
}

Write-Host "   - Instalando dependencias npm..." -ForegroundColor Gray
npm install

Write-Host "   ✓ Frontend instalado" -ForegroundColor Green
Write-Host ""

Set-Location ..

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Instalación completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecuta create_tables.sql en Supabase SQL Editor"
Write-Host "2. cd backend && python seed_data.py"
Write-Host "3. cd backend && uvicorn app.main:app --reload"
Write-Host "4. cd frontend && npm run dev (en otra terminal)"
Write-Host ""
