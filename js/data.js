// 数据处理模块
class DataManager {
    constructor() {
        this.data = [];
        this.treeData = {};
        this.nodeMap = {}; // 添加节点映射以提高查找性能
    }

    // 加载CSV数据
    async loadData(url = 'data/bookmarks.csv') {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // 转换新的CSV格式到内部格式
                    this.data = this.convertNewFormat(results.data);
                    this.buildTree();
                    resolve(this.data);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    // 将新的CSV格式转换为内部格式
    convertNewFormat(newData) {
        const convertedData = [];
        const categoryMap = new Map(); // 用于映射类别路径到ID
        let idCounter = 1;

        // 收集所有唯一的类别组合
        const categories = new Set();
        newData.forEach(item => {
            // 添加所有层级的类别
            if (item.类别1) categories.add(item.类别1);
            if (item.类别1 && item.类别2) categories.add(`${item.类别1}/${item.类别2}`);
            if (item.类别1 && item.类别2 && item.类别3) categories.add(`${item.类别1}/${item.类别2}/${item.类别3}`);
            if (item.类别1 && item.类别2 && item.类别3 && item.类别4) categories.add(`${item.类别1}/${item.类别2}/${item.类别3}/${item.类别4}`);
            if (item.类别1 && item.类别2 && item.类别3 && item.类别4 && item.类别5) categories.add(`${item.类别1}/${item.类别2}/${item.类别3}/${item.类别4}/${item.类别5}`);
        });

        // 为每个唯一类别创建ID映射
        categories.forEach(category => {
            categoryMap.set(category, String(idCounter++));
        });

        // 处理目录（类别）节点
        categories.forEach(category => {
            const parts = category.split('/');
            const name = parts[parts.length - 1];
            
            // 确定父级
            let parentId = '';
            if (parts.length > 1) {
                const parentPath = parts.slice(0, -1).join('/');
                parentId = categoryMap.get(parentPath) || '';
            }

            convertedData.push({
                id: categoryMap.get(category),
                parent_id: parentId,
                name: name,
                type: 'folder',
                url: '',
                icon: '',
                description: ''
            });
        });

        // 处理链接节点
        newData.forEach(item => {
            // 确定父级ID（最深层的类别）
            let parentId = '';
            if (item.类别5) {
                parentId = categoryMap.get(`${item.类别1}/${item.类别2}/${item.类别3}/${item.类别4}/${item.类别5}`) || '';
            } else if (item.类别4) {
                parentId = categoryMap.get(`${item.类别1}/${item.类别2}/${item.类别3}/${item.类别4}`) || '';
            } else if (item.类别3) {
                parentId = categoryMap.get(`${item.类别1}/${item.类别2}/${item.类别3}`) || '';
            } else if (item.类别2) {
                parentId = categoryMap.get(`${item.类别1}/${item.类别2}`) || '';
            } else if (item.类别1) {
                parentId = categoryMap.get(item.类别1) || '';
            }

            convertedData.push({
                id: String(idCounter++),
                parent_id: parentId,
                name: item.站点名称,
                type: 'link',
                url: item.站点链接 || '',
                icon: item.站点图标 || '',
                description: item.站点说明 || ''
            });
        });

        return convertedData;
    }

    // 构建树形结构
    buildTree() {
        // 初始化节点映射
        this.nodeMap = {};
        
        // 初始化所有节点
        this.data.forEach(item => {
            this.nodeMap[item.id] = { ...item, children: [] };
        });
        
        // 构建父子关系
        this.data.forEach(item => {
            if (item.parent_id && this.nodeMap[item.parent_id]) {
                this.nodeMap[item.parent_id].children.push(this.nodeMap[item.id]);
            }
        });
        
        // 找到根节点
        this.treeData = {
            id: 'root',
            name: '所有书签',
            type: 'folder',
            children: []
        };
        
        this.data.forEach(item => {
            if (!item.parent_id || item.parent_id === '') {
                this.treeData.children.push(this.nodeMap[item.id]);
            }
        });
    }

    // 获取指定节点的子项
    getChildren(parentId) {
        if (!parentId) {
            return this.treeData.children || [];
        }
        
        const node = this.nodeMap[parentId];
        return node ? (node.children || []) : [];
    }

    // 根据ID查找节点
    getNodeById(id) {
        if (id === 'root') {
            return this.treeData;
        }
        
        return this.nodeMap[id] || null;
    }

    // 获取节点路径
    getPathToNode(id) {
        const path = [];
        
        if (id === 'root') {
            path.push(this.treeData);
            return path;
        }
        
        // 使用迭代方式查找路径，避免递归
        const visited = new Set();
        const stack = [{ node: this.treeData, path: [this.treeData] }];
        
        while (stack.length > 0) {
            const { node, path: currentPath } = stack.pop();
            
            // 避免循环引用
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            
            if (node.id === id) {
                return currentPath;
            }
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    stack.push({ 
                        node: child, 
                        path: [...currentPath, child] 
                    });
                });
            }
        }
        
        return [];
    }

    // 搜索功能（支持模糊搜索和拼音搜索）
    search(keyword) {
        if (!keyword) return [];
        
        keyword = keyword.toLowerCase().trim();
        const results = [];
        
        // 创建拼音搜索关键词
        const pinyinKeyword = pinyinPro.pinyin(keyword, { toneType: 'none', type: 'array' }).join('').toLowerCase();
        
        // 使用迭代方式搜索，避免递归
        const stack = [...this.treeData.children];
        
        while (stack.length > 0) {
            const node = stack.pop();
            
            // 检查名称是否匹配（模糊搜索）
            const nameMatch = node.name && 
                (node.name.toLowerCase().includes(keyword) || 
                 pinyinPro.pinyin(node.name, { toneType: 'none' }).toLowerCase().includes(keyword) ||
                 pinyinPro.pinyin(node.name, { toneType: 'none', type: 'array' }).join('').toLowerCase().includes(pinyinKeyword));
            
            // 检查描述是否匹配
            const descriptionMatch = node.description && 
                (node.description.toLowerCase().includes(keyword) || 
                 pinyinPro.pinyin(node.description, { toneType: 'none' }).toLowerCase().includes(keyword) ||
                 pinyinPro.pinyin(node.description, { toneType: 'none', type: 'array' }).join('').toLowerCase().includes(pinyinKeyword));
            
            // 检查URL是否匹配
            const urlMatch = node.url && 
                (node.url.toLowerCase().includes(keyword) || 
                 node.url.toLowerCase().includes(pinyinKeyword));
            
            if (nameMatch || descriptionMatch || urlMatch) {
                // 添加匹配信息用于高亮显示
                const result = { ...node };
                if (nameMatch) result.nameMatch = true;
                if (descriptionMatch) result.descriptionMatch = true;
                if (urlMatch) result.urlMatch = true;
                results.push(result);
            }
            
            if (node.children && node.children.length > 0) {
                stack.push(...node.children);
            }
        }
        
        return results;
    }

    // 高亮关键词
    highlightKeyword(text, keyword) {
        if (!text || !keyword) return text;
        
        // 创建拼音关键词
        const pinyinKeyword = pinyinPro.pinyin(keyword, { toneType: 'none', type: 'array' }).join('').toLowerCase();
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        
        // 检查是否包含直接匹配
        if (lowerText.includes(lowerKeyword)) {
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        }
        
        // 检查是否包含拼音匹配
        const pinyinText = pinyinPro.pinyin(text, { toneType: 'none', type: 'array' }).join('').toLowerCase();
        if (pinyinText.includes(pinyinKeyword)) {
            // 简化的拼音匹配高亮（实际应用中可能需要更复杂的逻辑）
            return text; // 暂时不处理拼音匹配的高亮
        }
        
        return text;
    }
}

// 数据管理器
class DataManager {
    constructor() {
        this.data = [];
        this.dataMap = new Map();
    }

    // 加载数据
    async loadData() {
        return new Promise((resolve, reject) => {
            Papa.parse('data/bookmarks.csv', {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        this.data = this.processData(results.data);
                        this.buildDataMap();
                        resolve(this.data);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    // 处理原始数据
    processData(rawData) {
        const processedData = [];
        const idMap = new Map();
        
        rawData.forEach((item, index) => {
            // 生成唯一ID
            const id = `node_${index}`;
            idMap.set(item['站点名称']+item['站点链接'], id);
            
            // 处理文件夹结构
            const categories = [
                item['类别1'], 
                item['类别2'], 
                item['类别3'], 
                item['类别4'], 
                item['类别5']
            ].filter(cat => cat && cat.trim() !== '');
            
            // 为每个类别创建节点
            let parentId = 'root';
            categories.forEach((category, catIndex) => {
                const categoryKey = categories.slice(0, catIndex + 1).join('>');
                if (!idMap.has(categoryKey)) {
                    const categoryId = `category_${idMap.size}`;
                    idMap.set(categoryKey, categoryId);
                    
                    processedData.push({
                        id: categoryId,
                        name: category,
                        type: 'folder',
                        parentId: parentId,
                        description: `包含${category}分类下的网站和子分类`,
                        keywords: this.generateKeywords(category, 'folder')
                    });
                }
                parentId = idMap.get(categoryKey);
            });
            
            // 添加链接节点
            if (item['站点链接'] && item['站点名称']) {
                processedData.push({
                    id: id,
                    name: item['站点名称'],
                    type: 'link',
                    url: item['站点链接'],
                    icon: item['站点图标'] || '',
                    description: item['站点说明'] || '',
                    parentId: parentId,
                    keywords: this.generateKeywords(item['站点名称'] + ' ' + (item['站点说明'] || ''), 'link')
                });
            }
        });
        
        return processedData;
    }

    // 生成关键词
    generateKeywords(text, type) {
        // 为SEO和搜索优化生成关键词
        let keywords = [text];
        
        // 添加拼音
        const pinyin = pinyinPro.html(text);
        if (pinyin !== text) {
            keywords.push(pinyin);
        }
        
        // 根据类型添加相关关键词
        if (type === 'folder') {
            keywords.push('分类', '目录', '文件夹');
        } else if (type === 'link') {
            keywords.push('链接', '网站', '网址');
        }
        
        return keywords.join(',');
    }

    // 构建数据映射
    buildDataMap() {
        this.dataMap.clear();
        this.data.forEach(item => {
            this.dataMap.set(item.id, item);
        });
    }

    // 根据ID获取节点
    getNodeById(id) {
        return this.dataMap.get(id);
    }

    // 获取子节点
    getChildren(parentId) {
        return this.data.filter(item => item.parentId === parentId);
    }

    // 获取节点路径
    getPathToNode(nodeId) {
        const path = [];
        let currentId = nodeId;
        
        while (currentId) {
            const node = this.getNodeById(currentId);
            if (!node) break;
            
            path.unshift(node);
            currentId = currentId === 'root' ? null : node.parentId;
        }
        
        return path;
    }

    // 搜索功能
    search(keyword) {
        const results = [];
        const lowerKeyword = keyword.toLowerCase();
        
        this.data.forEach(item => {
            // 检查名称、描述和关键词
            if (
                item.name.toLowerCase().includes(lowerKeyword) ||
                (item.description && item.description.toLowerCase().includes(lowerKeyword)) ||
                (item.keywords && item.keywords.toLowerCase().includes(lowerKeyword)) ||
                // 拼音搜索
                pinyinPro.html(item.name).toLowerCase().includes(lowerKeyword)
            ) {
                results.push(item);
            }
        });
        
        return results;
    }

    // 高亮关键词
    highlightKeyword(text, keyword) {
        if (!text || !keyword) return text;
        
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        const index = lowerText.indexOf(lowerKeyword);
        
        if (index === -1) {
            // 尝试拼音匹配
            const pinyinText = pinyinPro.html(text);
            const lowerPinyinText = pinyinText.toLowerCase();
            const pinyinIndex = lowerPinyinText.indexOf(lowerKeyword);
            
            if (pinyinIndex === -1) return text;
            
            const before = text.slice(0, pinyinIndex);
            const match = text.slice(pinyinIndex, pinyinIndex + keyword.length);
            const after = text.slice(pinyinIndex + keyword.length);
            
            return `${before}<mark>${match}</mark>${after}`;
        }
        
        const before = text.slice(0, index);
        const match = text.slice(index, index + keyword.length);
        const after = text.slice(index + keyword.length);
        
        return `${before}<mark>${match}</mark>${after}`;
    }
}

// 创建全局数据管理器实例
const dataManager = new DataManager();
