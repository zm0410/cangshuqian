/**
 * 网站数据管理工具脚本
 */

class DataManagerTool {
    constructor() {
        this.categories = [];
        this.sites = [];
        this.currentTab = 'categories';
        this.filteredCategories = [];
        this.filteredSites = [];
        this.itemsPerPage = 20;
        this.currentPage = 1;
        this.init();
    }

    init() {
        this.loadAllData();
        this.bindEvents();
        this.loadPreferences();
    }

    /**
     * 加载所有数据
     */
    async loadAllData() {
        try {
            await dataManager.loadData();
            this.categories = dataManager.categories;
            this.sites = dataManager.sites;
            
            // 初始化过滤数据
            this.filteredCategories = [...this.categories];
            this.filteredSites = [...this.sites];
            
            this.renderCurrentTab();
            this.populateCategorySelects();
        } catch (error) {
            console.error('数据加载失败:', error);
            this.showNotification('数据加载失败，请检查文件格式', 'error');
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 标签切换
        document.querySelectorAll('.manage-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 添加按钮
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.openCategoryModal();
        });

        document.getElementById('addSiteBtn').addEventListener('click', () => {
            this.openSiteModal();
        });

        // 模态框关闭
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
            document.getElementById('categoryModal').style.display = 'none';
        });

        document.getElementById('cancelSiteBtn').addEventListener('click', () => {
            document.getElementById('siteModal').style.display = 'none';
        });

        // 表单提交
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });

        document.getElementById('siteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSite();
        });

        // 搜索功能
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // 每页显示数量变化
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.savePreferences();
            this.renderCurrentTab();
        });

        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            this.updateTheme();
            this.savePreferences();
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    /**
     * 加载用户偏好设置
     */
    loadPreferences() {
        const savedTheme = localStorage.getItem('manage-theme');
        const savedItemsPerPage = localStorage.getItem('manage-itemsPerPage');
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.updateTheme();
        }
        
        if (savedItemsPerPage) {
            this.itemsPerPage = parseInt(savedItemsPerPage);
            document.getElementById('itemsPerPage').value = savedItemsPerPage;
        }
    }

    /**
     * 保存用户偏好设置
     */
    savePreferences() {
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('manage-theme', 'dark');
        } else {
            localStorage.setItem('manage-theme', 'light');
        }
        
        localStorage.setItem('manage-itemsPerPage', this.itemsPerPage.toString());
    }

    /**
     * 更新主题
     */
    updateTheme() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // 更新元素主题
        document.querySelectorAll('.manage-tab, .manage-content, .data-table th, .data-table td, .modal-content, input, select, textarea, .pagination button').forEach(el => {
            if (isDarkMode) {
                el.classList.add('dark-mode');
            } else {
                el.classList.remove('dark-mode');
            }
        });
        
        // 更新主题图标
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    }

    /**
     * 切换标签页
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        this.currentPage = 1;

        // 更新标签样式
        document.querySelectorAll('.manage-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // 显示对应内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName + '-tab');
        });

        this.renderCurrentTab();
    }

    /**
     * 渲染当前标签页内容
     */
    renderCurrentTab() {
        if (this.currentTab === 'categories') {
            this.renderCategories();
        } else {
            this.renderSites();
        }
    }

    /**
     * 渲染分类表格
     */
    renderCategories() {
        const tbody = document.getElementById('categoriesTableBody');
        const pagination = document.getElementById('categoriesPagination');
        
        // 计算分页
        const totalPages = Math.ceil(this.filteredCategories.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredCategories.length);
        const pageItems = this.filteredCategories.slice(startIndex, endIndex);
        
        // 渲染数据
        tbody.innerHTML = '';
        pageItems.forEach(category => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category.id}</td>
                <td>${category.name}</td>
                <td>${category.parent || ''}</td>
                <td>${category.sort_order || 0}</td>
                <td class="action-buttons">
                    <button class="btn btn-primary edit-btn" data-id="${category.id}">编辑</button>
                    <button class="btn btn-danger delete-btn" data-id="${category.id}">删除</button>
                </td>
            `;
            
            // 添加深色模式类
            if (document.body.classList.contains('dark-mode')) {
                row.querySelectorAll('td').forEach(td => td.classList.add('dark-mode'));
            }
            
            tbody.appendChild(row);
        });

        // 绑定编辑和删除事件
        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.editCategory(id);
            });
        });

        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteCategory(id);
            });
        });

        // 渲染分页
        this.renderPagination(pagination, totalPages, this.currentPage, 'categories');
    }

    /**
     * 渲染站点表格
     */
    renderSites() {
        const tbody = document.getElementById('sitesTableBody');
        const pagination = document.getElementById('sitesPagination');
        
        // 计算分页
        const totalPages = Math.ceil(this.filteredSites.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredSites.length);
        const pageItems = this.filteredSites.slice(startIndex, endIndex);
        
        // 渲染数据
        tbody.innerHTML = '';
        pageItems.forEach(site => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${site.id}</td>
                <td>${site.title}</td>
                <td>${site.url}</td>
                <td>${site.category}</td>
                <td>${site.visible === '1' ? '可见' : '隐藏'}</td>
                <td>${site.sort_order || 0}</td>
                <td class="action-buttons">
                    <button class="btn btn-primary edit-btn" data-id="${site.id}">编辑</button>
                    <button class="btn btn-danger delete-btn" data-id="${site.id}">删除</button>
                </td>
            `;
            
            // 添加深色模式类
            if (document.body.classList.contains('dark-mode')) {
                row.querySelectorAll('td').forEach(td => td.classList.add('dark-mode'));
            }
            
            tbody.appendChild(row);
        });

        // 绑定编辑和删除事件
        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.editSite(id);
            });
        });

        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteSite(id);
            });
        });

        // 渲染分页
        this.renderPagination(pagination, totalPages, this.currentPage, 'sites');
    }

    /**
     * 渲染分页控件
     */
    renderPagination(container, totalPages, currentPage, type) {
        container.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // 上一页按钮
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo;';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                this.currentPage = currentPage - 1;
                this.renderCurrentTab();
            }
        });
        
        if (document.body.classList.contains('dark-mode')) {
            prevButton.classList.add('dark-mode');
        }
        
        container.appendChild(prevButton);
        
        // 页码按钮
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.currentPage = i;
                this.renderCurrentTab();
            });
            
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            
            if (document.body.classList.contains('dark-mode')) {
                pageButton.classList.add('dark-mode');
            }
            
            container.appendChild(pageButton);
        }
        
        // 下一页按钮
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                this.currentPage = currentPage + 1;
                this.renderCurrentTab();
            }
        });
        
        if (document.body.classList.contains('dark-mode')) {
            nextButton.classList.add('dark-mode');
        }
        
        container.appendChild(nextButton);
    }

    /**
     * 填充分类选择框
     */
    populateCategorySelects() {
        const selects = [
            document.getElementById('categoryParent'),
            document.getElementById('siteCategory')
        ];

        selects.forEach(select => {
            // 保存当前选中值
            const currentValue = select.value;
            
            // 清空选项
            select.innerHTML = '<option value="">无</option>';
            
            // 添加所有分类
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
            
            // 恢复选中值
            select.value = currentValue;
        });
    }

    /**
     * 打开分类模态框
     */
    openCategoryModal(category = null) {
        const modal = document.getElementById('categoryModal');
        const title = document.getElementById('categoryModalTitle');
        const form = document.getElementById('categoryForm');

        if (category) {
            // 编辑模式
            title.textContent = '编辑分类';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryParent').value = category.parent || '';
            document.getElementById('categorySort').value = category.sort_order || 0;
        } else {
            // 添加模式
            title.textContent = '添加分类';
            form.reset();
            document.getElementById('categoryId').value = '';
            document.getElementById('categorySort').value = 0;
        }

        modal.style.display = 'flex';
    }

    /**
     * 打开站点模态框
     */
    openSiteModal(site = null) {
        const modal = document.getElementById('siteModal');
        const title = document.getElementById('siteModalTitle');
        const form = document.getElementById('siteForm');

        if (site) {
            // 编辑模式
            title.textContent = '编辑站点';
            document.getElementById('siteId').value = site.id;
            document.getElementById('siteTitle').value = site.title;
            document.getElementById('siteUrl').value = site.url;
            document.getElementById('siteCategory').value = site.category;
            document.getElementById('siteVisible').value = site.visible || '1';
            document.getElementById('siteIcon').value = site.icon || '';
            document.getElementById('siteSort').value = site.sort_order || 0;
            document.getElementById('siteDescription').value = site.description || '';
        } else {
            // 添加模式
            title.textContent = '添加站点';
            form.reset();
            document.getElementById('siteId').value = '';
            document.getElementById('siteVisible').value = '1';
            document.getElementById('siteSort').value = 0;
        }

        modal.style.display = 'flex';
    }

    /**
     * 编辑分类
     */
    editCategory(id) {
        const category = this.categories.find(c => c.id === id);
        if (category) {
            this.openCategoryModal(category);
        }
    }

    /**
     * 编辑站点
     */
    editSite(id) {
        const site = this.sites.find(s => s.id === id);
        if (site) {
            this.openSiteModal(site);
        }
    }

    /**
     * 保存分类
     */
    saveCategory() {
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value.trim();
        const parent = document.getElementById('categoryParent').value;
        const sort = document.getElementById('categorySort').value;

        if (!name) {
            this.showNotification('请输入分类名称', 'error');
            return;
        }

        // 检查名称是否只包含汉字、字母、数字和常见标点
        if (!this.isValidName(name)) {
            this.showNotification('分类名称包含不支持的字符，请只使用汉字、字母、数字和常见标点符号', 'error');
            return;
        }

        const category = {
            id: id || this.generateId('cat'),
            name: name,
            parent: parent || '',
            sort_order: sort
        };

        if (id) {
            // 更新现有分类
            const index = this.categories.findIndex(c => c.id === id);
            if (index !== -1) {
                this.categories[index] = category;
            }
        } else {
            // 添加新分类
            this.categories.push(category);
        }

        // 更新过滤后的数据
        this.filteredCategories = [...this.categories];
        this.currentPage = 1;
        
        this.renderCategories();
        this.populateCategorySelects();
        document.getElementById('categoryModal').style.display = 'none';
        this.showNotification('分类保存成功', 'success');
    }

    /**
     * 保存站点
     */
    saveSite() {
        const id = document.getElementById('siteId').value;
        const title = document.getElementById('siteTitle').value.trim();
        const url = document.getElementById('siteUrl').value.trim();
        const category = document.getElementById('siteCategory').value;
        const visible = document.getElementById('siteVisible').value;
        const icon = document.getElementById('siteIcon').value.trim();
        const sort = document.getElementById('siteSort').value;
        const description = document.getElementById('siteDescription').value.trim();

        if (!title || !url || !category) {
            this.showNotification('请填写必填字段（标题、URL、分类）', 'error');
            return;
        }

        // 验证URL格式
        try {
            new URL(url);
        } catch (e) {
            this.showNotification('请输入有效的URL地址', 'error');
            return;
        }

        if (icon) {
            try {
                new URL(icon);
            } catch (e) {
                this.showNotification('请输入有效的图标URL地址', 'error');
                return;
            }
        }

        const site = {
            id: id || this.generateId('site'),
            title: title,
            url: url,
            category: category,
            visible: visible,
            icon: icon || '',
            sort_order: sort,
            description: description
        };

        if (id) {
            // 更新现有站点
            const index = this.sites.findIndex(s => s.id === id);
            if (index !== -1) {
                this.sites[index] = site;
            }
        } else {
            // 添加新站点
            this.sites.push(site);
        }

        // 更新过滤后的数据
        this.filteredSites = [...this.sites];
        this.currentPage = 1;
        
        this.renderSites();
        document.getElementById('siteModal').style.display = 'none';
        this.showNotification('站点保存成功', 'success');
    }

    /**
     * 删除分类
     */
    deleteCategory(id) {
        if (confirm('确定要删除这个分类吗？\n注意：这不会删除该分类下的站点，但会断开它们的关联。')) {
            this.categories = this.categories.filter(c => c.id !== id);
            
            // 更新过滤后的数据
            this.filteredCategories = [...this.categories];
            this.currentPage = 1;
            
            this.renderCategories();
            this.populateCategorySelects();
            this.showNotification('分类删除成功', 'success');
        }
    }

    /**
     * 删除站点
     */
    deleteSite(id) {
        if (confirm('确定要删除这个站点吗？')) {
            this.sites = this.sites.filter(s => s.id !== id);
            
            // 更新过滤后的数据
            this.filteredSites = [...this.sites];
            this.currentPage = 1;
            
            this.renderSites();
            this.showNotification('站点删除成功', 'success');
        }
    }

    /**
     * 执行搜索
     */
    performSearch() {
        const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
        
        if (!keyword) {
            // 如果搜索关键词为空，恢复所有数据
            this.filteredCategories = [...this.categories];
            this.filteredSites = [...this.sites];
            this.currentPage = 1;
            this.renderCurrentTab();
            return;
        }

        if (this.currentTab === 'categories') {
            this.filteredCategories = this.categories.filter(cat => 
                cat.name.toLowerCase().includes(keyword) || 
                cat.id.toLowerCase().includes(keyword) ||
                (cat.parent && cat.parent.toLowerCase().includes(keyword))
            );
            this.currentPage = 1;
            this.renderCategories();
        } else {
            this.filteredSites = this.sites.filter(site => 
                site.title.toLowerCase().includes(keyword) || 
                site.url.toLowerCase().includes(keyword) ||
                site.id.toLowerCase().includes(keyword) ||
                site.description.toLowerCase().includes(keyword)
            );
            this.currentPage = 1;
            this.renderSites();
        }
    }

    /**
     * 生成唯一ID
     */
    generateId(prefix) {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 验证名称字段（根据用户偏好只保留汉字、字母、数字和常见标点）
     */
    isValidName(name) {
        // 允许汉字、字母、数字、常见标点符号和空格
        return /^[\u4e00-\u9fa5a-zA-Z0-9\s\-\_\(\)\[\]\（\）\【\】\,\.\:\;\!\?\/]*$/.test(name);
    }

    /**
     * 显示通知
     */
    showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification ' + type;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// 页面加载完成后初始化管理工具
document.addEventListener('DOMContentLoaded', function() {
    // 确保dataManager已定义
    if (typeof dataManager === 'undefined') {
        console.error('数据管理器未定义');
        return;
    }
    
    window.dataManagerTool = new DataManagerTool();
});