# 仓鼠签 - 网址导航网站

一个仿 Windows 资源管理器风格的网址导航网站，使用静态托管方式部署。

## 功能特点

- 仿 Windows 资源管理器界面设计
- 左侧文件夹树形结构，支持展开/折叠
- 右侧显示所选文件夹中的子文件夹及网址
- 数据通过 CSV 文件维护，方便管理
- 支持模糊搜索和拼音搜索
- 支持黑暗模式切换
- 响应式设计，适配移动端设备

## 技术栈

- HTML/CSS/JavaScript
- PapaParse (CSV 解析)
- pinyin-pro (拼音处理)

## 部署方式

详细部署指南请参考 [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) 文件。

### GitHub Pages 部署

1. Fork 本项目或创建新仓库
2. 将所有文件推送到仓库
3. 在仓库设置中启用 GitHub Pages，选择 `main` 分支作为源

## 数据维护

数据通过两个 CSV 文件维护：

1. [data/categories.csv](data/categories.csv) - 定义分类结构
2. [data/sites.csv](data/sites.csv) - 定义网站链接

### categories.csv 格式

```
id,name,parent,sort_order
```

- `id` - 分类唯一标识符
- `name` - 分类名称
- `parent` - 父级分类ID（根分类留空）
- `sort_order` - 排序顺序

### sites.csv 格式

```
id,title,url,desc,category,icon,visible,sort_order
```

- `id` - 网站唯一标识符
- `title` - 网站标题
- `url` - 网站链接
- `desc` - 网站描述
- `category` - 所属分类ID
- `icon` - 网站图标链接（可选）
- `visible` - 是否可见（1为可见，0为隐藏）
- `sort_order` - 排序顺序

数据文件采用 CSV 格式，支持任意层级深度的分类结构。网址信息包括名称、图标链接、网址链接和说明。


## 使用说明

1. 点击左侧文件夹展开/折叠层级
2. 点击文件夹名称在右侧查看内容
3. 点击网址按钮直接跳转到相应网站
4. 使用顶部搜索框进行模糊搜索或拼音搜索
5. 点击 🌙/☀️ 按钮切换黑暗/明亮模式

## 项目结构

```
仓鼠签/
├── css/
│   └── style.css          # 样式文件
├── data/
│   ├── categories.csv     # 分类数据文件
│   └── sites.csv          # 网站数据文件
├── js/
│   ├── data.js            # 数据处理逻辑
│   ├── main.js            # 主要交互逻辑
│   └── tree.js            # 树形结构处理
├── index.html             # 主页面
├── DEPLOYMENT-GUIDE.md    # 部署指南
└── README.md              # 项目说明文件
```

## 自定义

你可以通过修改以下文件来自定义网站：

- [data/categories.csv](data/categories.csv) - 更新分类结构
- [data/sites.csv](data/sites.csv) - 更新网址数据
- [css/style.css](css/style.css) - 修改样式
- [js/data.js](js/data.js) - 修改数据处理逻辑
- [js/main.js](js/main.js) - 修改交互逻辑
- [js/tree.js](js/tree.js) - 修改树形结构逻辑