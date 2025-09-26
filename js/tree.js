// 树形结构渲染器
class TreeRenderer {
    constructor(containerId, dataManager) {
        this.container = document.getElementById(containerId);
        this.dataManager = dataManager;
        this.selectedNodeId = null;
    }

    // 渲染树形结构
    renderTree() {
        const treeData = this.buildTree('root');
        this.container.innerHTML = '';
        const ul = this.createTreeElement(treeData, true);
        ul.className = 'tree-root';
        this.container.appendChild(ul);
    }

    // 构建树形数据结构
    buildTree(parentId) {
        if (parentId === 'root') {
            // 获取根分类
            const rootCategories = this.dataManager.getRootCategories();
            return rootCategories.map(category => {
                const categoryPath = category.pathParts[0];
                return {
                    id: `category_${categoryPath}`,
                    name: category.name,
                    type: 'folder',
                    description: category.description,
                    path: categoryPath,
                    children: this.buildTree(`category_${categoryPath}`)
                };
            });
        } else if (parentId.startsWith('category_')) {
            // 获取子分类
            const parentPath = parentId.replace('category_', '');
            const childCategories = this.dataManager.getChildrenCategories(parentPath);
            return childCategories.map(category => {
                const categoryPath = category.path;
                return {
                    id: `category_${categoryPath}`,
                    name: category.name,
                    type: 'folder',
                    description: category.description,
                    path: categoryPath,
                    children: this.buildTree(`category_${categoryPath}`)
                };
            });
        }
        
        return [];
    }

    // 创建树形元素
    createTreeElement(nodeData, isRoot = false) {
        const ul = document.createElement('ul');
        if (isRoot) {
            ul.className = 'tree-root';
        }

        nodeData.forEach(node => {
            const li = document.createElement('li');
            li.className = 'tree-node';
            li.dataset.id = node.id;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'tree-item';
            if (node.type === 'link') {
                itemDiv.classList.add('tree-link-item');
            }

            // 创建展开/折叠图标
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'toggle';
            toggleIcon.innerHTML = node.children && node.children.length > 0 ? '▶' : '';
            if (node.children && node.children.length > 0) {
                itemDiv.classList.add('has-children');
            }

            // 创建文件夹/链接图标
            const typeIcon = document.createElement('span');
            typeIcon.className = 'icon ' + (node.type === 'folder' ? 'folder-icon' : 'link-icon');
            if (node.type === 'folder') {
                typeIcon.setAttribute('data-expanded', 'false');
            }

            // 创建链接文本
            if (node.type === 'link') {
                const link = document.createElement('a');
                link.href = node.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer'; // SEO优化：安全性和性能
                link.className = 'tree-link';
                link.textContent = node.name;
                link.title = node.description || node.name; // SEO优化：添加title属性
                
                itemDiv.appendChild(toggleIcon);
                itemDiv.appendChild(typeIcon);
                itemDiv.appendChild(link);
            } else {
                const span = document.createElement('span');
                span.className = 'tree-text';
                span.textContent = node.name;
                span.title = node.description || node.name; // SEO优化：添加title属性
                
                itemDiv.appendChild(toggleIcon);
                itemDiv.appendChild(typeIcon);
                itemDiv.appendChild(span);
            }

            li.appendChild(itemDiv);

            // 为有子节点的元素添加点击事件
            if (node.children && node.children.length > 0) {
                itemDiv.addEventListener('click', (e) => {
                    // 防止点击链接时触发折叠/展开
                    if (e.target.tagName === 'A') return;
                    
                    li.classList.toggle('expanded');
                    const isExpanded = li.classList.contains('expanded');
                    toggleIcon.innerHTML = isExpanded ? '▼' : '▶';
                    if (node.type === 'folder') {
                        typeIcon.setAttribute('data-expanded', isExpanded);
                    }
                    
                    // 如果没有子节点元素，则创建
                    if (isExpanded && !li.querySelector('ul')) {
                        const childUl = this.createTreeElement(node.children);
                        li.appendChild(childUl);
                    }
                });
            } else if (node.type === 'folder') {
                // 为没有子节点的文件夹添加点击事件
                itemDiv.addEventListener('click', (e) => {
                    if (e.target.tagName === 'A') return;
                    this.selectNode(node.id);
                });
            }

            // 为链接节点添加选中事件
            if (node.type === 'link') {
                itemDiv.addEventListener('click', (e) => {
                    if (e.target.tagName === 'A') return;
                    this.selectNode(node.id);
                });
            }

            ul.appendChild(li);
        });

        return ul;
    }

    // 选中节点
    selectNode(nodeId) {
        // 更新选中状态
        if (this.selectedNodeId) {
            const previousSelectedItem = document.querySelector(`.tree-item.selected[data-id="${this.selectedNodeId}"]`);
            if (previousSelectedItem) {
                previousSelectedItem.classList.remove('selected');
            }
        }

        this.selectedNodeId = nodeId;
        const selectedItem = document.querySelector(`.tree-item[data-id="${nodeId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // 触发选中事件
        const event = new CustomEvent('nodeSelected', {
            detail: { nodeId }
        });
        document.dispatchEvent(event);
    }
}
// 树形组件模块
class TreeRenderer {
    constructor(containerId, dataManager) {
        this.container = document.getElementById(containerId);
        this.dataManager = dataManager;
        this.selectedNodeId = 'root';
    }

    // 渲染整个树
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

    // 创建树节点
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
            toggle.innerHTML = '▶';
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
                toggle.innerHTML = li.classList.contains('expanded') ? '▼' : '▶';
                
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

    // 选中节点
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

    // 展开到指定节点的路径
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
                        toggle.innerHTML = '▼';
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

    // 展开所有节点
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
                toggle.innerHTML = '▼';
            }
        });
        
        // 更新所有文件夹图标状态
        const allFolderIcons = this.container.querySelectorAll('.folder-icon');
        allFolderIcons.forEach(icon => {
            icon.setAttribute('data-expanded', 'true');
        });
    }

    // 收起所有节点
    collapseAll() {
        const allNodes = this.container.querySelectorAll('.tree-node');
        allNodes.forEach(node => {
            node.classList.remove('expanded');
        });
        
        const allToggles = this.container.querySelectorAll('.toggle');
        allToggles.forEach(toggle => {
            if (toggle.innerHTML !== '') {
                toggle.innerHTML = '▶';
            }
        });
        
        // 更新所有文件夹图标状态
        const allFolderIcons = this.container.querySelectorAll('.folder-icon');
        allFolderIcons.forEach(icon => {
            icon.setAttribute('data-expanded', 'false');
        });
    }
}