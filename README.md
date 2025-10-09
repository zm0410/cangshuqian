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

一个功能强大的个人资源导航网站，仿 Windows 资源管理器风格设计。专注于影视、电子书、音乐、软件工具等多媒体资源的分类管理，支持深色模式和响应式设计，为用户提供高效便捷的资源访问体验。

## ✨ 功能特色

### 🎬 丰富的资源分类
- **影视娱乐** - 涵盖在线观看、下载资源、VIP解析等
- **电子书籍** - 小说、漫画、有声读物、学术资料
- **音乐资源** - 在线音乐、下载工具、播放器推荐
- **软件工具** - 系统工具、开发软件、移动应用
- **学习资源** - 在线课程、技能培训、考试资料
- **实用网站** - 设计素材、在线工具、导航站点

### 🎨 现代化界面设计
- **仿 Windows 资源管理器** - 熟悉的操作界面，上手即用
- **毛玻璃效果** - 现代化视觉设计，层次分明
- **深色/浅色主题** - 自动跟随系统主题，护眼舒适
- **响应式布局** - 完美适配手机、平板、桌面设备

### 🔍 智能搜索系统
- **全文检索** - 支持标题、描述、URL多维度搜索
- **拼音搜索** - 支持中文拼音首字母快速定位
- **实时高亮** - 搜索结果关键词智能高亮显示
- **搜索缓存** - 智能缓存提升搜索响应速度

### ⚡ 高性能优化
- **懒加载技术** - 图片按需加载，提升页面性能
- **分批渲染** - 大数据集分批显示，流畅无卡顿
- **缓存机制** - 搜索结果智能缓存，减少重复计算
- **防抖处理** - 优化用户交互，避免频繁操作

## 🚀 快速开始

### 在线访问
如果项目已部署，可直接访问在线版本。

### 本地运行

1. **克隆项目**
```bash
git clone https://github.com/zm0410/cangshuqian.git
cd cangshuqian
```

2. **启动服务器**
```bash
# 使用 Python (推荐)
python -m http.server 8080

# 或使用 Node.js
npx http-server -p 8080

# 或使用其他静态服务器
```

3. **访问网站**
打开浏览器访问：`http://localhost:8080`

> 💡 **提示**: 由于浏览器安全策略，直接双击 `index.html` 无法正常加载数据，必须通过HTTP服务器访问。

### 部署到云端

#### GitHub Pages (免费)
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

- **📁 分类总数**: 427个分类目录
- **🔗 网站总数**: 2,328个精选网站
- **🏗️ 层级结构**: 支持多级分类嵌套
- **🎯 覆盖领域**: 14个主要资源分类

### 主要分类包括
1. **影视/动漫/直播/纪录片** - 在线观看、下载资源、VIP工具
2. **电子书/漫画/音乐/听书** - 书籍下载、在线阅读、音乐资源  
3. **BT磁力资源搜索** - 种子搜索、磁力链接
4. **免费AI工具** - ChatGPT、AI绘画、AI办公工具
5. **电脑手机常用** - 系统工具、浏览器、下载工具
6. **软件资源** - 破解软件、绿色软件、开发工具
7. **学习网站** - 在线教育、技能培训、文档资料
8. **实用导航** - 设计资源、在线工具、导航站
9. **其他分类** - 购物比价、临时工具、冷门网站

### 实际数据示例
```csv
# 分类数据示例
cat1,影视/动漫/直播/纪录片,,0
cat24,电子书/漫画/音乐/听书,,23
cat53,BT磁力资源搜索,,52
cat56,免费AI工具,,55

# 网站数据示例  
site1,共青春,https://gqc.ink/,官方直解,cat2
site2,看片狂人,https://kpkuang.bond/,官方直解,cat2
```

### 字段说明与数据格式

#### 分类文件格式 (`data/categories.csv`)
```csv
id,name,parent,sort_order
cat1,影视/动漫/直播/纪录片,,0
cat2,网页综合（在线/下载）,cat1,1
```

#### 网站文件格式 (`data/sites.csv`)  
```csv
id,title,url,description,category,icon,visible,sort_order
site1,共青春,https://gqc.ink/,官方直解,cat2,,1,0
```

#### 字段详细说明
| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| **分类字段** |
| `id` | String | 分类唯一标识 | `cat1`, `cat24` |
| `name` | String | 分类显示名称 | `影视/动漫/直播` |
| `parent` | String | 父分类ID，空值表示根分类 | `cat1` 或 空 |
| `sort_order` | Number | 排序权重，数字越小越靠前 | `0`, `1`, `2` |
| **网站字段** |
| `id` | String | 网站唯一标识 | `site1`, `site100` |
| `title` | String | 网站显示标题 | `共青春`, `看片狂人` |
| `url` | String | 网站访问链接 | `https://example.com` |
| `description` | String | 网站功能描述 | `官方直解`, `免费观看` |
| `category` | String | 所属分类ID | `cat2`, `cat24` |
| `icon` | String | 网站图标链接（可选） | `https://example.com/icon.png` |
| `visible` | Number | 显示状态：1=显示，0=隐藏 | `1`, `0` |
| `sort_order` | Number | 排序权重，数字越小越靠前 | `0`, `1`, `2` |

## 📱 使用指南

### 基础操作
1. **浏览分类**: 点击左侧文件夹展开/收起子分类
2. **查看内容**: 点击分类名称在右侧显示包含的网站
3. **访问网站**: 点击网站卡片在新标签页打开
4. **返回导航**: 使用面包屑导航或返回按钮

### 高级功能
1. **智能搜索**: 顶部搜索框支持中英文、拼音搜索
2. **主题切换**: 右上角月亮/太阳图标切换主题
3. **快速定位**: 点击Logo回到首页
4. **键盘操作**: 搜索框支持回车键快速搜索

### 移动端使用
- 支持触摸滑动操作
- 自适应屏幕尺寸
- 优化触控按钮大小
- 简化界面布局

## 🛠️ 技术架构

### 核心技术
- **HTML5**: 语义化标签，结构清晰
- **CSS3**: Flexbox布局，动画效果，响应式设计
- **JavaScript ES6+**: 原生JS，无框架依赖，模块化设计

### 第三方库
- **PapaParse**: CSV文件解析
- **pinyin-pro**: 中文拼音转换

### 性能优化
- **懒加载**: 图片按需加载
- **虚拟滚动**: 大列表优化
- **缓存策略**: 搜索结果缓存
- **代码分割**: 按功能模块化

### 项目结构
```
cangshuqian/
├── css/
│   ├── style.css          # 主样式文件
│   └── style.min.css      # 压缩版样式
├── data/
│   ├── categories.csv     # 分类数据 (427条)
│   └── sites.csv         # 网站数据 (2328条)
├── js/
│   ├── data.js           # 数据管理模块
│   ├── main.js           # 主逻辑模块
│   ├── tree.js           # 树形组件
│   └── *.min.js          # 压缩版本
├── index.html            # 主页面
├── logo.svg              # 网站Logo
└── favicon.ico           # 网站图标
```

## 🎯 自定义指南

### 修改数据
1. **编辑分类**: 修改 `data/categories.csv` 添加/删除分类
2. **管理网站**: 修改 `data/sites.csv` 添加/删除网站
3. **排序调整**: 修改 `sort_order` 字段调整显示顺序

### 样式定制
1. **主题色彩**: 修改 `css/style.css` 中的颜色变量
2. **布局调整**: 调整容器宽度、间距等布局参数
3. **动画效果**: 自定义页面过渡动画

### 功能扩展
1. **添加新分类**: 在 `data/categories.csv` 中添加新的分类数据
2. **添加新网站**: 在 `data/sites.csv` 中添加新的网站资源
3. **自定义图标**: 替换 `logo.svg` 和 `favicon.ico`
4. **增强搜索**: 修改搜索算法或添加过滤条件
5. **扩展字段**: 为网站添加更多属性字段
6. **数据导入**: 批量导入外部书签或网址数据

### 数据管理建议
- **备份数据**: 定期备份 CSV 文件避免数据丢失
- **数据验证**: 确保 ID 唯一性和分类关系正确
- **性能考虑**: 单个分类下网站数量建议不超过100个
- **编码格式**: CSV 文件建议使用 UTF-8 编码

## 🌍 浏览器支持

| 浏览器 | 最低版本 | 支持状态 |
|--------|----------|----------|
| Chrome | 60+ | ✅ 完全支持 |
| Firefox | 55+ | ✅ 完全支持 |
| Safari | 12+ | ✅ 完全支持 |
| Edge | 79+ | ✅ 完全支持 |
| Internet Explorer | - | ❌ 不支持 |

## 📈 性能指标

- **首屏加载**: < 2秒
- **搜索响应**: < 200ms
- **内存占用**: < 50MB
- **数据容量**: 支持10万+条目
- **并发访问**: 支持千级并发

## 🤝 贡献指南

欢迎贡献代码和建议！

### 贡献方式
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

### 开发规范
- 遵循现有代码风格
- 添加必要的注释
- 确保功能测试通过
- 更新相关文档

## � 重要说明

### 资源免责声明
本项目仅为**技术展示和学习交流**用途，所收录的网站链接和资源信息：

- ✅ **技术用途**: 展示网址导航系统的实现方案
- ✅ **学习交流**: 提供前端开发和数据管理的参考案例  
- ⚠️ **内容免责**: 不对所链接网站的内容、安全性、合法性负责
- ⚠️ **使用风险**: 用户访问第三方网站的风险由用户自行承担
- ⚠️ **版权声明**: 请遵守相关法律法规和网站使用条款

### 使用建议
1. **仅供参考**: 将收录的网站信息仅作为参考
2. **自行判断**: 用户需自行判断网站内容的安全性和合法性
3. **遵守法规**: 请遵守当地法律法规和网站服务条款
4. **风险自担**: 使用第三方网站时请注意保护个人信息安全

### 技术用途
- 前端开发者可以参考代码实现
- 学习 HTML/CSS/JavaScript 技术
- 了解数据驱动的网页设计
- 研究搜索和分类算法

---

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：
- [PapaParse](https://www.papaparse.com/) - CSV解析库
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro) - 拼音转换工具

---

<p align="center">
  <strong>⭐ 如果这个项目对你有帮助，请给个Star支持一下！</strong>
</p>

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
git clone https://github.com/zm0410/cangshuqian.git
```

2. 进入项目目录并启动本地服务器：
```bash
cd cangshuqian
npx http-server
```

3. 在浏览器中访问 `http://localhost:8080` 即可使用。

> 注意：由于浏览器同源策略限制，直接打开 `index.html` 文件可能无法加载数据。建议使用本地服务器运行。

### 在线部署

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

## 项目结构

```
仓鼠签/
├── css/
│   └── style.css          # 主样式文件，包含所有CSS规则
├── data/
│   ├── categories.csv     # 分类数据文件
│   └── sites.csv         # 网站数据文件
├── images/               # 图片资源目录
├── js/
│   ├── data.js           # 数据管理类，负责加载和处理CSV数据
│   ├── data.min.js       # 数据管理类压缩版本
│   ├── main.js           # 主要交互逻辑，包括页面渲染和事件处理
│   ├── main.min.js       # 主要交互逻辑压缩版本
│   ├── tree.js           # 树形结构渲染器，负责左侧分类树的展示
│   └── tree.min.js       # 树形结构渲染器压缩版本
├── favicon.ico           # 网站图标
├── index.html            # 主页面
├── logo.svg              # 网站Logo（SVG格式）
└── README.md             # 项目说明文件
```

## 自定义与扩展

### 数据自定义
- [data/categories.csv](data/categories.csv) - 更新分类结构
- [data/sites.csv](data/sites.csv) - 更新网址数据

可以直接编辑这些 CSV 文件来管理分类和站点数据。文件格式说明请参考上面的"数据结构"部分。

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