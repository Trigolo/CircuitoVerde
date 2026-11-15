@echo off
REM =====================================================================
REM CircuitoVerde - RESTAURAR um backup (Checkpoint 3)
REM Uso: restaurar.bat backups\circuitoverde_2026-10-28_1930.sql
REM ATENCAO: recria o banco circuitoverde com o conteudo do arquivo.
REM Precisa de um usuario com permissao total (root).
REM =====================================================================
setlocal
set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin
if not exist "%MYSQL_BIN%\mysql.exe" set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin

if "%~1"=="" (
  echo Informe o arquivo. Exemplo: restaurar.bat backups\circuitoverde_2026-10-28_1930.sql
  echo Backups disponiveis:
  dir /b backups\*.sql 2>nul
  pause
  exit /b 1
)
if not exist "%~1" ( echo Arquivo nao encontrado: %~1 & pause & exit /b 1 )

echo Isto vai SUBSTITUIR o banco circuitoverde pelo backup %~1
set /p OK=Digite SIM para continuar: 
if /i not "%OK%"=="SIM" ( echo Cancelado. & pause & exit /b 0 )

"%MYSQL_BIN%\mysql.exe" -u root -p -e "DROP DATABASE IF EXISTS circuitoverde;"
"%MYSQL_BIN%\mysql.exe" -u root -p < "%~1"
if errorlevel 1 ( echo ERRO na restauracao. ) else ( echo Banco restaurado a partir de %~1 & echo Rode de novo o 09_seguranca.sql para reaplicar as permissoes. )
pause
