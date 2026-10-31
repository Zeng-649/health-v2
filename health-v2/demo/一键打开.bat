@echo off
chcp 65001 >nul
cd /d %~dp0
rem 备用入口：与双击 一键打开.vbs 效果一致（无黑窗口驻留）
wscript.exe "%~dp0一键打开.vbs"
exit /b %errorlevel%