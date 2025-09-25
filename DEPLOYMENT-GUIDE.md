# 仓鼠签导航网站部署指南

本指南将帮助你将"仓鼠签"导航网站部署到 GitHub Pages。

## 前提条件

1. 你需要有一个 GitHub 账户
2. 本地需要安装 Git

## 部署步骤

### 第一步：在 GitHub 上创建仓库

1. 登录你的 GitHub 账户
2. 访问 https://github.com/new 创建新仓库
3. 仓库名称可以命名为 `hamster-sign` 或其他你喜欢的名字
4. 选择 Public（公开）或 Private（私有）
5. **重要**：不要初始化 README、.gitignore 或许可证
6. 点击 "Create repository"

### 第二步：获取仓库 URL

创建完成后，你会看到类似如下的页面，记录下你的仓库 URL：
```
https://github.com/你的用户名/仓库名.git
```

例如：
```
https://github.com/zhangsan/hamster-sign.git
```

### 第三步：配置本地仓库并推送代码

在项目目录中打开终端或命令提示符，执行以下命令：

```bash
# 设置远程仓库 URL（将 YOUR_GITHUB_REPO_URL 替换为你实际的仓库 URL）
git remote set-url origin YOUR_GITHUB_REPO_URL

# 推送代码到 GitHub
git push -u origin main
```

### 第四步：启用 GitHub Pages

1. 在你的 GitHub 仓库页面，点击 "Settings" 选项卡
2. 在左侧菜单中找到 "Pages" 选项
3. 在 "Source" 部分，选择 "Deploy from a branch"
4. 在 "Branch" 下拉菜单中选择 "main"
5. 点击 "Save" 保存设置

### 第五步：访问你的网站

GitHub Pages 配置完成后，你会看到一个类似这样的提示：
```
Your site is ready to be published at:
https://你的用户名.github.io/仓库名/
```

例如：
```
https://zhangsan.github.io/hamster-sign/
```

网站可能需要几分钟时间才能完全部署完成。

## 更新网站内容

当你修改了网站内容（比如更新了 bookmarks.csv 文件），可以通过以下步骤更新网站：

```bash
# 添加所有更改
git add .

# 提交更改
git commit -m "Update bookmarks and site content"

# 推送到 GitHub
git push origin main
```

推送完成后，GitHub Pages 会自动重新部署网站，更新内容会在几分钟后生效。

## 使用自动化部署脚本

项目中包含了自动化部署脚本，可以简化部署过程：

### Windows 系统：

双击运行 `deploy.bat` 文件，按照提示操作。

### macOS/Linux 系统：

在终端中运行以下命令：

```bash
chmod +x deploy.sh
./deploy.sh
```

按照脚本提示输入必要的信息即可完成部署。