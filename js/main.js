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
    const path = getCurrentPath();
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

// 获取当前路径
function getCurrentPath() {
    if (currentNodeId === 'root') {
        return [{ id: 'root', name: '首页' }];
    }
    
    // 如果是分类节点
    if (currentNodeId.startsWith('category_')) {
        const categoryPath = currentNodeId.replace('category_', '');
        return dataManager.getCategoryPath(categoryPath);
    }
    
    // 如果是书签节点
    const bookmark = dataManager.getBookmarkById(currentNodeId);
    if (bookmark) {
        const categoryPath = dataManager.getCategoryPath(bookmark.categoryPath);
        return [...categoryPath, bookmark];
    }
    
    return [{ id: 'root', name: '首页' }];
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
    let node = null;
    if (nodeId === 'root') {
        node = { id: 'root', name: '首页', type: 'root' };
    } else if (nodeId.startsWith('category_')) {
        const categoryPath = nodeId.replace('category_', '');
        const category = dataManager.getCategoryByPath(categoryPath);
        if (category) {
            node = {
                ...category,
                id: nodeId,
                type: 'category'
            };
        }
    } else {
        node = dataManager.getBookmarkById(nodeId);
        if (node) node.type = 'bookmark';
    }
    
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
    
    // 渲染面包屑
    renderBreadcrumb(nodeId);
    
    // 渲染子项
    renderItems(nodeId);
    
    // 应用黑暗模式类
    updateDarkModeClasses();
}

// 渲染项目
function renderItems(nodeId) {
    const itemsContainer = document.getElementById('itemsContainer');
    
    if (nodeId === 'root') {
        // 渲染根分类
        const rootCategories = dataManager.getRootCategories();
        rootCategories.forEach((category, index) => {
            const row = createCategoryRow(category, index, '');
            itemsContainer.appendChild(row);
        });
    } else if (nodeId.startsWith('category_')) {
        // 渲染分类下的子项
        const categoryPath = nodeId.replace('category_', '');
        
        // 渲染子分类
        const childCategories = dataManager.getChildrenCategories(categoryPath);
        childCategories.forEach((category, index) => {
            const row = createCategoryRow(category, index, categoryPath);
            itemsContainer.appendChild(row);
        });
        
        // 渲染该分类下的书签
        const bookmarks = dataManager.getBookmarksByCategory(categoryPath);
        bookmarks.forEach((bookmark, index) => {
            const row = createBookmarkRow(bookmark, childCategories.length + index);
            itemsContainer.appendChild(row);
        });
    }
}

// 创建分类行元素
function createCategoryRow(category, index, parentPath) {
    const row = document.createElement('div');
    row.className = 'item-row folder';
    const categoryPath = parentPath ? `${parentPath}/${category.name}` : category.name;
    row.dataset.id = `category_${categoryPath}`;
    
    // 添加延迟动画效果
    row.style.animationDelay = `${index * 0.05}s`;
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    icon.innerHTML = '📁';
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = category.name;
    
    info.appendChild(title);
    
    if (category.description) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.textContent = category.description;
        info.appendChild(description);
    }
    
    row.appendChild(icon);
    row.appendChild(info);
    
    // 添加点击事件
    row.addEventListener('click', () => {
        treeRenderer.selectNode(`category_${categoryPath}`);
        renderContent(`category_${categoryPath}`);
    });
    
    return row;
}

// 创建书签行元素
function createBookmarkRow(bookmark, index) {
    const row = document.createElement('div');
    row.className = 'item-row link';
    row.dataset.id = bookmark.id;
    
    // 添加延迟动画效果
    row.style.animationDelay = `${index * 0.05}s`;
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    
    // 根据是否有图标URL来决定显示什么图标
    if (bookmark.icon) {
        // 如果有图标URL，则显示网站图标
        const img = document.createElement('img');
        img.src = bookmark.icon;
        img.alt = bookmark.name;
        img.className = 'item-favicon';
        img.loading = 'lazy'; // SEO优化：延迟加载图片
        img.onerror = function() {
            // 如果图标加载失败，显示默认emoji图标
            icon.innerHTML = '🔗';
        };
        icon.appendChild(img);
    } else {
        icon.innerHTML = '🔗';
    }
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = bookmark.name;
    
    info.appendChild(title);
    
    if (bookmark.description) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.textContent = bookmark.description;
        info.appendChild(description);
    }
    
    if (bookmark.url) {
        const url = document.createElement('div');
        url.className = 'item-url';
        url.textContent = bookmark.url;
        info.appendChild(url);
    }
    
    row.appendChild(icon);
    row.appendChild(info);
    
    // 添加点击事件
    row.addEventListener('click', () => {
        // 打开链接
        window.open(bookmark.url, '_blank');
    });
    
    return row;
}

// 渲染面包屑导航
function renderBreadcrumb(nodeId) {
    const breadcrumb = document.getElementById('breadcrumb');
    const path = getCurrentPath();
    
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
                if (node.id === 'root') {
                    treeRenderer.selectNode('root');
                    renderContent('root');
                } else {
                    treeRenderer.selectNode(node.id);
                    renderContent(node.id);
                }
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
        let row;
        if (item.type === 'bookmark') {
            row = createSearchResultBookmarkRow(item, keyword, index);
        } else {
            row = createSearchResultCategoryRow(item, keyword, index);
        }
        itemsContainer.appendChild(row);
    });
    
    // SEO优化：更新页面元数据
    document.title = `搜索"${keyword}"的结果 - 仓鼠签`;
    document.querySelector('meta[name="description"]').setAttribute('content', `在仓鼠签中搜索"${keyword}"的结果，提供网站和分类导航。`);
    
    // 应用黑暗模式类
    updateDarkModeClasses();
}

// 创建搜索结果书签行元素
function createSearchResultBookmarkRow(bookmark, keyword, index) {
    const row = document.createElement('div');
    row.className = 'item-row link';
    
    // 添加延迟动画效果
    row.style.animationDelay = `${index * 0.05}s`;
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    
    // 根据是否有图标URL来决定显示什么图标
    if (bookmark.icon) {
        // 如果有图标URL，则显示网站图标
        const img = document.createElement('img');
        img.src = bookmark.icon;
        img.alt = bookmark.name;
        img.className = 'item-favicon';
        img.loading = 'lazy'; // SEO优化：延迟加载图片
        img.onerror = function() {
            // 如果图标加载失败，显示默认emoji图标
            icon.innerHTML = '🔗';
        };
        icon.appendChild(img);
    } else {
        icon.innerHTML = '🔗';
    }
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.innerHTML = dataManager.highlightKeyword(bookmark.name, keyword);
    
    info.appendChild(title);
    
    if (bookmark.description) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.innerHTML = dataManager.highlightKeyword(bookmark.description, keyword);
        info.appendChild(description);
    }
    
    if (bookmark.url) {
        const url = document.createElement('div');
        url.className = 'item-url';
        url.innerHTML = dataManager.highlightKeyword(bookmark.url, keyword);
        info.appendChild(url);
    }
    
    row.appendChild(icon);
    row.appendChild(info);
    
    // 添加点击事件
    row.addEventListener('click', () => {
        // 打开链接
        window.open(bookmark.url, '_blank');
    });
    
    return row;
}

// 创建搜索结果分类行元素
function createSearchResultCategoryRow(category, keyword, index) {
    const row = document.createElement('div');
    row.className = 'item-row folder';
    row.dataset.id = `category_${category.path}`;
    
    // 添加延迟动画效果
    row.style.animationDelay = `${index * 0.05}s`;
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    icon.innerHTML = '📁';
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.innerHTML = dataManager.highlightKeyword(category.name, keyword);
    
    info.appendChild(title);
    
    if (category.description) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.innerHTML = dataManager.highlightKeyword(category.description, keyword);
        info.appendChild(description);
    }
    
    row.appendChild(icon);
    row.appendChild(info);
    
    // 添加点击事件
    row.addEventListener('click', () => {
        treeRenderer.selectNode(`category_${category.path}`);
        renderContent(`category_${category.path}`);
    });
    
    return row;
}

// 创建示例数据文件
function createSampleData() {
    const sampleCategories = `分类路径,分类名称,分类描述
开发工具/代码托管,代码托管,
开发工具/文档,文档,
开发工具/教程,教程,
开发工具/社区,社区,
开发工具/前端框架,前端框架,
开发工具/后端框架,后端框架,
设计工具/UI设计,UI设计,
设计工具/图像处理,图像处理,
社交/知识社区,知识社区,
技术/云服务,云服务,
技术/开发运维,开发运维,
`;

    const sampleBookmarks = `站点名称,站点图标,站点链接,站点说明,分类路径
GitHub,https://github.com/favicon.ico,https://github.com/,全球最大的代码托管平台,开发工具/代码托管
MDN,https://developer.mozilla.org/favicon-48x48.cbbd161b.png,https://developer.mozilla.org/,Web开发文档资源,开发工具/文档
W3Schools,https://www.w3schools.com/favicon.ico,https://www.w3schools.com/,Web开发教程网站,开发工具/教程
Stack Overflow,https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico,https://stackoverflow.com/,程序员问答社区,开发工具/社区
React,https://reactjs.org/favicon.ico,https://reactjs.org/,用于构建用户界面的JavaScript库,开发工具/前端框架
Vue.js,https://vuejs.org/images/logo.png,https://vuejs.org/,渐进式JavaScript框架,开发工具/前端框架
Node.js,https://nodejs.org/static/images/favicons/favicon.ico,https://nodejs.org/,Node.js JavaScript运行时,开发工具/后端框架
Figma,https://static.figma.com/app/icon/1/favicon.ico,https://www.figma.com/,协作式UI设计工具,设计工具/UI设计
Photoshop,https://www.adobe.com/content/dam/cc/Adobe_favicon.ico,https://www.adobe.com/products/photoshop.html,图像处理软件,设计工具/图像处理
知乎,https://static.zhihu.com/heifetz/favicon.ico,https://www.zhihu.com/,中文问答社区,社交/知识社区
腾讯云,https://cloud.tencent.com/favicon.ico,https://cloud.tencent.com/,云计算服务,技术/云服务
Docker,https://www.docker.com/favicon.ico,https://www.docker.com/,容器化平台,技术/开发运维
`;

    console.log('请在项目data目录下创建categories.csv和bookmarks.csv文件:');
    console.log('\n=== categories.csv ===');
    console.log(sampleCategories);
    console.log('\n=== bookmarks.csv ===');
    console.log(sampleBookmarks);
    
    alert('请创建 data/categories.csv 和 data/bookmarks.csv 文件，内容可参考控制台输出');
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
    if (previousNodeId === 'root') {
        treeRenderer.selectNode('root');
        renderContent('root');
    } else {
        treeRenderer.selectNode(previousNodeId);
        renderContent(previousNodeId);
    }
}

// 更新返回按钮状态
function updateBackButton() {
    const backButton = document.getElementById('backButton');
    // 如果在根目录，则禁用返回按钮
    backButton.disabled = navigationHistory.length <= 1;
}