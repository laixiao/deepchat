@echo off
setlocal enabledelayedexpansion

REM DeepChat Docker一键部署脚本 (Windows版本)
REM 使用方法: deploy.bat [start|stop|restart|logs|status|nginx|help]

set "command=%~1"
if "%command%"=="" set "command=start"

REM 颜色定义（Windows CMD限制，使用echo代替）
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

goto main

:print_message
echo %~2%~1%NC%
goto :eof

:check_dependencies
call :print_message "检查依赖..." "%BLUE%"

where docker >nul 2>nul
if %errorlevel% neq 0 (
    call :print_message "错误: Docker未安装，请先安装Docker Desktop" "%RED%"
    exit /b 1
)

docker compose version >nul 2>nul
if %errorlevel% neq 0 (
    docker-compose --version >nul 2>nul
    if %errorlevel% neq 0 (
        call :print_message "错误: Docker Compose未安装，请先安装Docker Compose" "%RED%"
        exit /b 1
    )
)

call :print_message "依赖检查通过" "%GREEN%"
goto :eof

:check_env_file
if not exist ".env" (
    call :print_message "警告: .env文件不存在，正在从.env.example创建..." "%YELLOW%"
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        call :print_message "已创建.env文件，请编辑其中的配置后重新运行部署脚本" "%YELLOW%"
        call :print_message "重要: 请修改JWT_SECRET和数据库密码等敏感信息" "%RED%"
        pause
        exit /b 1
    ) else (
        call :print_message "错误: .env.example文件不存在" "%RED%"
        exit /b 1
    )
)
call :print_message ".env文件检查通过" "%GREEN%"
goto :eof

:create_directories
call :print_message "创建必要的目录..." "%BLUE%"
if not exist "server\uploads" mkdir "server\uploads"
if not exist "server\temp" mkdir "server\temp"
if not exist "nginx\ssl" mkdir "nginx\ssl"
call :print_message "目录创建完成" "%GREEN%"
goto :eof

:start_services
call :print_message "启动DeepChat服务..." "%BLUE%"

REM 构建并启动服务
docker-compose up -d --build
if %errorlevel% neq 0 (
    call :print_message "服务启动失败" "%RED%"
    exit /b 1
)

call :print_message "等待服务启动..." "%YELLOW%"
timeout /t 10 /nobreak >nul

REM 检查服务状态
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    call :print_message "服务启动成功!" "%GREEN%"
    call :print_message "访问地址:" "%BLUE%"
    
    REM 读取端口配置
    for /f "tokens=2 delims==" %%a in ('findstr "SERVER_PORT" .env 2^>nul') do set "port=%%a"
    if "!port!"=="" set "port=3000"
    
    echo   - API服务: http://localhost:!port!
    echo   - API文档: http://localhost:!port!/api-docs
    echo   - 管理后台: http://localhost:!port!/admin
    echo   - 健康检查: http://localhost:!port!/health
) else (
    call :print_message "服务启动失败，请检查日志" "%RED%"
    docker-compose logs
    exit /b 1
)
goto :eof

:stop_services
call :print_message "停止DeepChat服务..." "%BLUE%"
docker-compose down
call :print_message "服务已停止" "%GREEN%"
goto :eof

:restart_services
call :print_message "重启DeepChat服务..." "%BLUE%"
docker-compose restart
call :print_message "服务已重启" "%GREEN%"
goto :eof

:show_logs
call :print_message "显示服务日志..." "%BLUE%"
docker-compose logs -f
goto :eof

:show_status
call :print_message "服务状态:" "%BLUE%"
docker-compose ps
echo.
call :print_message "容器资源使用情况:" "%BLUE%"
for /f "tokens=*" %%i in ('docker-compose ps -q') do (
    docker stats --no-stream %%i
)
goto :eof



:show_help
echo DeepChat Docker部署脚本 (Windows版本)
echo.
echo 使用方法: %~nx0 [命令]
echo.
echo 命令:
echo   start    启动所有服务 (默认)
echo   stop     停止所有服务
echo   restart  重启所有服务
echo   logs     查看服务日志
echo   status   查看服务状态
echo   help     显示此帮助信息
goto :eof

:main
if "%command%"=="start" (
    call :check_dependencies
    if %errorlevel% neq 0 exit /b %errorlevel%
    call :check_env_file
    if %errorlevel% neq 0 exit /b %errorlevel%
    call :create_directories
    call :start_services
) else if "%command%"=="stop" (
    call :stop_services
) else if "%command%"=="restart" (
    call :restart_services
) else if "%command%"=="logs" (
    call :show_logs
) else if "%command%"=="status" (
    call :show_status

) else if "%command%"=="help" (
    call :show_help
) else if "%command%"=="-h" (
    call :show_help
) else if "%command%"=="--help" (
    call :show_help
) else (
    call :print_message "未知命令: %command%" "%RED%"
    call :print_message "使用 '%~nx0 help' 查看帮助信息" "%YELLOW%"
    exit /b 1
)

endlocal
