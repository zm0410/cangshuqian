// 数据处理模块
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

            this.bookmarks = this.processBookmarksData(bookmarksData);
            this.categories = this.processCategoriesData(categoriesData);
            
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
                categoryId: item['分类ID'] ? parseInt(item['分类ID']) : null
            };
        });
    }

    // 处理分类数据
    processCategoriesData(rawData) {
        return rawData.map(item => {
            return {
                id: parseInt(item['分类ID']),
                name: item['分类名称'],
                parentId: item['父级分类ID'] ? parseInt(item['父级分类ID']) : null,
                description: item['分类描述'],
                level1: item['类别1'],
                level2: item['类别2'],
                level3: item['类别3'],
                level4: item['类别4'],
                level5: item['类别5']
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
            this.categoriesMap.set(category.id, category);
        });
    }

    // 根据ID获取书签
    getBookmarkById(id) {
        return this.bookmarksMap.get(id);
    }

    // 根据ID获取分类
    getCategoryById(id) {
        return this.categoriesMap.get(id);
    }

    // 获取分类的完整路径
    getCategoryPath(categoryId) {
        const path = [];
        let currentId = categoryId;
        
        while (currentId) {
            const category = this.getCategoryById(currentId);
            if (!category) break;
            
            path.unshift(category);
            currentId = category.parentId;
        }
        
        return path;
    }

    // 获取分类下的所有书签
    getBookmarksByCategory(categoryId) {
        return this.bookmarks.filter(bookmark => 
            bookmark.categoryId === categoryId);
    }

    // 获取分类下的所有子分类
    getChildrenCategories(parentId) {
        return this.categories.filter(category => 
            category.parentId === parentId);
    }

    // 获取根分类
    getRootCategories() {
        return this.categories.filter(category => 
            category.parentId === null);
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
