// 数据管理器
class DataManager {
    constructor() {
        this.bookmarks = [];
        this.categories = [];
        this.bookmarksMap = new Map();
        this.categoriesMap = new Map();
    }

    // 加载数据
    async loadData() {
        try {
            // 并行加载书签和分类数据
            const [bookmarksData, categoriesData] = await Promise.all([
                this.loadCSV('data/bookmarks.csv'),
                this.loadCSV('data/categories.csv')
            ]);

            this.categories = this.processCategoriesData(categoriesData);
            this.bookmarks = this.processBookmarksData(bookmarksData);
            
            this.buildDataMaps();
            return { bookmarks: this.bookmarks, categories: this.categories };
        } catch (error) {
            console.error('数据加载失败:', error);
            throw error;
        }
    }

    // 加载CSV文件
    loadCSV(filePath) {
        return new Promise((resolve, reject) => {
            Papa.parse(filePath, {
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

    // 处理书签数据
    processBookmarksData(rawData) {
        return rawData.map((item, index) => {
            return {
                id: `bookmark_${index}`,
                name: item['站点名称'],
                icon: item['站点图标'] || '',
                url: item['站点链接'],
                description: item['站点说明'],
                categoryPath: item['分类路径']
            };
        });
    }

    // 处理分类数据
    processCategoriesData(rawData) {
        return rawData.map(item => {
            // 解析分类路径
            const pathParts = item['分类路径'].split('/');
            return {
                path: item['分类路径'],
                name: item['分类名称'],
                description: item['分类描述'],
                level: pathParts.length,
                pathParts: pathParts
            };
        });
    }

    // 构建数据映射
    buildDataMaps() {
        // 构建书签映射
        this.bookmarksMap.clear();
        this.bookmarks.forEach(bookmark => {
            this.bookmarksMap.set(bookmark.id, bookmark);
        });

        // 构建分类映射
        this.categoriesMap.clear();
        this.categories.forEach(category => {
            this.categoriesMap.set(category.path, category);
        });
    }

    // 根据ID获取书签
    getBookmarkById(id) {
        return this.bookmarksMap.get(id);
    }

    // 根据路径获取分类
    getCategoryByPath(path) {
        return this.categoriesMap.get(path);
    }

    // 获取分类的完整路径
    getCategoryPath(categoryPath) {
        if (!categoryPath) return [];
        
        const pathParts = categoryPath.split('/');
        const path = [];
        
        for (let i = 1; i <= pathParts.length; i++) {
            const partialPath = pathParts.slice(0, i).join('/');
            const category = this.getCategoryByPath(partialPath);
            if (category) {
                path.push({
                    ...category,
                    id: partialPath  // 使用路径作为ID
                });
            }
        }
        
        return path;
    }

    // 获取指定分类下的所有书签
    getBookmarksByCategory(categoryPath) {
        return this.bookmarks.filter(bookmark => 
            bookmark.categoryPath === categoryPath);
    }

    // 获取指定分类下的所有子分类
    getChildrenCategories(parentPath) {
        if (!parentPath) {
            // 返回根分类
            return this.categories.filter(category => 
                category.pathParts.length === 1);
        }
        
        return this.categories.filter(category => {
            if (category.pathParts.length !== parentPath.split('/').length + 1) {
                return false;
            }
            
            const parentParts = parentPath.split('/');
            const categoryParts = category.pathParts;
            
            // 检查是否为子分类
            for (let i = 0; i < parentParts.length; i++) {
                if (parentParts[i] !== categoryParts[i]) {
                    return false;
                }
            }
            
            return true;
        });
    }

    // 获取根分类
    getRootCategories() {
        return this.categories.filter(category => 
            category.pathParts.length === 1);
    }

    // 搜索功能
    search(keyword) {
        const results = [];
        const lowerKeyword = keyword.toLowerCase();
        
        // 搜索书签
        this.bookmarks.forEach(bookmark => {
            if (
                bookmark.name.toLowerCase().includes(lowerKeyword) ||
                (bookmark.description && bookmark.description.toLowerCase().includes(lowerKeyword)) ||
                (bookmark.url && bookmark.url.toLowerCase().includes(lowerKeyword))
            ) {
                results.push({
                    ...bookmark,
                    type: 'bookmark'
                });
            }
        });
        
        // 搜索分类
        this.categories.forEach(category => {
            if (
                category.name.toLowerCase().includes(lowerKeyword) ||
                (category.description && category.description.toLowerCase().includes(lowerKeyword))
            ) {
                results.push({
                    ...category,
                    id: category.path,  // 使用路径作为ID
                    type: 'category'
                });
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