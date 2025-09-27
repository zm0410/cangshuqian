// 主应用逻辑
/**
 * 导航历史记录
 * @type {Array<string>}
 */
let navigationHistory = [];

/**
 * 当前节点ID
 * @type {string}
 */
let currentNodeId = 'root';

/**
 * DOM内容加载完成后初始化应用
 */
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化树形渲染器
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
        alert('数据加载失败，请检查 data/categories.csv 和 data/sites.csv 格式及内容！');
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

    // Logo和网站标题点击事件 - 返回首页
    document.getElementById('logoContainer').addEventListener('click', function(e) {
        // 防止在点击搜索框等子元素时触发
        if (e.target === this || e.target.classList.contains('website-logo') || e.target.id === 'siteTitle') {
            goToHome();
        }
    });
    document.getElementById('siteTitle').addEventListener('click', goToHome);

    // 检查本地存储中的主题设置
    const savedTheme = localStorage.getItem('hamster-bookmarks-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcons();
    }
});

/**
 * 渲染内容区域
 * @param {string} nodeId - 节点ID
 */
function renderContent(nodeId) {
    // 更新当前节点ID
    currentNodeId = nodeId;

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
    if (backButton) breadcrumb.appendChild(backButton);

    // 获取当前节点数据
    const node = dataManager.getNodeById(nodeId);
    if (!node) {
        itemsContainer.innerHTML = '<p>未找到该分类或站点。</p>';
        return;
    }

    // 渲染面包屑
    renderBreadcrumb(nodeId);

    // 获取子项
    const children = dataManager.getChildren(nodeId);

    // 渲染子项
    if (!children || children.length === 0) {
        // 已移除"暂无内容"提示
        return;
    }
    children.forEach((item, index) => {
        const row = createItemRow(item, index);
        itemsContainer.appendChild(row);
    });
    
    // 应用黑暗模式类
    updateDarkModeClasses();
}

/**
 * 创建项目行元素
 * @param {Object} item - 项目数据
 * @param {number} index - 索引
 * @returns {HTMLElement} 项目行元素
 */
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
        img.onerror = function() {
            // 如果图标加载失败，显示默认emoji图标
            icon.textContent = item.type === 'folder' ? '📁' : '🔗';
        };
        icon.appendChild(img);
    } else if (item.type === 'folder') {
        icon.textContent = '📁';
    } else {
        icon.textContent = '🔗';
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

/**
 * 渲染面包屑导航
 * @param {string} nodeId - 节点ID
 */
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

/**
 * 处理搜索
 */
function handleSearch() {
    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) return;

    const results = dataManager.search(keyword);

    const itemsContainer = document.getElementById('itemsContainer');
    // 保留返回按钮
    const backButton = document.getElementById('backButton');
    itemsContainer.innerHTML = `<h2>搜索结果: "${keyword}"</h2>`;

    if (results.length === 0) {
        itemsContainer.innerHTML += '<p>未找到匹配的结果，请尝试其他关键词。</p>';
        updateDarkModeClasses();
        return;
    }

    results.forEach((item, index) => {
        const row = createSearchResultRow(item, keyword, index);
        itemsContainer.appendChild(row);
    });

    // 应用黑暗模式类
    updateDarkModeClasses();
}

/**
 * 创建搜索结果行元素
 * @param {Object} item - 项目数据
 * @param {string} keyword - 搜索关键词
 * @param {number} index - 索引
 * @returns {HTMLElement} 搜索结果行元素
 */
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
        img.onerror = function() {
            // 如果图标加载失败，显示默认emoji图标
            icon.textContent = item.type === 'folder' ? '📁' : '🔗';
        };
        icon.appendChild(img);
    } else if (item.type === 'folder') {
        icon.textContent = '📁';
    } else {
        icon.textContent = '🔗';
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

/**
 * 创建示例数据文件
 */
function createSampleData() {
    const sampleData = `id,title,url,description,category,icon,visible,sort_order
Google,https://www.google.com/favicon.ico,https://www.google.com/,全球最大的搜索引擎,tech,,1,1
GitHub,https://github.com/favicon.ico,https://github.com/,全球最大的代码托管平台,dev,,1,1
MDN,https://developer.mozilla.org/favicon-48x48.cbbd161b.png,https://developer.mozilla.org/,Web开发文档资源,frontend,,1,1
React,https://reactjs.org/favicon.ico,https://reactjs.org/,用于构建用户界面的JavaScript库,framework,,1,1
Vue,https://vuejs.org/images/logo.png,https://vuejs.org/,渐进式JavaScript框架,framework,,1,2
Angular,https://angular.io/assets/images/favicons/favicon.ico,https://angular.io/,现代Web开发平台,framework,,1,3
`;

    console.log('请在项目根目录下创建data文件夹，并在其中创建sites.csv和categories.csv文件，内容如下:');
    console.log('categories.csv:');
    console.log('id,name,parent,sort_order');
    console.log('tech,科技,,1');
    console.log('dev,开发,,2');
    console.log('');
    console.log('sites.csv:');
    console.log(sampleData);
    
    alert('请创建 data/categories.csv 和 data/sites.csv 文件，内容可参考控制台输出');
}

/**
 * 切换主题
 */
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

/**
 * 更新主题图标
 */
function updateThemeIcons() {
    const themeToggle = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}

/**
 * 更新黑暗模式类
 */
function updateDarkModeClasses() {
    const elements = document.querySelectorAll(
        '.sidebar, .items-container, .breadcrumb, .search-box input, .search-box button, ' +
        '.tree-item:hover, .tree-item.selected, .breadcrumb-item:hover, .item-row, ' +
        '.item-description, .item-url, .breadcrumb-separator, .back-button, .content-header, ' +
        'mark, .website-logo'
    );
    
    elements.forEach(element => {
        if (document.body.classList.contains('dark-mode')) {
            element.classList.add('dark-mode');
        } else {
            element.classList.remove('dark-mode');
        }
    });
}

/**
 * 返回上一级
 */
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

/**
 * 更新返回按钮状态
 */
function updateBackButton() {
    const backButton = document.getElementById('backButton');
    // 如果在根目录，则禁用返回按钮
    backButton.disabled = navigationHistory.length <= 1;
}

/**
 * 返回首页
 */
function goToHome() {
    // 清空搜索框
    document.getElementById('searchInput').value = '';
    
    // 选中根节点
    treeRenderer.selectNode('root');
    renderContent('root');
}