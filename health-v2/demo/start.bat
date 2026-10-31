@echo off
chcp 65001 >nul
title 智骨科技演示服务（排错入口）
cd /d %~dp0
echo ==============================================
echo   智骨科技 · 骨科智慧医疗 演示服务
echo ==============================================
echo.
echo   提示：日常使用推荐双击「一键打开.vbs」（无黑窗口）
echo         本窗口用于查看服务日志与排错，关闭本窗口即停止服务
echo.
where java >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 java，请先安装 JDK 17 及以上版本。
  echo        也可直接双击 index.html 使用内置知识库离线演示。
  pause
  exit /b 1
)
echo   正在启动本地服务，浏览器将自动打开 http://localhost:5500 ...
echo   停止服务：直接关闭本窗口，或双击「停止服务.vbs」
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5500"
java server.java
echo.
echo   服务已停止。如窗口未自动关闭，请按任意键退出。
pause >nul