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
     * 创建树节点
     * @param {Object} node - 节点数据
     * @param {boolean} isRoot - 是否为根节点
     * @param {number} depth - 节点深度
     * @returns {HTMLElement} 节点元素
     */
    createTreeNode(node, isRoot = false, depth = 0) {
        const li = document.createElement('li');
        li.className = 'tree-node';
        
        // 添加动画延迟
        li.style.animationDelay = `${depth * 0.1}s`;
        
        const hasChildren = node.children && node.children.length > 0;
        
        const div = document.createElement('div');
        div.className = 'tree-item';
        div.dataset.id = node.id;
        
        // 如果是链接类型，使整个div可点击
        if (node.type === 'link') {
            div.className += ' tree-link-item';
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(node.url, '_blank');
            });
        }
        
        // 切换按钮（仅对有子节点的节点）
        const toggle = document.createElement('span');
        toggle.className = 'toggle';
        if (hasChildren) {
            toggle.textContent = '▶';
        }
        div.appendChild(toggle);
        
        // 图标
        const icon = document.createElement('span');
        icon.className = 'icon';
        if (node.type === 'folder') {
            icon.classList.add('folder-icon');
        } else {
            icon.classList.add('link-icon');
        }
        div.appendChild(icon);
        
        // 节点名称
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = node.name;
        
        // 如果是链接类型，包装在一个链接中
        if (node.type === 'link') {
            const link = document.createElement('a');
            link.href = node.url;
            link.target = '_blank';
            link.className = 'tree-link';
            link.appendChild(name);
            div.appendChild(link);
        } else {
            div.appendChild(name);
        }
        
        div.addEventListener('click', (e) => {
            // 链接类型的节点已经在上面处理过了
            if (node.type === 'link') {
                return;
            }
            
            e.stopPropagation();
            
            // 如果点击的是切换按钮，则只切换展开/收起状态
            if (e.target === toggle) {
                li.classList.toggle('expanded');
                toggle.textContent = li.classList.contains('expanded') ? '▼' : '▶';
                
                // 更新文件夹图标状态
                if (node.type === 'folder') {
                    const folderIcon = div.querySelector('.folder-icon');
                    if (folderIcon) {
                        folderIcon.setAttribute('data-expanded', li.classList.contains('expanded'));
                    }
                }
                return;
            }
            
            // 否则选中节点（仅对文件夹）
            if (node.type === 'folder') {
                this.selectNode(node.id);
            }
        });
        
        li.appendChild(div);
        
        // 递归创建子节点
        if (hasChildren) {
            const ul = document.createElement('ul');
            node.children.forEach((child, index) => {
                const childNode = this.createTreeNode(child, false, depth + 1);
                // 添加延迟动画效果
                childNode.style.animationDelay = `${(depth + 1) * 0.1 + index * 0.05}s`;
                ul.appendChild(childNode);
            });
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