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
        
        /** @type {Object} 节点映射表 */
        this.nodeMap = {};
        
        /** @type {Array<Object>} 分类数据 */
        this.categories = [];
        
        /** @type {Array<Object>} 网站链接数据 */
        this.sites = [];
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
        const categoryMap = {};
        this.categories.forEach(cat => {
            categoryMap[cat.id] = {
                id: cat.id,
                parent_id: cat.parent || '',
                name: cat.name,
                type: 'folder',
                url: '',
                icon: '',
                description: '',
                sort_order: cat.sort_order ? parseInt(cat.sort_order) : 9999
            };
        });
        const siteList = this.sites.map(site => {
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
            return {
                id: site.id,
                parent_id: site.category,
                name: site.title,
                type: 'link',
                url: site.url,
                icon: icon,
                description: site.description,
                sort_order: site.sort_order ? parseInt(site.sort_order) : 9999
            };
        });
        return [
            ...Object.values(categoryMap),
            ...siteList
        ];
    }

    /**
     * 构建树形结构
     */
    buildTree() {
        this.nodeMap = {};
        this.data.forEach(item => {
            // 只为有子节点的节点创建children数组
            if (item.parent_id || item.type === 'folder') {
                this.nodeMap[item.id] = { ...item, children: [] };
            } else {
                this.nodeMap[item.id] = { ...item };
            }
        });
        this.data.forEach(item => {
            if (item.parent_id && this.nodeMap[item.parent_id]) {
                this.nodeMap[item.parent_id].children.push(this.nodeMap[item.id]);
            }
        });
        Object.values(this.nodeMap).forEach(node => {
            if (node.children && node.children.length > 0) {
                // 先按类型排序：文件夹在前，链接在后
                node.children.sort((a, b) => {
                    // 如果a是文件夹，b是链接，则a在前
                    if (a.type === 'folder' && b.type === 'link') {
                        return -1;
                    }
                    // 如果a是链接，b是文件夹，则b在前
                    if (a.type === 'link' && b.type === 'folder') {
                        return 1;
                    }
                    // 同类型则按sort_order排序
                    return a.sort_order - b.sort_order;
                });
            }
        });
        this.treeData = {
            id: 'root',
            name: '所有书签',
            type: 'folder',
            children: []
        };
        this.data.forEach(item => {
            if ((!item.parent_id || item.parent_id === '') && item.type === 'folder') {
                this.treeData.children.push(this.nodeMap[item.id]);
            }
        });
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
        return this.nodeMap[id] || null;
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
     * 搜索功能
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array<Object>>} 搜索结果数组
     */
    async search(keyword) {
        if (!keyword) return [];
        
        // 按需加载pinyin-pro库
        let pinyinPro;
        try {
            pinyinPro = await this.loadPinyinPro();
        } catch (error) {
            console.error('pinyin-pro库加载失败，使用普通搜索:', error);
            // 如果库加载失败，使用普通搜索（仅匹配原始文本）
            return this.simpleSearch(keyword);
        }
        
        keyword = keyword.toLowerCase().trim();
        const results = [];
        const pinyinKeyword = pinyinPro.pinyin(keyword, { toneType: 'none', type: 'array' }).join('').toLowerCase();
        const stack = [...this.treeData.children];
        while (stack.length > 0) {
            const node = stack.pop();
            const nameMatch = node.name &&
                (node.name.toLowerCase().includes(keyword) ||
                 pinyinPro.pinyin(node.name, { toneType: 'none' }).toLowerCase().includes(keyword) ||
                 pinyinPro.pinyin(node.name, { toneType: 'none', type: 'array' }).join('').toLowerCase().includes(pinyinKeyword));
            const descriptionMatch = node.description &&
                (node.description.toLowerCase().includes(keyword) ||
                 pinyinPro.pinyin(node.description, { toneType: 'none' }).toLowerCase().includes(keyword) ||
                 pinyinPro.pinyin(node.description, { toneType: 'none', type: 'array' }).join('').toLowerCase().includes(pinyinKeyword));
            const urlMatch = node.url &&
                (node.url.toLowerCase().includes(keyword) ||
                 node.url.toLowerCase().includes(pinyinKeyword));
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