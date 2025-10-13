# 仓鼠签 - 个人资源导航网站

<p align="center">
  <img src="logo.svg" alt="仓鼠签Logo" width="120" />
</p>

<p align="center">
  <a href="https://github.com/zm0410/cangshuqian/stargazers">
    <img src="https://img.shields.io/github/stars/zm0410/cangshuqian.svg" alt="GitHub Stars">
  </a>
  <a href="https://github.com/zm0410/cangshuqian/issues">
    <img src="https://img.shields.io/github/issues/zm0410/cangshuqian.svg" alt="GitHub Issues">
  </a>
  <a href="https://github.com/zm0410/cangshuqian/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/zm0410/cangshuqian.svg" alt="GitHub License">
  </a>
</p>

一个功能强大的个人资源导航网站，仿 Windows 资源管理器风格设计。专注于影视、电子书、音乐、软件工具等多媒体资源的分类管理，支持深色模式和响应式设计。

## ✨ 功能特色

### 🎬 丰富的资源分类
- **影视娱乐** - 在线观看、下载资源、VIP解析工具
- **电子书籍** - 小说、漫画、有声读物、学术资料
- **音乐资源** - 在线音乐、下载工具、播放器推荐
- **软件工具** - 系统工具、开发软件、移动应用
- **学习网站** - 在线教育、技能培训、文档资料
- **实用导航** - 设计素材、在线工具、导航站点

### 🎨 现代化界面设计
- **仿 Windows 资源管理器** - 熟悉的树形文件夹操作界面
- **毛玻璃视觉效果** - 现代化UI设计，层次分明
- **深色/浅色主题** - 自动跟随系统主题切换
- **响应式布局** - 完美适配手机、平板、桌面设备

### 🔍 智能搜索系统
- **全文检索** - 支持标题、描述、URL多维度搜索
- **拼音搜索** - 支持中文拼音首字母快速定位
- **实时高亮** - 搜索结果关键词智能高亮显示
- **防抖优化** - 提升搜索响应速度

### ⚡ 性能优化
- **资源压缩** - CSS和JS文件经过压缩优化
- **懒加载技术** - 按需加载提升页面性能
- **本地缓存** - 搜索结果智能缓存
- **代码优化** - 模块化设计，无框架依赖

## 🚀 快速开始

### 在线访问
项目已部署，可直接访问在线版本。

### 本地运行

1. **克隆项目**
```bash
git clone https://github.com/zm0410/cangshuqian.git
cd cangshuqian
```

2. **启动本地服务器**
```bash
# 使用 Python (推荐)
python -m http.server 8080

# 或使用 Node.js
npx http-server -p 8080
```

3. **访问网站**
打开浏览器访问：`http://localhost:8080`

> 💡 **提示**: 由于浏览器安全策略，必须通过HTTP服务器访问，不能直接打开index.html文件。

### 部署到云端

#### GitHub Pages (推荐)
1. Fork 本仓库到你的 GitHub 账户
2. 在仓库设置中启用 GitHub Pages
3. 选择 `main` 分支作为发布源
4. 访问 `https://你的用户名.github.io/cangshuqian`

#### 其他平台
- **Vercel**: 支持自动部署，绑定自定义域名
- **Netlify**: 免费静态托管，CDN加速
- **Cloudflare Pages**: 全球CDN，访问速度快

## 📊 数据概览

当前项目包含丰富的资源数据：

- **📁 分类总数**: 400+ 个分类目录
- **🔗 网站总数**: 2000+ 个精选网站
- **🏗️ 层级结构**: 支持多级分类嵌套
- **🎯 覆盖领域**: 影视、书籍、音乐、软件、学习等

### 主要分类
1. **影视/动漫/直播** - 在线观看、下载资源、VIP工具
2. **电子书/漫画/音乐** - 书籍下载、在线阅读、音乐资源
3. **BT磁力资源** - 种子搜索、磁力链接
4. **免费AI工具** - ChatGPT、AI绘画、AI办公
5. **软件资源** - 系统工具、开发软件、破解软件
6. **学习网站** - 在线教育、技能培训、文档资料
7. **实用导航** - 设计资源、在线工具、导航站

## 📋 数据结构

数据通过两个CSV文件维护，位于 `data/` 目录：

### categories.csv - 分类结构
```csv
id,name,parent,sort_order
cat1,影视资源,,0
cat2,在线观看,cat1,1
```

### sites.csv - 网站数据
```csv
id,title,url,description,category,sort_order
site1,示例网站,https://example.com,网站描述,cat1,0
```

### 字段说明
| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 唯一标识 | `cat1`, `site1` |
| `name/title` | 显示名称 | `影视资源` |
| `parent` | 父分类ID | `cat1` 或空 |
| `url` | 网站链接 | `https://example.com` |
| `sort_order` | 排序权重 | 数字越小越靠前 |

## 📱 使用指南

### 基础操作
1. **浏览分类** - 点击左侧文件夹展开/收起子分类
2. **查看内容** - 点击分类名称在右侧显示网站列表
3. **访问网站** - 点击网站卡片在新标签页打开
4. **返回上级** - 使用面包屑导航或返回按钮

### 高级功能
1. **智能搜索** - 顶部搜索框支持中英文、拼音
2. **主题切换** - 右上角图标切换深色/浅色模式
3. **键盘操作** - 搜索框支持回车键快速搜索

## 🛠️ 技术架构

### 核心技术
- **HTML5** - 语义化标签，结构清晰
- **CSS3** - Flexbox布局，动画效果，响应式设计
- **JavaScript ES6+** - 原生JS，无框架依赖，模块化

### 第三方库
- **PapaParse** - CSV文件解析
- **pinyin-pro** - 中文拼音转换

### 项目结构
```
cangshuqian/
├── css/
│   ├── style.css          # 主样式文件
│   └── style.min.css      # 压缩版本
├── data/
│   ├── categories.csv     # 分类数据
│   └── sites.csv         # 网站数据
├── js/
│   ├── data.js           # 数据管理
│   ├── main.js           # 主逻辑
│   ├── tree.js           # 树形组件
│   └── *.min.js          # 压缩版本
├── index.html            # 主页面
├── logo.svg              # 网站Logo
└── favicon.ico           # 网站图标
```

## 🎯 自定义指南

### 修改数据
1. **编辑分类** - 修改 `data/categories.csv`
2. **管理网站** - 修改 `data/sites.csv`
3. **调整排序** - 修改 `sort_order` 字段

### 样式定制
1. **主题色彩** - 修改 `css/style.css` 中的颜色变量
2. **布局调整** - 调整容器宽度、间距等
3. **动画效果** - 自定义页面过渡动画

### 功能扩展
1. **添加分类** - 在CSV中添加新分类
2. **扩展字段** - 为网站添加更多属性
3. **增强搜索** - 修改搜索算法

## 🌍 浏览器支持

| 浏览器 | 版本 | 支持 |
|--------|------|------|
| Chrome | 60+ | ✅ |
| Firefox | 55+ | ✅ |
| Safari | 12+ | ✅ |
| Edge | 79+ | ✅ |
| IE | - | ❌ |

## ⚖️ 免责声明

本项目仅为**技术展示和学习交流**用途：

- ✅ **技术用途** - 展示网址导航系统的实现方案
- ✅ **学习交流** - 提供前端开发和数据管理的参考
- ⚠️ **内容免责** - 不对链接网站的内容、安全性负责
- ⚠️ **使用风险** - 用户访问第三方网站需自行判断

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发规范
- 遵循现有代码风格
- 使用原生JavaScript，无框架依赖
- 模块化设计，便于维护
- 添加必要注释

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

## 🙏 致谢

感谢以下开源项目：
- [PapaParse](https://www.papaparse.com/) - CSV解析库
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro) - 拼音转换工具

---

<p align="center">
  <strong>⭐ 如果这个项目对你有帮助，请给个Star支持一下！</strong>
</p>