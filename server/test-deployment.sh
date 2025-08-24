#!/bin/bash

# DeepChat 部署测试脚本
# 用于验证Docker部署是否成功

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 读取端口配置
get_port() {
    if [ -f ".env" ]; then
        port=$(grep "SERVER_PORT" .env | cut -d'=' -f2 | tr -d ' ')
        if [ -z "$port" ]; then
            port=3000
        fi
    else
        port=3000
    fi
    echo $port
}

# 测试API端点
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    print_message "测试 $description..." $BLUE
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        print_message "✅ $description 测试通过" $GREEN
        return 0
    else
        print_message "❌ $description 测试失败 (状态码: $response)" $RED
        if [ -f "/tmp/response.txt" ]; then
            echo "响应内容:"
            cat /tmp/response.txt
            echo ""
        fi
        return 1
    fi
}

# 等待服务启动
wait_for_service() {
    local port=$1
    local max_attempts=30
    local attempt=1
    
    print_message "等待服务启动 (端口 $port)..." $YELLOW
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_message "服务已启动" $GREEN
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_message "服务启动超时" $RED
    return 1
}

# 主测试函数
main() {
    print_message "开始DeepChat部署测试..." $BLUE
    echo ""
    
    # 检查Docker服务是否运行
    if ! docker info > /dev/null 2>&1; then
        print_message "错误: Docker服务未运行" $RED
        exit 1
    fi
    
    # 检查容器是否运行
    if ! docker-compose ps | grep -q "Up"; then
        print_message "错误: DeepChat服务未运行，请先启动服务" $RED
        print_message "运行: ./deploy.sh start" $YELLOW
        exit 1
    fi
    
    # 获取端口
    port=$(get_port)
    base_url="http://localhost:$port"
    
    print_message "测试配置:" $BLUE
    echo "  - 服务端口: $port"
    echo "  - 基础URL: $base_url"
    echo ""
    
    # 等待服务完全启动
    if ! wait_for_service $port; then
        exit 1
    fi
    
    echo ""
    print_message "开始API测试..." $BLUE
    echo ""
    
    # 测试各个端点
    test_count=0
    pass_count=0
    
    # 基础端点测试
    if test_endpoint "$base_url/" "根路径"; then
        pass_count=$((pass_count + 1))
    fi
    test_count=$((test_count + 1))
    
    # 健康检查端点
    if test_endpoint "$base_url/health" "健康检查"; then
        pass_count=$((pass_count + 1))
    fi
    test_count=$((test_count + 1))
    
    # 状态检查端点
    if test_endpoint "$base_url/status" "状态检查"; then
        pass_count=$((pass_count + 1))
    fi
    test_count=$((test_count + 1))
    
    # API文档端点
    if test_endpoint "$base_url/api-docs" "API文档" "301"; then
        pass_count=$((pass_count + 1))
    fi
    test_count=$((test_count + 1))
    
    # 管理后台登录页面
    if test_endpoint "$base_url/admin/login" "管理后台登录页面"; then
        pass_count=$((pass_count + 1))
    fi
    test_count=$((test_count + 1))
    
    # 404测试
    if test_endpoint "$base_url/nonexistent" "404处理" "404"; then
        pass_count=$((pass_count + 1))
    fi
    test_count=$((test_count + 1))
    
    echo ""
    print_message "测试结果:" $BLUE
    echo "  - 总测试数: $test_count"
    echo "  - 通过数: $pass_count"
    echo "  - 失败数: $((test_count - pass_count))"
    
    if [ $pass_count -eq $test_count ]; then
        echo ""
        print_message "🎉 所有测试通过！部署成功！" $GREEN
        echo ""
        print_message "访问地址:" $BLUE
        echo "  - API服务: $base_url"
        echo "  - API文档: $base_url/api-docs"
        echo "  - 管理后台: $base_url/admin"
        echo "  - 健康检查: $base_url/health"
        exit 0
    else
        echo ""
        print_message "❌ 部分测试失败，请检查服务配置" $RED
        exit 1
    fi
}

# 清理临时文件
cleanup() {
    rm -f /tmp/response.txt
}

# 设置清理函数
trap cleanup EXIT

# 执行主函数
main "$@"
