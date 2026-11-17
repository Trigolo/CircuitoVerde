@echo off
REM =====================================================================
REM CircuitoVerde - Backup do banco no Aiven (nuvem)
REM Gera backups\aiven_circuitoverde_AAAA-MM-DD_HHMM.sql com dados, views,
REM triggers, procedures e funções. A senha é pedida na hora (não fica salva).
REM Para restaurar no seu PC: restaurar.bat backups\aiven_circuitoverde_....sql
REM =====================================================================
setlocal
set HOST=circuitoverde-db-gustavotrigolo8-f034.g.aivencloud.com
set PORTA=18843
set USUARIO=avnadmin

set MYSQLDUMP=mysqldump
if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe" set MYSQLDUMP="C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" set MYSQLDUMP="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set DATA=%%i
if not exist "%~dp0backups" mkdir "%~dp0backups"
set ARQUIVO=%~dp0backups\aiven_circuitoverde_%DATA%.sql

echo Fazendo backup do Aiven em:
echo   %ARQUIVO%
echo Digite a senha do avnadmin (a mesma do console do Aiven):
%MYSQLDUMP% -h %HOST% -P %PORTA% -u %USUARIO% -p --ssl-mode=REQUIRED ^
  --single-transaction --routines --triggers --events --set-gtid-purged=OFF --no-tablespaces ^
  --default-character-set=utf8mb4 --databases circuitoverde > "%ARQUIVO%"

if errorlevel 1 (
  echo.
  echo ERRO no backup. Confira a senha e se o servico esta Running no Aiven.
  del "%ARQUIVO%" 2>nul
) else (
  echo.
  echo Backup concluido.
)
pause
