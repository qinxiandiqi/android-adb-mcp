# ADB MCP Server

一个封装 Android Debug Bridge (ADB) 工具的 Model Context Protocol (MCP) 服务器，提供完整的 Android 设备管理和操作功能。

## 功能特性

### 设备管理
- 列出已连接的设备
- 获取设备详细信息
- 检查设备连接状态
- 连接/断开设备

### Shell 命令执行
- 执行安全的 shell 命令
- 获取系统属性
- 列出运行进程
- 获取内存和磁盘使用信息

### 文件操作
- 列出文件和目录
- 推送/拉取文件
- 创建/删除目录
- 获取文件信息

### 应用管理
- 列出已安装应用
- 安装/卸载 APK
- 启动/停止应用
- 清除应用数据
- 获取应用信息

### 媒体操作
- 截取屏幕截图
- 录制屏幕视频
- 获取/设置屏幕信息

### 日志访问
- 获取 logcat 日志
- 清除日志缓冲区
- 获取崩溃和 ANR 日志
- 获取内核日志

## 安装

### 前置要求

1. **Node.js**: 版本 18 或更高
2. **pnpm**: 推荐使用 pnpm 作为包管理器
3. **Android SDK**: 确保已安装 Android SDK 并配置了 ADB
4. **设备权限**: 确保 Android 设备已启用 USB 调试模式

### 安装步骤

1. 克隆仓库：
```bash
git clone <repository-url>
cd adb-mcp
```

2. 安装依赖：
```bash
pnpm install
```

3. 构建项目：
```bash
pnpm build
```

## 使用方法

### 作为 MCP 服务器运行

1. 启动服务器：
```bash
pnpm start
```

2. 在支持 MCP 的客户端中配置服务器

### 开发模式

```bash
pnpm dev
```

### 可用工具

服务器提供以下工具类别：

#### 设备工具 (`device-tools`)
- `list_devices`: 列出所有已连接的设备
- `get_device_info`: 获取特定设备的详细信息
- `is_device_connected`: 检查设备连接状态
- `connect_device`: 连接到设备
- `disconnect_device`: 断开设备连接

#### Shell 工具 (`shell-tools`)
- `execute_shell`: 执行 shell 命令
- `get_system_properties`: 获取系统属性
- `list_processes`: 列出运行进程
- `get_memory_info`: 获取内存信息
- `get_disk_usage`: 获取磁盘使用情况

#### 文件工具 (`file-tools`)
- `list_files`: 列出文件和目录
- `push_file`: 推送文件到设备
- `pull_file`: 从设备拉取文件
- `create_directory`: 创建目录
- `remove_file`: 删除文件或目录
- `get_file_info`: 获取文件信息

#### 应用工具 (`app-tools`)
- `list_apps`: 列出已安装应用
- `get_app_info`: 获取应用信息
- `install_app`: 安装 APK
- `uninstall_app`: 卸载应用
- `start_app`: 启动应用
- `stop_app`: 停止应用
- `clear_app_data`: 清除应用数据

#### 媒体工具 (`media-tools`)
- `capture_screenshot`: 截取屏幕截图
- `start_screen_record`: 录制屏幕
- `get_screen_info`: 获取屏幕信息
- `set_screen_density`: 设置屏幕密度
- `reset_screen_density`: 重置屏幕密度

#### 日志工具 (`log-tools`)
- `get_logs`: 获取 logcat 日志
- `clear_logs`: 清除日志缓冲区
- `get_crash_logs`: 获取崩溃日志
- `get_anr_logs`: 获取 ANR 日志
- `get_kernel_logs`: 获取内核日志

## 配置

### 环境变量

- `ADB_PATH`: 自定义 ADB 可执行文件路径（可选）
- `ADB_HOST`: ADB 服务器主机地址（默认：localhost）
- `ADB_PORT`: ADB 服务器端口（默认：5037）

### MCP 客户端配置

在支持 MCP 的客户端中，添加以下配置：

```json
{
  "mcpServers": {
    "adb-mcp": {
      "command": "node",
      "args": ["path/to/adb-mcp/dist/index.js"],
      "env": {
        "ADB_PATH": "/path/to/adb"
      }
    }
  }
}
```

## 安全考虑

1. **命令验证**: 所有 shell 命令都经过安全验证，防止恶意命令执行
2. **路径验证**: 文件路径经过验证，防止路径遍历攻击
3. **权限控制**: 某些操作需要特定的设备权限
4. **输入验证**: 所有输入参数都经过严格验证

## 故障排除

### 常见问题

1. **ADB 未找到**
   - 确保 Android SDK 已正确安装
   - 检查 ADB 是否在系统 PATH 中
   - 或设置 `ADB_PATH` 环境变量

2. **设备未授权**
   - 在设备上允许 USB 调试
   - 重新连接设备
   - 检查设备是否显示授权对话框

3. **连接超时**
   - 检查 USB 连接
   - 重启 ADB 服务器：`adb kill-server && adb start-server`
   - 检查防火墙设置

### 调试模式

启用详细日志输出：

```bash
DEBUG=adb-mcp:* pnpm start
```

## 开发

### 项目结构

```
src/
├── adb/              # ADB 客户端实现
│   ├── client.ts     # 主要的 ADB 客户端类
│   └── types.ts      # 类型定义
├── tools/            # MCP 工具实现
│   ├── device-tools.ts
│   ├── shell-tools.ts
│   ├── file-tools.ts
│   ├── app-tools.ts
│   ├── media-tools.ts
│   └── log-tools.ts
├── utils/            # 工具函数
│   └── validation.ts # 输入验证
└── index.ts          # 服务器入口点
```

### 添加新工具

1. 在相应的工具文件中添加新工具
2. 定义输入模式和处理器
3. 在 `src/index.ts` 中导入工具
4. 运行测试确保功能正常

### 测试

```bash
pnpm test
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 完整的 ADB 功能封装
- 支持 MCP 协议
- 全面的安全验证
