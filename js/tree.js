// 树形组件模块
/**
 * 树形渲染器类
 * 负责渲染和管理网站分类的树形结构
 */
class TreeRenderer {
    /**
     * 构造函数
     * @param {string} containerId - 容器元素ID
     * @param {DataManager} dataManager - 数据管理器实例
     */
    constructor(containerId, dataManager) {
        this.container = document.getElementById(containerId);
        this.dataManager = dataManager;
        this.selectedNodeId = 'root';
    }

    /**
     * 渲染整个树
     */
    renderTree() {
        this.container.innerHTML = '';
        const treeRoot = this.dataManager.treeData;
        const treeElement = this.createTreeNode(treeRoot, true);
        treeElement.style.animationDelay = '0.1s';
        this.container.appendChild(treeElement);
        
        // 展开根节点
        treeElement.classList.add('expanded');
        
        // 选中根节点
        const rootItem = treeElement.querySelector('.tree-item');
        if (rootItem) {
            rootItem.classList.add('selected');
        }
    }

    /**
     * 创建树节点 - 优化版本
     * @param {Object} node - 节点数据
     * @param {boolean} isRoot - 是否为根节点
     * @param {number} depth - 节点深度
     * @returns {HTMLElement} 节点元素
     */
    createTreeNode(node, isRoot = false, depth = 0) {
        const li = document.createElement('li');
        li.className = 'tree-node';
        li.style.animationDelay = `${depth * 0.1}s`;
        
        const hasChildren = node.children && node.children.length > 0;
        
        // 使用模板字符串优化DOM创建
        const toggleIcon = hasChildren ? '▶' : '';
        const nodeIcon = node.type === 'folder' ? 'folder-icon' : 'link-icon';
        
        li.innerHTML = `
            <div class="tree-item${node.type === 'link' ? ' tree-link-item' : ''}" data-id="${node.id}">
                <span class="toggle">${toggleIcon}</span>
                <span class="icon ${nodeIcon}"></span>
                ${node.type === 'link' ? 
                    `<a href="${node.url}" target="_blank" class="tree-link"><span class="name">${node.name}</span></a>` :
                    `<span class="name">${node.name}</span>`
                }
            </div>
        `;
        
        const div = li.querySelector('.tree-item');
        
        // 事件委托优化
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 处理链接点击
            if (node.type === 'link') {
                return; // 让默认的链接行为处理
            }
            
            const toggle = e.target.closest('.toggle');
            if (toggle) {
                // 切换展开/收起状态
                li.classList.toggle('expanded');
                toggle.textContent = li.classList.contains('expanded') ? '▼' : '▶';
                
                // 更新文件夹图标状态
                const folderIcon = div.querySelector('.folder-icon');
                if (folderIcon) {
                    folderIcon.setAttribute('data-expanded', li.classList.contains('expanded'));
                }
                return;
            }
            
            // 选中文件夹节点
            if (node.type === 'folder') {
                this.selectNode(node.id);
            }
        });
        
        // 递归创建子节点（批量处理）
        if (hasChildren) {
            const ul = document.createElement('ul');
            const fragment = document.createDocumentFragment();
            
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                const childNode = this.createTreeNode(child, false, depth + 1);
                childNode.style.animationDelay = `${(depth + 1) * 0.1 + i * 0.05}s`;
                fragment.appendChild(childNode);
            }
            
            ul.appendChild(fragment);
            li.appendChild(ul);
        }
        
        return li;
    }

    /**
     * 选中节点
     * @param {string} nodeId - 节点ID
     */
    selectNode(nodeId) {
        this.selectedNodeId = nodeId;
        
        // 移除所有选中状态
        const allItems = this.container.querySelectorAll('.tree-item');
        allItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        // 添加选中状态到当前节点
        const selectedItem = this.container.querySelector(`.tree-item[data-id="${nodeId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            
            // 展开到选中节点的路径
            this.expandToNode(nodeId);
        }
        
        // 触发自定义事件，通知其他组件节点已选中
        const event = new CustomEvent('nodeSelected', { detail: { nodeId } });
        document.dispatchEvent(event);
    }

    /**
     * 展开到指定节点的路径
     * @param {string} nodeId - 节点ID
     */
    expandToNode(nodeId) {
        // 获取路径并展开
        const path = this.dataManager.getPathToNode(nodeId);
        path.forEach(node => {
            const nodeElement = this.container.querySelector(`.tree-item[data-id="${node.id}"]`);
            if (nodeElement) {
                const parentNode = nodeElement.closest('.tree-node');
                if (parentNode) {
                    parentNode.classList.add('expanded');
                    const toggle = parentNode.querySelector('.toggle');
                    if (toggle && toggle.innerHTML !== '') {
                        toggle.textContent = '▼';
                    }
                    
                    // 更新文件夹图标状态
                    if (node.type === 'folder') {
                        const folderIcon = parentNode.querySelector('.folder-icon');
                        if (folderIcon) {
                            folderIcon.setAttribute('data-expanded', 'true');
                        }
                    }
                }
            }
        });
    }

    /**
     * 展开所有节点
     */
    expandAll() {
        const allNodes = this.container.querySelectorAll('.tree-node');
        allNodes.forEach(node => {
            if (node.querySelector('ul')) {  // 只展开有子节点的节点
                node.classList.add('expanded');
            }
        });
        
        const allToggles = this.container.querySelectorAll('.toggle');
        allToggles.forEach(toggle => {
            if (toggle.innerHTML !== '') {
                toggle.textContent = '▼';
            }
        });
        
        // 更新所有文件夹图标状态
        const allFolderIcons = this.container.querySelectorAll('.folder-icon');
        allFolderIcons.forEach(icon => {
            icon.setAttribute('data-expanded', 'true');
        });
    }

    /**
     * 收起所有节点
     */
    collapseAll() {
        const allNodes = this.container.querySelectorAll('.tree-node');
        allNodes.forEach(node => {
            node.classList.remove('expanded');
        });
        
        const allToggles = this.container.querySelectorAll('.toggle');
        allToggles.forEach(toggle => {
            if (toggle.innerHTML !== '') {
                toggle.textContent = '▶';
            }
        });
        
        // 更新所有文件夹图标状态
        const allFolderIcons = this.container.querySelectorAll('.folder-icon');
        allFolderIcons.forEach(icon => {
            icon.setAttribute('data-expanded', 'false');
        });
    }
}