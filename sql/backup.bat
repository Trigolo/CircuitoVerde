@echo off
REM =====================================================================
REM CircuitoVerde - BACKUP do banco (Checkpoint 3)
REM Gera um arquivo .sql com tabelas, dados, views, triggers e procedures.
REM Uso: clique duas vezes ou rode "backup.bat" no terminal desta pasta.
REM Usa o usuario cv_backup (criado no 09_seguranca.sql): so tem permissao de leitura.
REM =====================================================================
setlocal
REM Ajuste se o seu MySQL estiver em outra pasta
set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin
if not exist "%MYSQL_BIN%\mysqldump.exe" set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set DATA=%%i
if not exist backups mkdir backups
set ARQUIVO=backups\circuitoverde_%DATA%.sql

echo Fazendo backup em %ARQUIVO% (digite a senha do usuario cv_backup)...
"%MYSQL_BIN%\mysqldump.exe" -u cv_backup -p --single-transaction --routines --triggers --events --set-gtid-purged=OFF --no-tablespaces --databases circuitoverde --result-file="%ARQUIVO%"
if errorlevel 1 (
  echo ERRO: o backup falhou. Confira a senha e se o MySQL esta rodando.
) else (
  echo Backup concluido: %ARQUIVO%
)
pause
