@echo off
REM Build standalone exe for data_manager_gui.py using PyInstaller
REM Run this script from the project root (where data_manager_gui.py and CSV files live)

echo ===== Installing requirements =====
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo ===== Building executable with PyInstaller =====
REM Use --windowed to suppress console (since this is a Tkinter GUI). Remove --windowed if you want the console.
pyinstaller --noconfirm --onefile --windowed --add-data "categories.csv;." --add-data "sites.csv;." data_manager_gui.py

echo ===== Copy CSV files to dist (external editable copies) =====
if exist dist\data_manager_gui.exe (
  copy /Y categories.csv dist\ >nul
  copy /Y sites.csv dist\ >nul
  echo Build complete. Executable created at dist\\data_manager_gui.exe (CSV copied to dist\\)
) else (
  echo Build completed but dist\\data_manager_gui.exe not found. Check PyInstaller output above.
)

pause
