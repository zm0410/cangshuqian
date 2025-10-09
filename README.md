打包成 EXE（Windows）

概述

本项目使用 Python + Tkinter，推荐使用 PyInstaller 打包为单文件 EXE。下面给出两种常用方式：

- 将 CSV 作为可编辑的外部文件（推荐）：exe 放在 dist\ 下，CSV 同目录，方便运行时编辑和更新。
- 把 CSV 打包进 exe（不推荐）：会把 CSV 嵌入 exe 内，不便于后续修改。

先决条件

- Windows 系统（你当前是 Windows）
- Python 3.8+ 已安装并可在 PATH 中通过 python 调用

步骤（推荐，CSV 外部）

1. 在项目根目录打开 PowerShell 或 CMD。
2. 安装依赖并打包（脚本会自动安装依赖）：

```powershell
build_exe.bat
```

3. 打包完成后，查看 dist\ 目录：
   - dist\data_manager_gui.exe — 可执行文件
   - dist\categories.csv 和 dist\sites.csv — 已复制到 dist（可编辑）

手动 PyInstaller 命令说明（可定制）

- 基本打包（不包含 CSV）：

```powershell
pyinstaller --noconfirm --onefile --windowed data_manager_gui.py
```

- 如果你希望将 CSV 打包进 exe（不推荐），使用：

```powershell
pyinstaller --noconfirm --onefile --windowed --add-data "categories.csv;." --add-data "sites.csv;." data_manager_gui.py
```

注意：PyInstaller 的 --add-data 在 Windows 平台使用分号分隔 source 和 dest（如上例）。

常见问题

- EXE 启动后找不到 CSV：如果你没有把 CSV 拷入 dist，程序默认会在运行目录查找 `categories.csv` 和 `sites.csv`。建议把 CSV 放在 exe 同目录或使用用户配置路径。
- 缺少依赖：如果在打包或运行 exe 时碰到缺少模块，先检查 `requirements.txt`，手动安装相关包然后重试。

进阶

- 添加程序图标：在 pyinstaller 参数中加上 `--icon=your_icon.ico`。
- 如果出现隐藏导入问题（hidden-import），可以在 PyInstaller 命令中添加 `--hidden-import modulename`。

若需要，我可以：
- 直接为你运行打包脚本（如果你允许我在工作区执行命令）。
- 或根据你偏好修改 build_exe.bat（例如改为在完成后自动打开 dist 文件夹，或使用不同的 PyInstaller 参数）。
