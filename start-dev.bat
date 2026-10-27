@echo off
set ROOT=D:\code\NewBodor\NewBodor-runtime
set APP=%ROOT%\resources\app

if not exist "%APP%" (
    echo 正在解压 app.asar...
    "D:\code\rea-main\rea-main\node_modules\.bin\asar.cmd" extract "%ROOT%\resources\app.asar" "%APP%"
    if errorlevel 1 (
        echo 解压失败，请检查 asar 工具
        pause
        exit /b 1
    )
)

echo 启动 NewBodor 开发模式...
echo.
echo 修改 %APP% 下的代码，保存后重启即可生效
echo 按 Ctrl+C 关闭

cd /d "%ROOT%"
"%ROOT%\NewBodor.exe" --app-path="%APP%" --remote-debugging-port=9222
pause