# 仓鼠签 - 网址导航网站

<p align="center">
  <img src="logo.svg" alt="仓鼠签Logo" width="120" />
</p>

<p align="center">
  <a href="https://github.com/your-username/hamster-bookmarks/stargazers">
    <img src="https://img.shields.io/github/stars/your-username/hamster-bookmarks.svg" alt="GitHub Stars">
  </a>
  <a href="https://github.com/your-username/hamster-bookmarks/issues">
    <img src="https://img.shields.io/github/issues/your-username/hamster-bookmarks.svg" alt="GitHub Issues">
  </a>
  <a href="https://github.com/your-username/hamster-bookmarks/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/your-username/hamster-bookmarks.svg" alt="GitHub License">
  </a>
</p>

一个仿 Windows 资源管理器风格的网址导航网站，使用纯静态技术构建，支持深色模式和响应式设计。界面简洁美观，操作直观易用，适用于个人或团队的网址收藏管理。

## 功能特点

### 🎨 精美界面设计
- **仿 Windows 资源管理器风格** - 提供用户熟悉的操作界面
- **现代化 UI 设计** - 圆角、毛玻璃效果、渐变色彩等现代设计元素
- **深色/浅色主题切换** - 一键切换，保护用户视力
- **响应式布局** - 完美适配桌面端、平板和手机设备

### 🗂️ 智能分类管理
- **树形文件夹结构** - 支持无限层级分类，可展开/折叠
- **直观的内容展示** - 右侧区域清晰展示所选文件夹内容
- **灵活的数据管理** - 通过 CSV 文件轻松维护分类和链接

### 🔍 强大搜索功能
- **模糊搜索** - 支持关键词匹配
- **拼音搜索** - 支持中文及其拼音首字母搜索
- **高亮显示** - 搜索结果关键词高亮显示

### ⚡ 优秀用户体验
- **流畅动画效果** - 页面元素动画过渡，提升交互体验
- **便捷导航** - 面包屑导航和返回按钮，操作路径清晰
- **快速访问** - 点击即打开网站，新标签页加载

## 技术架构

### 前端技术栈
- **HTML5** - 语义化标签，结构清晰
- **CSS3** - Flexbox、Grid 布局，支持动画和过渡效果
- **原生 JavaScript (ES6+)** - 无框架依赖，轻量高效

### 第三方库
- [PapaParse](https://www.papaparse.com/) - 高性能 CSV 解析库
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro) - 现代化中文拼音转换库

### 视觉元素
- **自定义 SVG Logo** - 矢量图标，任意缩放不失真
- **Favicon 支持** - 网站图标适配各种设备
- **Emoji 图标备选** - 默认使用 Emoji 作为网站图标备选方案

## 快速开始

### 本地运行

1. 克隆或下载本项目到本地：
```bash
git clone https://github.com/your-username/hamster-bookmarks.git
```

2. 进入项目目录并启动本地服务器：
```bash
cd hamster-bookmarks
npx http-server
```

3. 在浏览器中访问 `http://localhost:8080` 即可使用。

> 注意：由于浏览器同源策略限制，直接打开 `index.html` 文件可能无法加载数据。建议使用本地服务器运行。

### 在线部署

详细部署指南请参考 [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) 文件。

#### GitHub Pages 部署
1. Fork 本项目或创建新仓库
2. 将所有文件推送到仓库
3. 在仓库设置中启用 GitHub Pages，选择 `main` 分支作为源

#### 其他静态托管平台
本项目也可部署到以下平台：
- Vercel
- Netlify
- Cloudflare Pages
- 任何支持静态文件托管的服务

## 数据结构

数据通过两个 CSV 文件维护，位于 [data/](data/) 目录下：

### [categories.csv](data/categories.csv) - 分类结构定义

```csv
id,name,parent,sort_order
```

字段说明：
- `id` - 分类唯一标识符（字符串）
- `name` - 分类显示名称
- `parent` - 父级分类ID（根分类留空）
- `sort_order` - 排序顺序（数字，越小越靠前）

### [sites.csv](data/sites.csv) - 网站链接定义

```csv
id,title,url,description,category,icon,visible,sort_order
```

字段说明：
- `id` - 网站唯一标识符（字符串）
- `title` - 网站显示标题
- `url` - 网站链接地址
- `description` - 网站描述信息
- `category` - 所属分类ID（对应 categories.csv 中的 id）
- `icon` - 网站图标链接（可选，如果为空会尝试自动获取 favicon）
- `visible` - 是否可见（1为可见，0为隐藏）
- `sort_order` - 排序顺序（数字，越小越靠前）

## 使用指南

1. **浏览分类** - 点击左侧文件夹图标展开/折叠层级，点击文件夹名称在右侧查看内容
2. **访问网站** - 点击右侧网址卡片直接在新标签页中打开相应网站
3. **搜索功能** - 使用顶部搜索框进行模糊搜索或拼音搜索（支持中文拼音首字母）
4. **主题切换** - 点击右上角 🌙/☀️ 按钮切换深色/明亮模式
5. **导航返回** - 使用顶部 ← 返回按钮或面包屑导航返回上级分类
6. **数据管理** - 点击右上角 ⚙️ 按钮进入数据管理工具，可以方便地对分类和站点进行增删改查

## 项目结构

```
仓鼠签/
├── css/
│   └── style.css          # 主样式文件，包含所有CSS规则
├── data/
│   ├── categories.csv     # 分类数据文件
│   └── sites.csv          # 网站数据文件
├── images/                # 图片资源目录
├── js/
│   ├── data.js            # 数据管理类，负责加载和处理CSV数据
│   ├── main.js            # 主要交互逻辑，包括页面渲染和事件处理
│   ├── tree.js            # 树形结构渲染器，负责左侧分类树的展示
│   └── admin.js           # 数据管理工具脚本
├── favicon.ico            # 网站图标
├── index.html             # 主页面
├── admin.html             # 数据管理工具页面
├── logo.svg               # 网站Logo（SVG格式）
└── README.md              # 项目说明文件
```

## 自定义与扩展

### 数据自定义
- [data/categories.csv](data/categories.csv) - 更新分类结构
- [data/sites.csv](data/sites.csv) - 更新网址数据

### 样式自定义
- [css/style.css](css/style.css) - 修改整体样式，包括颜色、布局、动画等

### 功能扩展
- [js/data.js](js/data.js) - 修改数据处理逻辑，如添加新的数据字段
- [js/main.js](js/main.js) - 修改主交互逻辑，如添加新的页面功能
- [js/tree.js](js/tree.js) - 修改树形结构逻辑，如调整分类展示方式

### 品牌定制
- [logo.svg](logo.svg) - 替换为自定义Logo
- [favicon.ico](favicon.ico) - 替换为自定义网站图标

## 浏览器兼容性

本项目支持所有现代浏览器：
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

> 注意：IE 浏览器不被支持

## 开发与维护

### 代码规范
- 使用原生 JavaScript，无框架依赖
- 模块化设计，便于维护和扩展
- 语义化 HTML 结构
- CSS BEM 命名规范

### 性能优化
- 按需加载数据
- CSS 动画优化
- 响应式图片处理
- 本地存储主题设置

### 安全考虑
- 使用 HTTPS CDN 资源
- 防止 XSS 攻击（使用 textContent 而非 innerHTML）
- 数据文件验证和错误处理

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。在提交代码前，请确保：

1. 遵循项目代码规范
2. 添加必要的注释和文档
3. 测试功能是否正常工作
4. 更新相关文档

## 许可证

本项目采用 MIT 许可证，详情请查看 [LICENSE](LICENSE) 文件。

## 鸣谢

特别感谢以下开源项目：
- [PapaParse](https://www.papaparse.com/) - 强大的 CSV 解析库
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro) - 现代化中文拼音转换工具