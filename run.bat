@echo off
REM SYNESIS eRTMAC-NWIS -- one-shot setup + run for Windows.
cd /d "%~dp0"

if not exist ".venv" (
  echo Creating Python virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat

echo Installing backend dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo Seeding demo data...
python scripts\seed_data.py

echo Training risk model...
python scripts\train_model.py

echo Generating demo PDF documents...
python scripts\generate_demo_documents.py

if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  pushd frontend
  call npm install
  popd
)

echo Starting backend on http://127.0.0.1:8000 ...
start "SYNESIS backend" cmd /k "cd backend && ..\.venv\Scripts\uvicorn.exe app.main:app --port 8000"

timeout /t 2 /nobreak >nul
echo Starting frontend on http://127.0.0.1:5173 ...
pushd frontend
call npm run dev
popd
