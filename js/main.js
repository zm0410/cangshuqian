// 主应用逻辑
// 存储当前路径历史记录
let navigationHistory = [];
let currentNodeId = 'root';

// SEO优化：更新页面元数据
function updatePageMetadata(node) {
    const baseTitle = '仓鼠签 - 简约高效的导航网站';
    const baseDescription = '仓鼠签是一个仿Windows资源管理器风格的网址导航网站，提供简洁高效的网址分类管理与访问体验。支持黑暗模式、模糊搜索和拼音搜索功能。';
    
    if (node && node.id !== 'root') {
        document.title = `${node.name} - ${baseTitle}`;
        const description = node.description || (node.type === 'folder' 
            ? `浏览${node.name}分类下的网站和子分类` 
            : `访问${node.name}网站 - ${node.description || ''}`);
        document.querySelector('meta[name="description"]').setAttribute('content', description);
    } else {
        document.title = baseTitle;
        document.querySelector('meta[name="description"]').setAttribute('content', baseDescription);
    }
    
    // 更新面包屑结构化数据
    updateBreadcrumbStructuredData();
}

// 更新面包屑结构化数据（SEO优化）
function updateBreadcrumbStructuredData() {
    // 移除现有的面包屑结构化数据
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
        existingScript.remove();
    }
    
    // 添加新的面包屑结构化数据
    const path = dataManager.getPathToNode(currentNodeId);
    if (path.length <= 1) return; // 根节点不需要结构化数据
    
    const breadcrumbList = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": path.map((node, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": node.name,
            "item": window.location.origin + window.location.pathname + (node.id !== 'root' ? `#${node.id}` : '')
        }))
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(breadcrumbList);
    document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', async function() {
    // 初始化数据管理器和树形渲染器
    window.dataManager = dataManager;
    window.treeRenderer = new TreeRenderer('folderTree', dataManager);
    
    // 加载数据
    try {
        await dataManager.loadData();
        console.log('数据加载完成');
        
        // 渲染树形结构
        treeRenderer.renderTree();
        
        // 默认显示根节点内容
        renderContent('root');
        
        // 初始化导航历史
        navigationHistory = ['root'];
        updateBackButton();
    } catch (error) {
        console.error('数据加载失败:', error);
        
        // 创建示例数据文件
        createSampleData();
    }
    
    // 绑定搜索功能
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 监听节点选中事件
    document.addEventListener('nodeSelected', function(e) {
        const nodeId = e.detail.nodeId;
        renderContent(nodeId);
    });
    
    // 黑暗模式切换
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // 返回按钮事件
    document.getElementById('backButton').addEventListener('click', goBack);
    
    // 检查本地存储中的主题设置
    const savedTheme = localStorage.getItem('hamster-bookmarks-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcons();
    }
});

// 渲染内容区域
function renderContent(nodeId) {
    // 更新当前节点ID
    currentNodeId = nodeId;
    
    // SEO优化：更新页面元数据
    const node = dataManager.getNodeById(nodeId);
    updatePageMetadata(node);
    
    // 更新导航历史（避免重复添加）
    if (navigationHistory[navigationHistory.length - 1] !== nodeId) {
        navigationHistory.push(nodeId);
        // 限制历史记录长度为50项
        if (navigationHistory.length > 50) {
            navigationHistory.shift();
        }
    }
    
    // 更新返回按钮状态
    updateBackButton();
    
    const itemsContainer = document.getElementById('itemsContainer');
    const breadcrumb = document.getElementById('breadcrumb');
    
    // 清空内容
    itemsContainer.innerHTML = '';
    // 保留返回按钮
    const backButton = breadcrumb.querySelector('.back-button');
    breadcrumb.innerHTML = '';
    breadcrumb.appendChild(backButton);
    
    // 获取当前节点数据
    const nodeData = dataManager.getNodeById(nodeId);
    if (!nodeData) return;
    
    // 渲染面包屑
    renderBreadcrumb(nodeId);
    
    // 获取子项
    const children = dataManager.getChildren(nodeId);
    
    // 渲染子项
    children.forEach((item, index) => {
        const row = createItemRow(item, index);
        itemsContainer.appendChild(row);
    });
    
    // 应用黑暗模式类
    updateDarkModeClasses();
}

// 创建项目行元素
function createItemRow(item, index) {
    const row = document.createElement('div');
    row.className = `item-row ${item.type}`;
    
    // 添加延迟动画效果
    row.style.animationDelay = `${index * 0.05}s`;
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    
    // 根据是否有图标URL来决定显示什么图标
    if (item.icon) {
        // 如果有图标URL，则显示网站图标
        const img = document.createElement('img');
        img.src = item.icon;
        img.alt = item.name;
        img.className = 'item-favicon';
        img.loading = 'lazy'; // SEO优化：延迟加载图片
        img.onerror = function() {
            // 如果图标加载失败，显示默认emoji图标
            icon.innerHTML = item.type === 'folder' ? '📁' : '🔗';
        };
        icon.appendChild(img);
    } else if (item.type === 'folder') {
        icon.innerHTML = '📁';
    } else {
        icon.innerHTML = '🔗';
    }
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = item.name;
    
    info.appendChild(title);
    
    if (item.description) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.textContent = item.description;
        info.appendChild(description);
    }
    
    if (item.url) {
        const url = document.createElement('div');
        url.className = 'item-url';
        url.textContent = item.url;
        info.appendChild(url);
    }
    
    row.appendChild(icon);
    row.appendChild(info);
    
    // 添加点击事件
    row.addEventListener('click', () => {
        if (item.type === 'folder') {
            // 选中文件夹
            treeRenderer.selectNode(item.id);
            renderContent(item.id);
        } else if (item.type === 'link') {
            // 打开链接
            window.open(item.url, '_blank');
        }
    });
    
    return row;
}

// 渲染面包屑导航
function renderBreadcrumb(nodeId) {
    const breadcrumb = document.getElementById('breadcrumb');
    
    const path = dataManager.getPathToNode(nodeId);
    
    path.forEach((node, index) => {
        if (index > 0) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '>';
            breadcrumb.appendChild(separator);
        }
        
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.textContent = node.name;
        item.dataset.id = node.id;
        
        if (index === path.length - 1) {
            item.style.fontWeight = 'bold';
        } else {
            item.addEventListener('click', () => {
                treeRenderer.selectNode(node.id);
                renderContent(node.id);
            });
        }
        
        breadcrumb.appendChild(item);
    });
    
    // 应用黑暗模式类
    updateDarkModeClasses();
}

// 处理搜索
function handleSearch() {
    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) return;
    
    const results = dataManager.search(keyword);
    
    const itemsContainer = document.getElementById('itemsContainer');
    // 保留返回按钮
    const backButton = document.getElementById('backButton');
    itemsContainer.innerHTML = `<h2>搜索结果: "${keyword}"</h2>`;
    
    if (results.length === 0) {
        itemsContainer.innerHTML += '<p>未找到匹配的结果</p>';
        updateDarkModeClasses();
        return;
    }
    
    results.forEach((item, index) => {
        const row = createSearchResultRow(item, keyword, index);
        itemsContainer.appendChild(row);
    });
    
    // SEO优化：更新页面元数据
    document.title = `搜索"${keyword}"的结果 - 仓鼠签`;
    document.querySelector('meta[name="description"]').setAttribute('content', `在仓鼠签中搜索"${keyword}"的结果，提供网站和分类导航。`);
    
    // 应用黑暗模式类
    updateDarkModeClasses();
}

// 创建搜索结果行元素
function createSearchResultRow(item, keyword, index) {
    const row = document.createElement('div');
    row.className = `item-row ${item.type}`;
    
    // 添加延迟动画效果
    row.style.animationDelay = `${index * 0.05}s`;
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    
    // 根据是否有图标URL来决定显示什么图标
    if (item.icon) {
        // 如果有图标URL，则显示网站图标
        const img = document.createElement('img');
        img.src = item.icon;
        img.alt = item.name;
        img.className = 'item-favicon';
        img.loading = 'lazy'; // SEO优化：延迟加载图片
        img.onerror = function() {
            // 如果图标加载失败，显示默认emoji图标
            icon.innerHTML = item.type === 'folder' ? '📁' : '🔗';
        };
        icon.appendChild(img);
    } else if (item.type === 'folder') {
        icon.innerHTML = '📁';
    } else {
        icon.innerHTML = '🔗';
    }
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.innerHTML = dataManager.highlightKeyword(item.name, keyword);
    
    info.appendChild(title);
    
    if (item.description) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.innerHTML = dataManager.highlightKeyword(item.description, keyword);
        info.appendChild(description);
    }
    
    if (item.url) {
        const url = document.createElement('div');
        url.className = 'item-url';
        url.innerHTML = dataManager.highlightKeyword(item.url, keyword);
        info.appendChild(url);
    }
    
    row.appendChild(icon);
    row.appendChild(info);
    
    // 添加点击事件
    row.addEventListener('click', () => {
        if (item.type === 'folder') {
            // 选中文件夹
            treeRenderer.selectNode(item.id);
            renderContent(item.id);
        } else if (item.type === 'link') {
            // 打开链接
            window.open(item.url, '_blank');
        }
    });
    
    return row;
}

// 创建示例数据文件
function createSampleData() {
    const sampleData = `站点名称,站点图标,站点链接,站点说明,类别1,类别2,类别3,类别4,类别5
Google,https://www.google.com/favicon.ico,https://www.google.com/,全球最大的搜索引擎,,
GitHub,https://github.com/favicon.ico,https://github.com/,全球最大的代码托管平台,开发工具,,
MDN,https://developer.mozilla.org/favicon-48x48.cbbd161b.png,https://developer.mozilla.org/,Web开发文档资源,开发工具,文档,,
React,https://reactjs.org/favicon.ico,https://reactjs.org/,用于构建用户界面的JavaScript库,开发工具,前端框架,,
Vue,https://vuejs.org/images/logo.png,https://vuejs.org/,渐进式JavaScript框架,开发工具,前端框架,,
Angular,https://angular.io/assets/images/favicons/favicon.ico,https://angular.io/,现代Web开发平台,开发工具,前端框架,,
Node.js,https://nodejs.org/static/images/favicons/favicon.ico,https://nodejs.org/,Node.js JavaScript运行时,开发工具,后端框架,,
Express,https://expressjs.com/images/website-icons/favicon.png,https://expressjs.com/,基于Node.js的web应用框架,开发工具,后端框架,,
Django,https://www.djangoproject.com/s/img/icon-touch.e4872c4da341.png,https://www.djangoproject.com/,Python Web框架,开发工具,后端框架,,
Figma,https://static.figma.com/app/icon/1/favicon.ico,https://www.figma.com/,协作式UI设计工具,设计工具,,
Photoshop,https://www.adobe.com/content/dam/cc/Adobe_favicon.ico,https://www.adobe.com/products/photoshop.html,图像处理软件,设计工具,Adobe,,
Wikipedia,https://en.wikipedia.org/static/favicon/wikipedia.ico,https://www.wikipedia.org/,自由的百科全书,参考资源,,
知乎,https://static.zhihu.com/heifetz/favicon.ico,https://www.zhihu.com/,中文问答社区,社交,,
微博,https://weibo.com/favicon.ico,https://www.weibo.com/,社交媒体平台,社交,,
AWS EC2,https://a0.awsstatic.com/libra-css/icons/favicons/favicon.ico,https://aws.amazon.com/ec2/,亚马逊云服务器,技术,云服务,AWS,,
Docker Desktop,https://www.docker.com/favicon.ico,https://www.docker.com/products/docker-desktop/,Docker桌面版,技术,开发运维,容器化,开发环境,,
Kubernetes Dashboard,https://kubernetes.io/images/favicon.png,https://github.com/kubernetes/dashboard, Kubernetes UI界面,技术,开发运维,容器编排,Kubernetes组件,,
`;

    console.log('请在项目根目录下创建data文件夹，并在其中创建bookmarks.csv文件，内容如下:');
    console.log(sampleData);
    
    alert('请创建 data/bookmarks.csv 文件，内容可参考控制台输出');
}

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    
    // 更新图标
    updateThemeIcons();
    
    // 保存主题设置到本地存储
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('hamster-bookmarks-theme', 'dark');
    } else {
        localStorage.setItem('hamster-bookmarks-theme', 'light');
    }
    
    // 应用黑暗模式类
    updateDarkModeClasses();
}

// 更新主题图标
function updateThemeIcons() {
    const themeToggle = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}

// 更新黑暗模式类
function updateDarkModeClasses() {
    const elements = document.querySelectorAll(
        '.sidebar, .items-container, .breadcrumb, .search-box input, .search-box button, ' +
        '.tree-item:hover, .tree-item.selected, .breadcrumb-item:hover, .item-row, ' +
        '.item-description, .item-url, .breadcrumb-separator, .back-button, .content-header, ' +
        'mark'
    );
    
    elements.forEach(element => {
        if (document.body.classList.contains('dark-mode')) {
            element.classList.add('dark-mode');
        } else {
            element.classList.remove('dark-mode');
        }
    });
}

// 返回上一级
function goBack() {
    if (navigationHistory.length <= 1) {
        return; // 已经在根目录，无法再返回
    }
    
    // 移除当前节点
    navigationHistory.pop();
    
    // 获取新的当前节点
    const previousNodeId = navigationHistory[navigationHistory.length - 1];
    
    // 更新视图
    treeRenderer.selectNode(previousNodeId);
    renderContent(previousNodeId);
}

// 更新返回按钮状态
function updateBackButton() {
    const backButton = document.getElementById('backButton');
    // 如果在根目录，则禁用返回按钮
    backButton.disabled = navigationHistory.length <= 1;
}