@echo off
echo ==========================================
echo      FADSS UNIFIED PROJECT SETUP
echo ==========================================

echo [1/4] Setting up Portal Frontend (Node)...
pushd apps\portal
call npm install
popd

echo [2/4] Setting up Portal Backend (Python)...
pushd apps\portal\backend
if not exist venv (
    echo Creating virtual environment for Portal...
    python -m venv venv
)
echo Activating Portal venv and installing requirements...
call venv\Scripts\activate
pip install -r requirements.txt
echo Training Recommendation Model...
python train_model.py
deactivate
popd

echo [3/4] Setting up Market Backend (Python)...
pushd apps\market\backend
if not exist venv (
    echo Creating virtual environment for Market...
    python -m venv venv
)
echo Activating Market venv and installing requirements...
call venv\Scripts\activate
pip install -r requirements.txt
echo Populating Database with CSV data...
python populate_db.py
deactivate
popd

echo [4/4] Setting up Market Frontend (React)...
pushd apps\market\frontend
call npm install
popd

echo ==========================================
echo      SETUP COMPLETE!
echo      You can now run 'start_project.bat'
echo ==========================================
pause
