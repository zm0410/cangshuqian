/**
 * 数据管理工具脚本
 */

class AdminTool {
    constructor() {
        this.categories = [];
        this.sites = [];
        this.currentTab = 'categories';
        this.init();
    }

    init() {
        this.loadAllData();
        this.bindEvents();
    }

    /**
     * 加载所有数据
     */
    async loadAllData() {
        try {
            await dataManager.loadData();
            this.categories = dataManager.categories;
            this.sites = dataManager.sites;
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
        document.querySelectorAll('.admin-tab').forEach(tab => {
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
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            this.updateThemeIcons();
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    /**
     * 切换标签页
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // 更新标签样式
        document.querySelectorAll('.admin-tab').forEach(tab => {
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
        tbody.innerHTML = '';

        this.categories.forEach(category => {
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
    }

    /**
     * 渲染站点表格
     */
    renderSites() {
        const tbody = document.getElementById('sitesTableBody');
        tbody.innerHTML = '';

        this.sites.forEach(site => {
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
        const name = document.getElementById('categoryName').value;
        const parent = document.getElementById('categoryParent').value;
        const sort = document.getElementById('categorySort').value;

        if (!name) {
            this.showNotification('请输入分类名称', 'error');
            return;
        }

        const category = {
            id: id || 'cat_' + Date.now(),
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
        const title = document.getElementById('siteTitle').value;
        const url = document.getElementById('siteUrl').value;
        const category = document.getElementById('siteCategory').value;
        const visible = document.getElementById('siteVisible').value;
        const icon = document.getElementById('siteIcon').value;
        const sort = document.getElementById('siteSort').value;
        const description = document.getElementById('siteDescription').value;

        if (!title || !url || !category) {
            this.showNotification('请填写必填字段', 'error');
            return;
        }

        const site = {
            id: id || 'site_' + Date.now(),
            title: title,
            url: url,
            category: category,
            visible: visible,
            icon: icon,
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

        this.renderSites();
        document.getElementById('siteModal').style.display = 'none';
        this.showNotification('站点保存成功', 'success');
    }

    /**
     * 删除分类
     */
    deleteCategory(id) {
        if (confirm('确定要删除这个分类吗？')) {
            this.categories = this.categories.filter(c => c.id !== id);
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
            this.renderSites();
            this.showNotification('站点删除成功', 'success');
        }
    }

    /**
     * 执行搜索
     */
    performSearch(keyword) {
        if (!keyword) {
            this.renderCurrentTab();
            return;
        }

        keyword = keyword.toLowerCase().trim();

        if (this.currentTab === 'categories') {
            const filtered = this.categories.filter(cat => 
                cat.name.toLowerCase().includes(keyword) || 
                cat.id.toLowerCase().includes(keyword)
            );
            this.renderFilteredCategories(filtered);
        } else {
            const filtered = this.sites.filter(site => 
                site.title.toLowerCase().includes(keyword) || 
                site.url.toLowerCase().includes(keyword) ||
                site.id.toLowerCase().includes(keyword)
            );
            this.renderFilteredSites(filtered);
        }
    }

    /**
     * 渲染过滤后的分类
     */
    renderFilteredCategories(filteredCategories) {
        const tbody = document.getElementById('categoriesTableBody');
        tbody.innerHTML = '';

        filteredCategories.forEach(category => {
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
    }

    /**
     * 渲染过滤后的站点
     */
    renderFilteredSites(filteredSites) {
        const tbody = document.getElementById('sitesTableBody');
        tbody.innerHTML = '';

        filteredSites.forEach(site => {
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

    /**
     * 更新主题图标
     */
    updateThemeIcons() {
        const themeToggle = document.getElementById('themeToggle');
        if (document.body.classList.contains('dark-mode')) {
            themeToggle.textContent = '☀️';
        } else {
            themeToggle.textContent = '🌙';
        }
    }
}

// 页面加载完成后初始化管理工具
document.addEventListener('DOMContentLoaded', function() {
    window.adminTool = new AdminTool();
});