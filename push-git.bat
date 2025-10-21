@echo off
setlocal ENABLEEXTENSIONS
cd /d G:\portais\portal-gcs || (echo Pasta nao encontrada.& pause & exit /b)

if exist "%ProgramFiles%\Git\bin\git.exe" set "PATH=%ProgramFiles%\Git\bin;%PATH%"

git add -A
set CH=
for /f "usebackq delims=" %%s in (`git status --porcelain`) do set CH=1
if defined CH git commit -m "auto: sync"

REM cria upstream se ainda nao existir
for /f "delims=" %%h in ('git rev-parse --abbrev-ref --symbolic-full-name @{u} 2^>nul') do set HASUP=1
if not defined HASUP (
  git push -u origin main & goto :done
)

git pull --rebase origin main
git push
:done
echo [OK] portal-gcs sincronizado.
pause
