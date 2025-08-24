#!/bin/bash

# DeepChat Docker一键部署脚本
# 使用方法: ./deploy.sh [start|stop|restart|logs|status]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 检查Docker和Docker Compose是否安装
check_dependencies() {
    print_message "检查依赖..." $BLUE
    
    if ! command -v docker &> /dev/null; then
        print_message "错误: Docker未安装，请先安装Docker" $RED
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_message "错误: Docker Compose未安装，请先安装Docker Compose" $RED
        exit 1
    fi
    
    print_message "依赖检查通过" $GREEN
}

# 检查.env文件
check_env_file() {
    if [ ! -f ".env" ]; then
        print_message "警告: .env文件不存在，正在从.env.example创建..." $YELLOW
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_message "已创建.env文件，请编辑其中的配置后重新运行部署脚本" $YELLOW
            print_message "重要: 请修改JWT_SECRET和数据库密码等敏感信息" $RED
            exit 1
        else
            print_message "错误: .env.example文件不存在" $RED
            exit 1
        fi
    fi
    print_message ".env文件检查通过" $GREEN
}

# 创建必要的目录
create_directories() {
    print_message "创建必要的目录..." $BLUE
    mkdir -p server/uploads
    mkdir -p server/temp
    mkdir -p nginx/ssl
    print_message "目录创建完成" $GREEN
}

# 启动服务
start_services() {
    print_message "启动DeepChat服务..." $BLUE
    
    # 构建并启动服务
    docker-compose up -d --build
    
    print_message "等待服务启动..." $YELLOW
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_message "服务启动成功!" $GREEN
        print_message "访问地址:" $BLUE
        echo "  - API服务: http://localhost:$(grep SERVER_PORT .env | cut -d'=' -f2 | tr -d ' ' || echo '3000')"
        echo "  - API文档: http://localhost:$(grep SERVER_PORT .env | cut -d'=' -f2 | tr -d ' ' || echo '3000')/api-docs"
        echo "  - 管理后台: http://localhost:$(grep SERVER_PORT .env | cut -d'=' -f2 | tr -d ' ' || echo '3000')/admin"
        echo "  - 健康检查: http://localhost:$(grep SERVER_PORT .env | cut -d'=' -f2 | tr -d ' ' || echo '3000')/health"
    else
        print_message "服务启动失败，请检查日志" $RED
        docker-compose logs
        exit 1
    fi
}

# 停止服务
stop_services() {
    print_message "停止DeepChat服务..." $BLUE
    docker-compose down
    print_message "服务已停止" $GREEN
}

# 重启服务
restart_services() {
    print_message "重启DeepChat服务..." $BLUE
    docker-compose restart
    print_message "服务已重启" $GREEN
}

# 查看日志
show_logs() {
    print_message "显示服务日志..." $BLUE
    docker-compose logs -f
}

# 查看状态
show_status() {
    print_message "服务状态:" $BLUE
    docker-compose ps
    echo ""
    print_message "容器资源使用情况:" $BLUE
    docker stats --no-stream $(docker-compose ps -q)
}



# 主函数
main() {
    case "${1:-start}" in
        "start")
            check_dependencies
            check_env_file
            create_directories
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;

        "help"|"-h"|"--help")
            echo "DeepChat Docker部署脚本"
            echo ""
            echo "使用方法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  start    启动所有服务（默认）"
            echo "  stop     停止所有服务"
            echo "  restart  重启所有服务"
            echo "  logs     查看服务日志"
            echo "  status   查看服务状态"
            echo "  help     显示此帮助信息"
            ;;
        *)
            print_message "未知命令: $1" $RED
            print_message "使用 '$0 help' 查看帮助信息" $YELLOW
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
