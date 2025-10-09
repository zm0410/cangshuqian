/**
 * 数据管理类
 * 负责加载和处理网站的分类和链接数据
 */
class DataManager {
    constructor() {
        /** @type {Array<Object>} 所有数据项列表 */
        this.data = [];
        
        /** @type {Object} 树形结构数据 */
        this.treeData = {};
        
        /** @type {Map} 节点映射表 - 使用Map提升查找性能 */
        this.nodeMap = new Map();
        
        /** @type {Array<Object>} 分类数据 */
        this.categories = [];
        
        /** @type {Array<Object>} 网站链接数据 */
        this.sites = [];
        
        /** @type {Map} 搜索缓存 - 缓存搜索结果 */
        this.searchCache = new Map();
        
        /** @type {number} 缓存最大数量 */
        this.cacheMaxSize = 50;
        
        /** @type {boolean} 数据是否已加载 */
        this.isDataLoaded = false;
    }

    /**
     * 加载 categories.csv（基础分类数据）
     * @returns {Promise<Array>} 返回分类数据
     */
    async loadCategories() {
        try {
            this.categories = await this.loadCsv('data/categories.csv');
            // 只构建基础树结构（不含站点数据）
            this.data = this.buildDataFromCategoriesAndSites();
            this.buildTree();
            return this.categories;
        } catch (error) {
            console.error('分类数据加载失败:', error);
            throw error;
        }
    }

    /**
     * 异步加载 sites.csv（仅在需要时加载）
     * @returns {Promise<Array>} 返回站点数据
     */
    async loadSites() {
        try {
            if (this.sites.length === 0) {
                console.log('开始异步加载站点数据...');
                const sites = await this.loadCsv('data/sites.csv');
                this.sites = sites.filter(site => site.visible === '1' || site.visible === 1);
                console.log('站点数据加载完成，共加载', this.sites.length, '个站点');
            }
            return this.sites;
        } catch (error) {
            console.error('站点数据加载失败:', error);
            throw error;
        }
    }

    /**
     * 获取指定分类的站点数据（按需加载）
     * @param {string} categoryId - 分类ID
     * @returns {Promise<Array>} 返回该分类下的站点数据
     */
    async getSitesByCategory(categoryId) {
        await this.loadSites(); // 确保站点数据已加载
        return this.sites.filter(site => site.category === categoryId);
    }

    /**
     * 获取所有站点数据（按需加载）
     * @returns {Promise<Array>} 返回所有站点数据
     */
    async getAllSites() {
        await this.loadSites(); // 确保站点数据已加载
        return this.sites;
    }

    /**
     * 获取完整的树形数据（按需加载站点数据）
     * @returns {Promise<Array>} 返回完整的数据
     */
    async getFullData() {
        await this.loadSites(); // 确保站点数据已加载
        this.data = this.buildDataFromCategoriesAndSites();
        this.buildTree();
        return this.data;
    }

    /**
     * 通用 CSV 加载
     * @param {string} url - CSV文件URL
     * @returns {Promise<Array>} 解析后的数据数组
     */
    loadCsv(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    /**
     * 根据 categories 和 sites 构建统一数据结构
     * @returns {Array<Object>} 构建后的数据数组
     */
    buildDataFromCategoriesAndSites() {
        // 预分配数组大小以提升性能
        const data = new Array(this.categories.length + this.sites.length);
        let index = 0;
        
        // 使用 for 循环替代 forEach 提升性能
        for (let i = 0; i < this.categories.length; i++) {
            const cat = this.categories[i];
            data[index++] = {
                id: cat.id,
                parent_id: cat.parent || '',
                name: cat.name,
                type: 'folder',
                url: '',
                icon: '',
                description: '',
                sort_order: cat.sort_order ? parseInt(cat.sort_order) : 9999
            };
        }
        
        // 优化站点数据处理
        for (let i = 0; i < this.sites.length; i++) {
            const site = this.sites[i];
            let icon = '';
            if (site.icon) {
                icon = site.icon;
            } else if (site.url) {
                try {
                    const urlObj = new URL(site.url);
                    icon = urlObj.origin + '/favicon.ico';
                } catch (e) {
                    // URL无效时保持icon为空
                }
            }
            data[index++] = {
                id: site.id,
                parent_id: site.category,
                name: site.title,
                type: 'link',
                url: site.url,
                icon: icon,
                description: site.description,
                sort_order: site.sort_order ? parseInt(site.sort_order) : 9999
            };
        }
        
        return data;
    }

    /**
     * 构建树形结构
     */
    buildTree() {
        // 使用 Map 替代普通对象提升查找性能
        this.nodeMap = new Map();
        
        // 单次遍历构建节点映射
        for (let i = 0; i < this.data.length; i++) {
            const item = this.data[i];
            this.nodeMap.set(item.id, { ...item, children: [] });
        }
        
        // 构建父子关系
        for (let i = 0; i < this.data.length; i++) {
            const item = this.data[i];
            if (item.parent_id) {
                const parent = this.nodeMap.get(item.parent_id);
                if (parent) {
                    parent.children.push(this.nodeMap.get(item.id));
                }
            }
        }
        
        // 优化排序 - 使用更高效的排序算法
        for (const node of this.nodeMap.values()) {
            if (node.children && node.children.length > 0) {
                // 使用原地排序避免创建新数组
                node.children.sort((a, b) => {
                    // 类型排序：文件夹在前
                    const typeCompare = (a.type === 'folder' ? 0 : 1) - (b.type === 'folder' ? 0 : 1);
                    return typeCompare !== 0 ? typeCompare : a.sort_order - b.sort_order;
                });
            }
        }
        
        // 构建根节点
        this.treeData = {
            id: 'root',
            name: '所有书签',
            type: 'folder',
            children: []
        };
        
        // 收集根级节点
        for (let i = 0; i < this.data.length; i++) {
            const item = this.data[i];
            if ((!item.parent_id || item.parent_id === '') && item.type === 'folder') {
                this.treeData.children.push(this.nodeMap.get(item.id));
            }
        }
        
        this.treeData.children.sort((a, b) => a.sort_order - b.sort_order);
    }

    /**
     * 获取指定节点的子节点
     * @param {string} parentId - 父节点ID
     * @returns {Array<Object>} 子节点数组
     */
    getChildren(parentId) {
        if (!parentId) {
            return this.treeData.children || [];
        }
        const node = this.nodeMap[parentId];
        return node ? (node.children || []) : [];
    }

    /**
     * 根据ID获取节点
     * @param {string} id - 节点ID
     * @returns {Object|null} 节点对象或null
     */
    getNodeById(id) {
        if (id === 'root') {
            return this.treeData;
        }
        return this.nodeMap.get(id) || null;
    }

    /**
     * 获取到指定节点的路径
     * @param {string} id - 节点ID
     * @returns {Array<Object>} 路径节点数组
     */
    getPathToNode(id) {
        const path = [];
        if (id === 'root') {
            path.push(this.treeData);
            return path;
        }
        const visited = new Set();
        const stack = [{ node: this.treeData, path: [this.treeData] }];
        while (stack.length > 0) {
            const { node, path: currentPath } = stack.pop();
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            if (node.id === id) {
                return currentPath;
            }
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    stack.push({ node: child, path: [...currentPath, child] });
                });
            }
        }
        return [];
    }

    /**
     * 异步加载pinyin-pro库
     * @returns {Promise<Object>} pinyinPro对象
     */
    async loadPinyinPro() {
        if (window.pinyinPro) {
            return window.pinyinPro;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/pinyin-pro@3.19.6/dist/index.js';
            script.onload = () => {
                console.log('pinyin-pro库加载完成');
                resolve(window.pinyinPro);
            };
            script.onerror = (error) => {
                console.error('pinyin-pro库加载失败:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 搜索功能 - 带缓存优化
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array<Object>>} 搜索结果数组
     */
    async search(keyword) {
        if (!keyword) return [];
        
        // 规范化关键词
        const normalizedKeyword = keyword.toLowerCase().trim();
        
        // 检查缓存
        if (this.searchCache.has(normalizedKeyword)) {
            console.log('从缓存返回搜索结果');
            return this.searchCache.get(normalizedKeyword);
        }
        
        // 按需加载pinyin-pro库
        let pinyinPro;
        try {
            pinyinPro = await this.loadPinyinPro();
        } catch (error) {
            console.error('pinyin-pro库加载失败，使用普通搜索:', error);
            const results = this.simpleSearch(normalizedKeyword);
            this.cacheSearchResult(normalizedKeyword, results);
            return results;
        }
        
        const results = [];
        const pinyinKeyword = pinyinPro.pinyin(normalizedKeyword, { toneType: 'none', type: 'array' }).join('').toLowerCase();
        
        // 使用迭代代替递归，避免栈溢出
        const stack = [...this.treeData.children];
        while (stack.length > 0) {
            const node = stack.pop();
            
            // 优化匹配逻辑
            let nameMatch = false, descriptionMatch = false, urlMatch = false;
            
            if (node.name) {
                const name = node.name.toLowerCase();
                nameMatch = name.includes(normalizedKeyword) ||
                    pinyinPro.pinyin(node.name, { toneType: 'none' }).toLowerCase().includes(normalizedKeyword) ||
                    pinyinPro.pinyin(node.name, { toneType: 'none', type: 'array' }).join('').toLowerCase().includes(pinyinKeyword);
            }
            
            if (node.description) {
                const desc = node.description.toLowerCase();
                descriptionMatch = desc.includes(normalizedKeyword) ||
                    pinyinPro.pinyin(node.description, { toneType: 'none' }).toLowerCase().includes(normalizedKeyword) ||
                    pinyinPro.pinyin(node.description, { toneType: 'none', type: 'array' }).join('').toLowerCase().includes(pinyinKeyword);
            }
            
            if (node.url) {
                urlMatch = node.url.toLowerCase().includes(normalizedKeyword);
            }
            
            if (nameMatch || descriptionMatch || urlMatch) {
                const result = { ...node };
                if (nameMatch) result.nameMatch = true;
                if (descriptionMatch) result.descriptionMatch = true;
                if (urlMatch) result.urlMatch = true;
                results.push(result);
            }
            
            // 添加子节点到栈中
            if (node.children && node.children.length > 0) {
                stack.push(...node.children);
            }
        }
        
        // 缓存搜索结果
        this.cacheSearchResult(normalizedKeyword, results);
        
        return results;
    }

    /**
     * 缓存搜索结果
     * @param {string} keyword - 关键词
     * @param {Array} results - 搜索结果
     */
    cacheSearchResult(keyword, results) {
        // 如果缓存已满，删除最老的缓存项
        if (this.searchCache.size >= this.cacheMaxSize) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        
        this.searchCache.set(keyword, results);
    }

    /**
     * 清空搜索缓存
     */
    clearSearchCache() {
        this.searchCache.clear();
    }

    /**
     * 普通搜索（不使用拼音转换）
     * @param {string} keyword - 搜索关键词
     * @returns {Array<Object>} 搜索结果数组
     */
    simpleSearch(keyword) {
        if (!keyword) return [];
        keyword = keyword.toLowerCase().trim();
        const results = [];
        const stack = [...this.treeData.children];
        while (stack.length > 0) {
            const node = stack.pop();
            const nameMatch = node.name && node.name.toLowerCase().includes(keyword);
            const descriptionMatch = node.description && node.description.toLowerCase().includes(keyword);
            const urlMatch = node.url && node.url.toLowerCase().includes(keyword);
            if (nameMatch || descriptionMatch || urlMatch) {
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

    /**
     * 高亮搜索关键词
     * @param {string} text - 原始文本
     * @param {string} keyword - 搜索关键词
     * @returns {string} 高亮处理后的文本
     */
    highlightKeyword(text, keyword) {
        if (!text || !keyword) return text;
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        if (lowerText.includes(lowerKeyword)) {
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        }
        return text;
    }
}

// 导出数据管理器实例
const dataManager = new DataManager();