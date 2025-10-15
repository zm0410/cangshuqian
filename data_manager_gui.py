import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd
import os
import uuid
import re
import json
import pickle
import time
from datetime import datetime
import copy
import subprocess
import threading
import tempfile
import shutil
try:
    from pypinyin import pinyin, Style
except ImportError:
    pinyin = None

DATA_FILES = {
    '分类数据': 'categories.csv',
    '站点数据': 'sites.csv'
}

# 状态文件路径
STATE_FILE = 'app_state.json'
UNDO_FILE = 'undo_stack.pkl'

class DataManagerGUI:
    # ===== 公共辅助 =====
    def _normalize_ids(self):
        if self.categories is not None and hasattr(self.categories, 'empty') and not self.categories.empty:
            self.categories['id'] = self.categories['id'].astype(str)
            if 'parent' in self.categories.columns:
                self.categories['parent'] = self.categories['parent'].fillna('').astype(str)
        if self.sites is not None and hasattr(self.sites, 'empty') and not self.sites.empty and 'category' in self.sites.columns:
            self.sites['category'] = self.sites['category'].fillna('').astype(str)

    def setup_tree_menu(self):
        self.tree_menu = tk.Menu(self.root, tearoff=0)
        self.tree_menu.add_command(label='编辑', command=self.edit_category)
        self.tree_menu.add_command(label='删除', command=self.delete_category)
        self.tree.bind('<Button-3>', self.show_tree_menu)

    def show_tree_menu(self, event):
        item = self.tree.identify_row(event.y)
        if item:
            self.tree.selection_set(item)
            self.tree_menu.post(event.x_root, event.y_root)

    def setup_site_menu(self):
        self.site_menu = tk.Menu(self.root, tearoff=0)
        self.site_menu.add_command(label='编辑', command=self.edit_site)
        self.site_menu.add_command(label='删除', command=self.delete_site)
        self.site_table.bind('<Button-3>', self.show_site_menu)

    def show_site_menu(self, event):
        item = self.site_table.identify_row(event.y)
        if item:
            self.site_table.selection_set(item)
            self.site_menu.post(event.x_root, event.y_root)

    def edit_category(self):
        sel = self.tree.selection()
        if not sel:
            return
        cat_id = sel[0]
        if self.categories is None or not hasattr(self.categories, 'empty') or self.categories.empty:
            return
        cat = self.categories[self.categories['id'] == cat_id]
        if cat.empty:
            return
        columns = list(self.categories.columns)
        values = cat.iloc[0].tolist()
        edit_win = tk.Toplevel(self.root)
        edit_win.title('编辑分类')
        edit_win.geometry('500x400')
        edit_win.transient(self.root)
        edit_win.grab_set()
        entries = []
        tree_selector = None
        
        for i, col in enumerate(columns):
            frame = tk.Frame(edit_win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=f'{col}:', width=15, anchor='w').pack(side=tk.LEFT)
            
            if col == 'parent':
                tree_selector = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree_selector, select_id=values[i])
                tree_selector.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(tree_selector)
            else:
                entry_frame = tk.Frame(frame)
                entry_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                entry = tk.Entry(entry_frame)
                entry.insert(0, str(values[i]) if values[i] is not None else '')
                entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                # 为ID字段添加自动生成按钮
                if col == 'id':
                    def make_generate_id(id_entry, cat_id):
                        def generate_id():
                            # 找到name字段的索引
                            name_index = columns.index('name') if 'name' in columns else -1
                            if name_index >= 0:
                                name = entries[name_index].get().strip()
                                if name:
                                    base_id = self.generate_pinyin_id(name)
                                    existing_ids = set(self.categories['id'].tolist()) if not self.categories.empty else set()
                                    existing_ids.discard(cat_id)  # 排除当前编辑的分类ID
                                    unique_id = self.ensure_unique_id(base_id, existing_ids, 'cat')
                                    id_entry.delete(0, tk.END)
                                    id_entry.insert(0, unique_id)
                                else:
                                    messagebox.showwarning('提示', '请先输入分类名称')
                            else:
                                messagebox.showwarning('提示', '找不到分类名称字段')
                        return generate_id
                    
                    tk.Button(entry_frame, text='生成', command=make_generate_id(entry, cat_id), bg='#ff9800', fg='white', width=6).pack(side=tk.RIGHT, padx=(5,0))
                
                entries.append(entry)
        
        # 按钮区域
        btn_frame = tk.Frame(edit_win)
        btn_frame.pack(fill=tk.X, padx=10, pady=20)
        
        def on_save():
            new_vals = []
            for i, col in enumerate(columns):
                if col == 'parent':
                    sel = entries[i].selection()
                    new_vals.append(sel[0] if sel else '')
                else:
                    new_vals.append(entries[i].get())
            
            # 检查ID唯一性（如果ID被修改了）
            new_id = new_vals[columns.index('id')] if 'id' in columns else cat_id
            if new_id != cat_id and not self.categories.empty and new_id in self.categories['id'].values:
                messagebox.showwarning('警告', 'ID已存在，请使用其他ID')
                return
            
            for i, col in enumerate(columns):
                self.categories.loc[self.categories['id'] == cat_id, col] = new_vals[i]
            
            # 重置标准化状态
            self.reset_data_normalization()
            
            # 智能刷新：分类编辑主要影响树形结构
            self.refresh_ui(tree_only=True)
            edit_win.destroy()
        
        tk.Button(btn_frame, text='取消', command=edit_win.destroy).pack(side=tk.RIGHT, padx=5)
        tk.Button(btn_frame, text='保存', command=on_save, bg='#2196f3', fg='white').pack(side=tk.RIGHT)

    def delete_category(self):
        sel = self.tree.selection()
        if not sel:
            print("DEBUG: 没有选择任何分类")
            return
        cat_id = sel[0]
        print(f"DEBUG: 选中的分类ID: {cat_id}")
        
        # 获取分类名称用于确认对话框
        cat_name = "未知分类"
        try:
            print(f"DEBUG: 数据框中的ID类型: {self.categories['id'].dtype}")
            print(f"DEBUG: 选中的ID类型: {type(cat_id)}")
            cat_row = self.categories[self.categories['id'].astype(str) == str(cat_id)]
            print(f"DEBUG: 找到的行数: {len(cat_row)}")
            if not cat_row.empty:
                cat_name = cat_row.iloc[0]['name']
                print(f"DEBUG: 分类名称: {cat_name}")
        except Exception as e:
            print(f"DEBUG: 获取分类名称时出错: {e}")
            pass
        
        # 获取所有子分类id
        all_ids = self.get_all_subcats(cat_id)
        print(f"DEBUG: 需要删除的所有ID: {all_ids}")
        
        # 获取将要删除的站点数量
        sites_to_delete = 0
        if not self.sites.empty and 'category' in self.sites.columns:
            sites_to_delete = len(self.sites[self.sites['category'].astype(str).isin(all_ids)])
            print(f"DEBUG: 将要删除的站点数量: {sites_to_delete}")
        
        # 显示确认对话框
        confirm_msg = f"确定要删除分类「{cat_name}」吗？\n\n"
        if len(all_ids) > 1:
            confirm_msg += f"此操作将同时删除该分类及其 {len(all_ids)-1} 个子分类，\n"
        else:
            confirm_msg += "此操作将删除该分类，\n"
        
        if sites_to_delete > 0:
            confirm_msg += f"以及这些分类下的 {sites_to_delete} 个站点。\n\n此操作不可恢复！"
        else:
            confirm_msg += "这些分类下没有站点。\n\n此操作不可恢复！"
        
        if not messagebox.askyesno("确认删除", confirm_msg):
            print("DEBUG: 用户取消了删除操作")
            return
        
        # 保存撤销状态
        self.save_undo_state()
        print("DEBUG: 撤销状态已保存")
        
        # 确保数据类型一致（优化：避免重复转换）
        self.normalize_data_types()
        
        print(f"DEBUG: 删除前分类数量: {len(self.categories)}")
        print(f"DEBUG: 删除前站点数量: {len(self.sites)}")
        
        # 删除分类（优化：已标准化，无需重复转换）
        self.categories = self.categories[~self.categories['id'].isin(all_ids)]
        print(f"DEBUG: 删除后分类数量: {len(self.categories)}")
        
        # 删除相关站点（优化：已标准化，无需重复转换）
        self.sites = self.sites[~self.sites['category'].isin(all_ids)]
        print(f"DEBUG: 删除后站点数量: {len(self.sites)}")
        
        # 重置标准化状态
        self.reset_data_normalization()
        
        # 显示成功消息
        success_msg = f"已成功删除分类「{cat_name}」"
        if len(all_ids) > 1:
            success_msg += f"及其 {len(all_ids)-1} 个子分类"
        if sites_to_delete > 0:
            success_msg += f"和 {sites_to_delete} 个站点"
        messagebox.showinfo("删除成功", success_msg)
        
        print("DEBUG: 刷新树形控件和站点列表")
        self.show_tree()
        self.show_sites()

    def edit_site(self):
        sel = self.site_table.selection()
        if not sel:
            return
        try:
            idx = int(sel[0])
        except Exception:
            return
        site = self.sites.loc[idx]
        columns = list(self.sites.columns)
        values = site.tolist()
        edit_win = tk.Toplevel(self.root)
        edit_win.title('编辑站点')
        edit_win.geometry('500x500')
        edit_win.transient(self.root)
        edit_win.grab_set()
        entries = []
        tree_selector = None
        
        # 获取当前站点的ID，用于ID唯一性检查
        current_site_id = site['id'] if 'id' in site else None
        
        for i, col in enumerate(columns):
            frame = tk.Frame(edit_win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=f'{col}:', width=15, anchor='w').pack(side=tk.LEFT)
            
            if col == 'category':
                tree_selector = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree_selector, select_id=values[i])
                tree_selector.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(tree_selector)
            elif col == 'description':
                text_widget = tk.Text(frame, height=3, wrap=tk.WORD)
                text_widget.insert('1.0', str(values[i]) if values[i] is not None else '')
                text_widget.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(text_widget)
            elif col == 'visible':
                combo_widget = ttk.Combobox(frame, values=['1', '0'], state='readonly')
                combo_widget.set(str(values[i]) if values[i] is not None else '1')
                combo_widget.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(combo_widget)
            else:
                entry_frame = tk.Frame(frame)
                entry_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                entry = tk.Entry(entry_frame)
                entry.insert(0, str(values[i]) if values[i] is not None else '')
                entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                # 为ID字段添加自动生成按钮
                if col == 'id':
                    def make_generate_id(id_entry, current_id):
                        def generate_id():
                            # 找到title字段的索引
                            title_index = columns.index('title') if 'title' in columns else -1
                            if title_index >= 0:
                                title_entry = entries[title_index]
                                if hasattr(title_entry, 'get'):
                                    title = title_entry.get().strip()
                                    if title:
                                        base_id = self.generate_pinyin_id(title)
                                        existing_ids = set(self.sites['id'].tolist()) if not self.sites.empty else set()
                                        existing_ids.discard(current_id)  # 排除当前编辑的站点ID
                                        unique_id = self.ensure_unique_id(base_id, existing_ids, 'site')
                                        id_entry.delete(0, tk.END)
                                        id_entry.insert(0, unique_id)
                                    else:
                                        messagebox.showwarning('提示', '请先输入站点标题')
                                else:
                                    messagebox.showwarning('提示', '无法获取站点标题')
                            else:
                                messagebox.showwarning('提示', '找不到站点标题字段')
                        return generate_id
                    
                    tk.Button(entry_frame, text='生成', command=make_generate_id(entry, current_site_id), bg='#ff9800', fg='white', width=6).pack(side=tk.RIGHT, padx=(5,0))
                
                entries.append(entry)
        
        # 按钮区域
        btn_frame = tk.Frame(edit_win)
        btn_frame.pack(fill=tk.X, padx=10, pady=20)
        
        def on_save():
            new_vals = []
            for i, col in enumerate(columns):
                if col == 'category':
                    sel = entries[i].selection()
                    new_vals.append(sel[0] if sel else '')
                elif col == 'description':
                    new_vals.append(entries[i].get('1.0', tk.END).strip())
                elif col == 'visible':
                    new_vals.append(entries[i].get())
                else:
                    new_vals.append(entries[i].get())
            
            # 检查ID唯一性（如果ID被修改了）
            new_id = new_vals[columns.index('id')] if 'id' in columns else current_site_id
            if new_id != current_site_id and not self.sites.empty and new_id in self.sites['id'].values:
                messagebox.showwarning('警告', 'ID已存在，请使用其他ID')
                return
            
            for i, col in enumerate(columns):
                self.sites.loc[idx, col] = new_vals[i]
            
            # 重置标准化状态
            self.reset_data_normalization()
            
            # 智能刷新：站点编辑主要影响站点列表
            self.refresh_ui(sites_only=True)
            edit_win.destroy()
        
        tk.Button(btn_frame, text='取消', command=edit_win.destroy).pack(side=tk.RIGHT, padx=5)
        tk.Button(btn_frame, text='保存', command=on_save, bg='#2196f3', fg='white').pack(side=tk.RIGHT)

    def delete_site(self):
        sel = self.site_table.selection()
        if not sel:
            return
        try:
            idxs = [int(i) for i in sel]
        except Exception:
            return
        
        # 获取站点名称用于确认对话框
        site_names = []
        # 获取第一个站点的分类ID，用于删除后刷新
        first_site_category = None
        try:
            for idx in idxs:
                if idx < len(self.sites):
                    site_name = self.sites.iloc[idx]['title'] if 'title' in self.sites.columns else f"站点#{idx+1}"
                    site_names.append(site_name)
                    # 获取第一个站点的分类ID
                    if first_site_category is None and 'category' in self.sites.columns:
                        first_site_category = str(self.sites.iloc[idx]['category'])
        except:
            site_names = [f"站点#{i+1}" for i in range(len(idxs))]
        
        # 显示确认对话框
        if len(idxs) == 1:
            confirm_msg = f"确定要删除站点「{site_names[0]}」吗？\n\n此操作不可恢复！"
        else:
            confirm_msg = f"确定要删除选中的 {len(idxs)} 个站点吗？\n\n此操作不可恢复！"
        
        if not messagebox.askyesno("确认删除", confirm_msg):
            return
        
        # 保存撤销状态
        self.save_undo_state()
        
        # 删除站点
        self.sites.drop(index=idxs, inplace=True, errors='ignore')
        self.sites.reset_index(drop=True, inplace=True)
        
        # 显示成功消息

        if len(idxs) == 1:
            success_msg = f"已成功删除站点「{site_names[0]}」"
        else:
            success_msg = f"已成功删除 {len(idxs)} 个站点"
        messagebox.showinfo("删除成功", success_msg)
        
        # 刷新站点列表 - 如果有分类ID则刷新该分类的站点，否则刷新当前显示的站点
        if first_site_category:
            # 刷新该分类的站点列表
            self.show_sites(filter_cat=first_site_category)
        else:
            # 获取当前选中的分类（如果有）
            current_selection = self.tree.selection()
            if current_selection:
                self.show_sites(filter_cat=current_selection[0])
            else:
                self.show_sites()
    def __init__(self, root):
        self.root = root
        self.root.title('CSV数据管理器')
        self.root.geometry('1200x700')
        
        # 设置窗口图标
        try:
            icon_path = os.path.join(os.path.dirname(__file__), 'app_icon.ico')
            if os.path.exists(icon_path):
                self.root.iconbitmap(icon_path)
        except Exception as e:
            print(f"设置图标失败: {e}")
        
        self.categories = None
        self.sites = None
        
        # 自动保存相关属性
        self.auto_save_enabled = True
        self.unsaved_changes = False
        self.last_save_time = None
        
        # 撤销重做相关属性
        self.undo_stack = []
        self.redo_stack = []
        self.max_undo_steps = 50
        
        # 性能优化相关属性
        self._data_normalized = False
        self._categories_indexed = False
        self._sites_indexed = False
        
        # 加载应用状态
        self.load_app_state()
        
        # 设置窗口关闭事件
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # 设置自动保存定时器
        self.setup_auto_save()
        
        self.create_widgets()

    def normalize_data_types(self):
        """统一标准化数据类型，避免重复转换"""
        if self._data_normalized:
            return
            
        if self.categories is not None and not self.categories.empty:
            self.categories['id'] = self.categories['id'].astype(str)
            self.categories['parent'] = self.categories['parent'].fillna('').astype(str)
            
        if self.sites is not None and not self.sites.empty:
            # 清理多余的空列
            if 'name' in self.sites.columns and self.sites['name'].isna().all():
                self.sites = self.sites.drop(columns=['name'])
                print("已清理站点数据中的空白name列")
            
            if 'category' in self.sites.columns:
                self.sites['category'] = self.sites['category'].fillna('').astype(str)
            
        self._data_normalized = True

    def reset_data_normalization(self):
        """重置数据标准化状态，在数据发生变化时调用"""
        self._data_normalized = False

    def refresh_ui(self, tree_only=False, sites_only=False):
        """智能UI刷新，避免不必要的重绘"""
        if tree_only:
            self.show_tree()
        elif sites_only:
            self.show_sites()
        else:
            self.show_tree()
            self.show_sites()

    # 界面布局美化
    def create_widgets(self):
        # 顶部操作区
        top_frame = tk.Frame(self.root, bg='#f8f8f8', bd=1, relief=tk.GROOVE)
        top_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # 顶部操作区 - 查找功能放在最前面
        tk.Label(top_frame, text='搜索:', bg='#f8f8f8').pack(side=tk.LEFT, padx=5)
        self.search_entry = tk.Entry(top_frame, width=20)
        self.search_entry.pack(side=tk.LEFT, padx=2)
        
        tk.Button(top_frame, text='搜索', command=self.search_sites, bg='#ff5722', fg='white').pack(side=tk.LEFT, padx=5)
        tk.Button(top_frame, text='清除', command=self.clear_search, bg='#9e9e9e', fg='white').pack(side=tk.LEFT, padx=2)
        
        # 绑定回车键搜索
        self.search_entry.bind('<Return>', lambda e: self.search_sites())
        
        # 分隔线
        ttk.Separator(top_frame, orient='vertical').pack(side=tk.LEFT, fill=tk.Y, padx=10, pady=5)
        
        # 标题
        tk.Label(top_frame, text='数据管理工具', font=('微软雅黑', 14, 'bold'), bg='#f8f8f8').pack(side=tk.LEFT, padx=10)
        
        # 操作按钮区 - 重新设计为分组布局
        btn_container = tk.Frame(top_frame, bg='#f8f8f8')
        btn_container.pack(side=tk.LEFT, padx=10)
        
        # 文件操作组
        file_group = tk.LabelFrame(btn_container, text='文件操作', bg='#f8f8f8', relief=tk.GROOVE, bd=1, 
                                  font=('微软雅黑', 8))
        file_group.pack(side=tk.LEFT, padx=2, pady=2)
        
        file_frame = tk.Frame(file_group, bg='#f8f8f8')
        file_frame.pack(padx=3, pady=2)
        
        tk.Button(file_frame, text='新建项目', command=self.create_new_project, 
                 bg='#4caf50', fg='white', font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        tk.Button(file_frame, text='新建文件', command=self.create_new_site_file, 
                 bg='#2196f3', fg='white', font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        tk.Button(file_frame, text='保存所有', command=self.save_all, 
                 bg='#9c27b0', fg='white', font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        
        # 编辑操作组  
        edit_group = tk.LabelFrame(btn_container, text='编辑操作', bg='#f8f8f8', relief=tk.GROOVE, bd=1,
                                  font=('微软雅黑', 8))
        edit_group.pack(side=tk.LEFT, padx=2, pady=2)
        
        edit_frame = tk.Frame(edit_group, bg='#f8f8f8')
        edit_frame.pack(padx=3, pady=2)
        
        tk.Button(edit_frame, text='撤销', command=self.undo, 
                 bg='#607d8b', fg='white', font=('微软雅黑', 8), width=6).pack(side=tk.LEFT, padx=1)
        tk.Button(edit_frame, text='重做', command=self.redo, 
                 bg='#607d8b', fg='white', font=('微软雅黑', 8), width=6).pack(side=tk.LEFT, padx=1)
        tk.Button(edit_frame, text='新增分类', command=self.add_category, 
                 bg='#8bc34a', fg='white', font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        tk.Button(edit_frame, text='新增站点', command=self.add_site, 
                 bg='#03a9f4', fg='white', font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        
        # 数据操作组
        data_group = tk.LabelFrame(btn_container, text='数据操作', bg='#f8f8f8', relief=tk.GROOVE, bd=1,
                                  font=('微软雅黑', 8))
        data_group.pack(side=tk.LEFT, padx=2, pady=2)
        
        data_frame1 = tk.Frame(data_group, bg='#f8f8f8')
        data_frame1.pack(padx=3, pady=1)
        data_frame2 = tk.Frame(data_group, bg='#f8f8f8')
        data_frame2.pack(padx=3, pady=1)
        
        # 第一行：导入导出
        tk.Button(data_frame1, text='导入分类', command=lambda: self.import_csv('categories'), 
                 font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        tk.Button(data_frame1, text='导入站点', command=lambda: self.import_csv('sites'), 
                 font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        tk.Button(data_frame1, text='导出分类', command=lambda: self.export_csv('categories'), 
                 font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        tk.Button(data_frame1, text='导出站点', command=lambda: self.export_csv('sites'), 
                 font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        
        # 第二行：工具功能
        tk.Button(data_frame2, text='生成ID', command=self.generate_all_ids, 
                 bg='#ff9800', fg='white', font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        tk.Button(data_frame2, text='推送Git', command=self.push_to_github, 
                 bg='#333', fg='white', font=('微软雅黑', 8), width=8).pack(side=tk.LEFT, padx=1)
        auto_save_frame = tk.Frame(top_frame, bg='#f8f8f8')
        auto_save_frame.pack(side=tk.RIGHT, padx=10)
        self.auto_save_var = tk.StringVar(value='自动保存: 开启' if self.auto_save_enabled else '自动保存: 关闭')
        auto_save_label = tk.Label(auto_save_frame, textvariable=self.auto_save_var, bg='#f8f8f8', fg='#666')
        auto_save_label.pack(side=tk.LEFT, padx=5)
        def toggle_auto_save():
            self.auto_save_enabled = not self.auto_save_enabled
            self.auto_save_var.set('自动保存: 开启' if self.auto_save_enabled else '自动保存: 关闭')
        tk.Button(auto_save_frame, text='切换', command=toggle_auto_save, bg='#9e9e9e', fg='white').pack(side=tk.LEFT, padx=2)

        # 主体分栏
        main_pane = tk.PanedWindow(self.root, sashrelief=tk.RAISED, bg='#e0e0e0')
        main_pane.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # 左侧分类树
        left_frame = tk.Frame(main_pane, bd=2, relief=tk.GROOVE)
        tk.Label(left_frame, text='分类目录树', font=('微软雅黑', 12, 'bold')).pack(anchor='w', pady=5)
        self.tree = ttk.Treeview(left_frame, show='tree')
        self.tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        # 高亮标签（用于"内部"放置时的行背景突出）
        try:
            self.tree.tag_configure('hover', background='#ffe58f')  # 柔和黄底
        except Exception:
            pass
        self.tree.bind('<<TreeviewSelect>>', self.on_tree_select)
        main_pane.add(left_frame, minsize=300)

        # 右侧站点表格
        right_frame = tk.Frame(main_pane, bd=2, relief=tk.GROOVE)
        tk.Label(right_frame, text='站点列表', font=('微软雅黑', 12, 'bold')).pack(anchor='w', pady=5)
        self.site_table = ttk.Treeview(right_frame, show='headings', selectmode='extended')
        self.site_table.pack(fill=tk.BOTH, expand=True, side=tk.LEFT, padx=5, pady=5)
        self.site_scroll = ttk.Scrollbar(right_frame, orient='vertical', command=self.site_table.yview)
        self.site_table.configure(yscrollcommand=self.site_scroll.set)
        self.site_scroll.pack(fill=tk.Y, side=tk.RIGHT)
        self.site_table.bind('<Double-1>', self.edit_site_cell)
        main_pane.add(right_frame)

        # 加载数据
        self.load_all()
        self.show_tree()
        self.show_sites()
        self.setup_tree_menu()
        self.setup_site_menu()
        self.setup_tree_drag()

        # 状态栏用于提示拖拽位置等信息
        self.status_var = tk.StringVar(value='就绪')
        _status = tk.Label(self.root, textvariable=self.status_var, anchor='w', bd=1, relief=tk.SUNKEN)
        _status.pack(fill=tk.X, side=tk.BOTTOM)
        
        # 绑定键盘快捷键
        self.root.bind('<Control-z>', lambda e: self.undo())
        self.root.bind('<Control-y>', lambda e: self.redo())
        self.root.bind('<Control-s>', lambda e: self.save_all())
        
        # 初始保存撤销状态
        self.save_undo_state()

    def load_all(self):
        """加载分类和站点数据"""
        try:
            self.categories = pd.read_csv(DATA_FILES['分类数据']) if os.path.exists(DATA_FILES['分类数据']) else pd.DataFrame()
            self.sites = pd.read_csv(DATA_FILES['站点数据']) if os.path.exists(DATA_FILES['站点数据']) else pd.DataFrame()
            
            # 标准化数据类型（一次性处理）
            self.normalize_data_types()
            self._normalize_ids()
            
            # 初始保存撤销状态
            self.save_undo_state()
            
        except Exception as e:
            messagebox.showerror("加载失败", f"加载数据失败: {e}")
            self.categories = pd.DataFrame()
            self.sites = pd.DataFrame()
            self.reset_data_normalization()

    def save_all(self, silent=False):
        """保存所有数据"""
        try:
            self.categories.to_csv(DATA_FILES['分类数据'], index=False)
            self.sites.to_csv(DATA_FILES['站点数据'], index=False)
            
            if not silent:
                messagebox.showinfo('保存成功', '所有数据已保存')
            
            self.unsaved_changes = False
            self.last_save_time = datetime.now()
            
        except Exception as e:
            if not silent:
                messagebox.showerror('保存失败', f'保存数据失败: {e}')

    def setup_auto_save(self):
        """设置自动保存定时器"""
        def auto_save():
            if self.auto_save_enabled and self.unsaved_changes:
                self.auto_save()
            self.root.after(30000, auto_save)  # 每30秒检查一次
        
        self.root.after(30000, auto_save)

    def auto_save(self):
        """自动保存数据"""
        try:
            self.save_all(silent=True)
            self.unsaved_changes = False
            self.last_save_time = datetime.now()
        except Exception as e:
            print(f"自动保存失败: {e}")

    def save_app_state(self):
        """保存应用程序状态"""
        try:
            state = {
                'window_geometry': self.root.geometry(),
                'last_open_time': datetime.now().isoformat(),
                'auto_save_enabled': self.auto_save_enabled
            }
            with open(STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存应用状态失败: {e}")

    def load_app_state(self):
        """加载应用程序状态"""
        try:
            if os.path.exists(STATE_FILE):
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                
                # 恢复窗口位置和大小
                if 'window_geometry' in state:
                    self.root.geometry(state['window_geometry'])
                
                # 恢复自动保存设置
                if 'auto_save_enabled' in state:
                    self.auto_save_enabled = state['auto_save_enabled']
                
                print("应用状态已恢复")
        except Exception as e:
            print(f"加载应用状态失败: {e}")

    def save_undo_state(self):
        """保存当前状态到撤销栈"""
        try:
            # 深拷贝当前数据状态
            undo_state = {
                'categories': copy.deepcopy(self.categories) if self.categories is not None else None,
                'sites': copy.deepcopy(self.sites) if self.sites is not None else None,
                'timestamp': datetime.now().isoformat()
            }
            
            # 添加到撤销栈
            self.undo_stack.append(undo_state)
            
            # 限制栈大小
            if len(self.undo_stack) > self.max_undo_steps:
                self.undo_stack.pop(0)
            
            # 清空重做栈
            self.redo_stack.clear()
            
            # 标记有未保存的更改
            self.unsaved_changes = True
            
        except Exception as e:
            print(f"保存撤销状态失败: {e}")

    def undo(self):
        """撤销操作"""
        if len(self.undo_stack) > 1:  # 至少保留一个状态
            # 当前状态移到重做栈
            current_state = self.undo_stack.pop()
            self.redo_stack.append(current_state)
            
            # 恢复到上一个状态
            prev_state = self.undo_stack[-1]
            self.categories = copy.deepcopy(prev_state['categories'])
            self.sites = copy.deepcopy(prev_state['sites'])
            
            # 刷新显示
            self.show_tree()
            self.show_sites()
            
            # 标记有未保存的更改
            self.unsaved_changes = True
            
            print("撤销操作完成")
        else:
            messagebox.showinfo("提示", "没有可撤销的操作")

    def redo(self):
        """重做操作"""
        if self.redo_stack:
            # 从重做栈恢复状态
            redo_state = self.redo_stack.pop()
            self.undo_stack.append(redo_state)
            
            # 应用重做的状态
            self.categories = copy.deepcopy(redo_state['categories'])
            self.sites = copy.deepcopy(redo_state['sites'])
            
            # 刷新显示
            self.show_tree()
            self.show_sites()
            
            # 标记有未保存的更改
            self.unsaved_changes = True
            
            print("重做操作完成")
        else:
            messagebox.showinfo("提示", "没有可重做的操作")

    def on_closing(self):
        """窗口关闭事件处理"""
        if self.unsaved_changes:
            result = messagebox.askyesnocancel("保存更改", "有未保存的更改，是否保存？")
            if result is None:  # 取消
                return
            elif result:  # 是
                self.save_all()
        
        # 保存应用状态
        self.save_app_state()
        
        # 关闭窗口
        self.root.destroy()

    # 界面布局美化
    def load_all(self):
        # 加载分类和站点数据
        self.categories = pd.read_csv(DATA_FILES['分类数据']) if os.path.exists(DATA_FILES['分类数据']) else pd.DataFrame()
        self.sites = pd.read_csv(DATA_FILES['站点数据']) if os.path.exists(DATA_FILES['站点数据']) else pd.DataFrame()
        self._normalize_ids()

    def show_tree(self):
        # 清理树
        for i in self.tree.get_children():
            self.tree.delete(i)
        if self.categories is None or self.categories.empty:
            return
        # 构建树结构
        cats = self.categories.copy()
        cats['parent'] = cats['parent'].fillna('')
        def add_node(parent_id, tree_parent):
            children = cats[cats['parent'] == parent_id]
            for _, row in children.iterrows():
                node_id = str(row['id'])
                node = self.tree.insert(tree_parent, 'end', iid=node_id, text=str(row.get('name', node_id)))
                add_node(node_id, node)
        add_node('', '')
        self.tree.expand_all = lambda: [self.tree.item(i, open=True) for i in self.tree.get_children('')]
        self.tree.expand_all()

    def _fill_tree_selector(self, tree_widget, select_id=None):
        """填充分类选择器树形控件"""
        # 清理树
        for i in tree_widget.get_children():
            tree_widget.delete(i)
        
        if self.categories is None or self.categories.empty:
            return
            
        # 构建树结构
        cats = self.categories.copy()
        cats['parent'] = cats['parent'].fillna('')
        
        def add_node(parent_id, tree_parent):
            children = cats[cats['parent'] == parent_id]
            for _, row in children.iterrows():
                node_id = str(row['id'])
                node = tree_widget.insert(tree_parent, 'end', iid=node_id, text=str(row.get('name', node_id)))
                # 如果这是要选中的节点，设置选中状态
                if select_id and node_id == str(select_id):
                    tree_widget.selection_set(node_id)
                add_node(node_id, node)
        
        add_node('', '')
        # 展开所有节点
        def expand_all_nodes(parent=''):
            for child in tree_widget.get_children(parent):
                tree_widget.item(child, open=True)
                expand_all_nodes(child)
        expand_all_nodes()

    def search_sites(self):
        """搜索站点功能 - 优化版本"""
        search_text = self.search_entry.get().strip()
        if not search_text:
            messagebox.showwarning('搜索提示', '请输入搜索内容')
            return
        
        if self.sites is None or self.sites.empty:
            messagebox.showinfo('搜索提示', '没有站点数据')
            return
        
        try:
            # 确保数据类型标准化
            self.normalize_data_types()
            
            # 预编译正则表达式以提高性能
            import re
            pattern = re.compile(re.escape(search_text), re.IGNORECASE)
            
            # 在所有主要字段中搜索
            search_fields = ['title', 'url', 'description']
            filtered_sites = self.sites.copy()
            
            # 使用向量化操作进行搜索
            mask = pd.Series([False] * len(filtered_sites))
            
            for field in search_fields:
                if field in filtered_sites.columns:
                    # 优化：使用字符串方法而非正则表达式（更快）
                    field_mask = filtered_sites[field].astype(str).str.contains(search_text, case=False, na=False, regex=False)
                    mask = mask | field_mask
            
            # 应用掩码过滤数据
            filtered_sites = filtered_sites[mask]
            
        except Exception as e:
            messagebox.showerror('搜索错误', f'搜索时发生错误: {e}')
            return
        
        if filtered_sites.empty:
            messagebox.showinfo('搜索结果', f'未找到包含"{search_text}"的站点')
            return
        
        # 显示搜索结果
        self.site_table.delete(*self.site_table.get_children())
        columns = list(filtered_sites.columns)
        self.site_table['columns'] = columns
        for col in columns:
            self.site_table.heading(col, text=col)
            self.site_table.column(col, width=120)
        
        for idx, row in filtered_sites.iterrows():
            self.site_table.insert('', 'end', iid=str(idx), values=list(row))
        
        # 更新状态栏
        self.status_var.set(f'搜索"{search_text}"找到 {len(filtered_sites)} 个站点')

    def clear_search(self):
        """清除搜索"""
        self.search_entry.delete(0, tk.END)
        # 重新显示当前分类的站点
        selection = self.tree.selection()
        if selection:
            selected_cat = selection[0]
            self.show_sites(filter_cat=selected_cat)
        else:
            self.show_sites()
        self.status_var.set('搜索已清除')

    def show_sites(self, filter_cat=None):
        """显示站点数据"""
        self.site_table.delete(*self.site_table.get_children())
        if self.sites is None or self.sites.empty:
            return
        columns = list(self.sites.columns)
        self.site_table['columns'] = columns
        for col in columns:
            self.site_table.heading(col, text=col)
            self.site_table.column(col, width=120)
        # 过滤
        df = self.sites.copy()
        if filter_cat:
            # 只显示当前选中分类的站点，不包含子分类
            if 'category' in df.columns:
                df['category'] = df['category'].astype(str)
                df = df[df['category'] == str(filter_cat)]
        else:
            # 不选择任何分类时，不显示任何站点
            df = pd.DataFrame(columns=df.columns)
        for idx, row in df.iterrows():
            self.site_table.insert('', 'end', iid=str(idx), values=list(row))

    def on_tree_select(self, event):
        """处理树形控件选择事件"""
        selection = self.tree.selection()
        if selection:
            selected_cat = selection[0]
            self.show_sites(filter_cat=selected_cat)
        else:
            self.show_sites()

    def get_all_subcats(self, cat_id):
        # 获取所有子分类id（含自身）
        cat_id = str(cat_id)
        ids = [cat_id]
        print(f"DEBUG get_all_subcats: 输入cat_id={cat_id}")
        print(f"DEBUG get_all_subcats: categories数据框形状={self.categories.shape}")
        print(f"DEBUG get_all_subcats: categories列名={list(self.categories.columns)}")
        print(f"DEBUG get_all_subcats: categories前5行数据:")
        print(self.categories.head())
        print(f"DEBUG get_all_subcats: 查找parent='{cat_id}'的记录:")
        matching_parents = self.categories[self.categories['parent'].astype(str) == cat_id]
        print(f"DEBUG get_all_subcats: 匹配到的记录数={len(matching_parents)}")
        if len(matching_parents) > 0:
            print(f"DEBUG get_all_subcats: 匹配的子分类ID={matching_parents['id'].tolist()}")
        
        def find_children(pid):
            print(f"DEBUG find_children: 查找pid={pid}的子分类")
            # 确保parent列也是字符串类型
            children = self.categories[self.categories['parent'].astype(str) == str(pid)]['id'].astype(str).tolist()
            print(f"DEBUG find_children: 找到的子分类={children}")
            for cid in children:
                ids.append(cid)
                find_children(cid)
        
        find_children(cat_id)
        print(f"DEBUG get_all_subcats: 最终返回的ids={ids}")
        return ids

    def edit_site_cell(self, event):
        item = self.site_table.selection()[0]
        column = self.site_table.identify_column(event.x)
        
        if column == '#1':  # 名称列
            self.edit_site(int(item))
        elif column == '#2':  # URL列
            # 直接编辑URL
            site_index = int(item)
            old_url = self.sites.iloc[site_index]['url']
            
            dialog = tk.Toplevel(self.root)
            dialog.title('编辑URL')
            dialog.geometry('300x150')
            dialog.transient(self.root)
            dialog.grab_set()
            
            tk.Label(dialog, text='站点URL:').pack(pady=10)
            url_entry = tk.Entry(dialog, width=40)
            url_entry.insert(0, old_url)
            url_entry.pack(pady=10)
            
            def on_save():
                new_url = url_entry.get().strip()
                if not new_url:
                    messagebox.showwarning('输入错误', '站点URL不能为空')
                    return
                
                # 保存撤销状态
                self.save_undo_state()
                
                self.sites.iloc[site_index, self.sites.columns.get_loc('url')] = new_url
                self.show_sites()
                dialog.destroy()
                messagebox.showinfo('成功', 'URL已更新')
            
            tk.Button(dialog, text='保存', command=on_save, bg='#4caf50', fg='white').pack(pady=10)
            url_entry.focus()

    def generate_pinyin_id(self, name):
        """根据名称生成拼音ID"""
        if not name or pd.isna(name):
            return f"unknown_{int(time.time() * 1000) % 10000}"
        
        name = str(name).strip()
        if not name:
            return f"empty_{int(time.time() * 1000) % 10000}"
        
        # 如果是纯英文，直接使用（转小写，替换特殊字符）
        if name.encode('utf-8').isascii():
            result = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
            return result if result else f"ascii_{int(time.time() * 1000) % 10000}"
        
        # 处理中文：最后一个汉字用全拼，其余用首字母
        if pinyin is None:
            # 如果没有pypinyin，使用简化方案
            result = re.sub(r'[^\w]', '', name.lower())
            return result if result else f"nopinyin_{int(time.time() * 1000) % 10000}"
        
        # 分离中文字符
        chinese_chars = []
        other_chars = []
        
        for char in name:
            if '\u4e00' <= char <= '\u9fff':  # 中文字符范围
                chinese_chars.append(char)
            elif char.isalnum():  # 字母数字
                other_chars.append(char.lower())
        
        if not chinese_chars and not other_chars:
            return f"special_{int(time.time() * 1000) % 10000}"
        
        result_parts = []
        
        # 处理中文字符
        if chinese_chars:
            if len(chinese_chars) == 1:
                # 只有一个汉字，使用全拼
                py = pinyin(chinese_chars[0], style=Style.NORMAL, strict=False)
                if py and py[0]:
                    result_parts.append(py[0][0])
            else:
                # 多个汉字：前面的用首字母，最后一个用全拼
                for i, char in enumerate(chinese_chars):
                    if i == len(chinese_chars) - 1:
                        # 最后一个字用全拼
                        py = pinyin(char, style=Style.NORMAL, strict=False)
                    else:
                        # 其他字用首字母
                        py = pinyin(char, style=Style.FIRST_LETTER, strict=False)
                    
                    if py and py[0]:
                        result_parts.append(py[0][0])
        
        # 添加其他字符
        if other_chars:
            result_parts.extend(other_chars)
        
        result = ''.join(result_parts)
        return result if result else f"fallback_{int(time.time() * 1000) % 10000}"

    def ensure_unique_id(self, base_id, existing_ids, prefix=''):
        """确保ID唯一性"""
        if prefix:
            base_id = f"{prefix}_{base_id}"
        
        if base_id not in existing_ids:
            return base_id
        
        # 如果ID已存在，添加数字后缀
        counter = 1
        while f"{base_id}{counter}" in existing_ids:
            counter += 1
        
        return f"{base_id}{counter}"

    def generate_all_ids(self):
        """一键生成所有ID - 优化版本"""
        if self.categories.empty and self.sites.empty:
            messagebox.showinfo('提示', '没有数据需要生成ID')
            return
        
        # 保存撤销状态
        self.save_undo_state()
        
        # 确保数据类型一致
        self.normalize_data_types()
        
        # 记录所有已使用的ID
        all_existing_ids = set()
        category_id_mapping = {}
        
        # 第一步：为所有分类生成新ID（向量化操作）
        if not self.categories.empty:
            # 生成所有新ID
            old_ids = self.categories['id'].tolist()
            names = self.categories['name'].tolist()
            
            for old_id, name in zip(old_ids, names):
                # 生成基于名称的ID
                base_id = self.generate_pinyin_id(name)
                new_id = self.ensure_unique_id(base_id, all_existing_ids, 'cat')
                
                all_existing_ids.add(new_id)
                category_id_mapping[old_id] = new_id
            
            # 批量更新ID
            self.categories['id'] = [category_id_mapping.get(old_id, old_id) for old_id in old_ids]
            
            # 批量更新父级关系
            self.categories['parent'] = self.categories['parent'].map(
                lambda x: category_id_mapping.get(x, x) if x and str(x) != 'nan' else x
            )
        
        # 第二步：为所有站点生成新ID（向量化操作）
        if not self.sites.empty:
            titles = self.sites['title'].tolist()
            new_site_ids = []
            
            for title in titles:
                # 生成基于标题的ID
                base_id = self.generate_pinyin_id(title)
                new_site_id = self.ensure_unique_id(base_id, all_existing_ids, 'site')
                all_existing_ids.add(new_site_id)
                new_site_ids.append(new_site_id)
            
            # 批量更新站点ID
            self.sites['id'] = new_site_ids
            
            # 批量更新站点的分类关系
            self.sites['category'] = self.sites['category'].map(
                lambda x: category_id_mapping.get(x, x) if x and str(x) != 'nan' else x
            )
        
        # 重置数据标准化状态
        self.reset_data_normalization()
        
        self.show_tree()
        self.show_sites()
        
        # 显示生成结果
        category_count = len(self.categories) if not self.categories.empty else 0
        site_count = len(self.sites) if not self.sites.empty else 0
        messagebox.showinfo('成功', f'ID生成完成！\n分类: {category_count} 个\n站点: {site_count} 个\n\n规则：基于名称拼音生成，确保唯一性')

    def import_csv(self, data_type):
        """导入CSV文件"""
        file_path = filedialog.askopenfilename(
            title=f'选择{data_type}CSV文件',
            filetypes=[('CSV文件', '*.csv'), ('所有文件', '*.*')]
        )
        
        if not file_path:
            return
        
        try:
            new_data = pd.read_csv(file_path)
            
            # 保存撤销状态
            self.save_undo_state()
            
            if data_type == 'categories':
                self.categories = new_data
                self._normalize_ids()
                self.show_tree()
            else:  # sites
                self.sites = new_data
                self.show_sites()
            
            messagebox.showinfo('导入成功', f'{data_type}数据已导入')
            
        except Exception as e:
            messagebox.showerror('导入失败', f'导入CSV文件失败: {e}')

    def export_csv(self, data_type):
        """导出CSV文件"""
        file_path = filedialog.asksaveasfilename(
            title=f'导出{data_type}CSV文件',
            defaultextension='.csv',
            filetypes=[('CSV文件', '*.csv'), ('所有文件', '*.*')]
        )
        
        if not file_path:
            return
        
        try:
            if data_type == 'categories':
                if self.categories.empty:
                    messagebox.showwarning('导出失败', '没有分类数据可导出')
                    return
                self.categories.to_csv(file_path, index=False)
            else:  # sites
                if self.sites.empty:
                    messagebox.showwarning('导出失败', '没有站点数据可导出')
                    return
                self.sites.to_csv(file_path, index=False)
            
            messagebox.showinfo('导出成功', f'{data_type}数据已导出到: {file_path}')
            
        except Exception as e:
            messagebox.showerror('导出失败', f'导出CSV文件失败: {e}')

    def check_git_status(self, work_dir=None):
        """检查Git状态"""
        try:
            # 如果没有指定工作目录，使用当前应用程序目录
            if work_dir is None:
                work_dir = os.path.dirname(os.path.abspath(__file__))
            
            # 检查是否在Git仓库中
            result = subprocess.run(['git', 'rev-parse', '--is-inside-work-tree'], 
                                  capture_output=True, text=True, cwd=work_dir)
            return result.returncode == 0
        except Exception:
            return False

    def push_to_github(self):
        """推送数据到GitHub仓库 - 支持输入仓库地址"""
        # 创建推送对话框
        push_win = tk.Toplevel(self.root)
        push_win.title('推送到GitHub仓库')
        push_win.geometry('600x550')
        push_win.transient(self.root)
        push_win.grab_set()
        
        # 仓库地址输入
        repo_frame = tk.LabelFrame(push_win, text='GitHub仓库信息', padx=10, pady=10)
        repo_frame.pack(fill=tk.X, padx=10, pady=5)
        
        tk.Label(repo_frame, text='仓库地址:', width=10, anchor='w').pack(side=tk.LEFT)
        repo_url_var = tk.StringVar()
        
        def clean_repo_url(*args):
            """自动清理仓库地址"""
            url = repo_url_var.get()
            if url:
                # 清理地址
                clean_url = url.strip().strip('`"\'').strip()
                if clean_url != url:
                    repo_url_var.set(clean_url)
        
        repo_url_var.trace_add('write', clean_repo_url)  # 监听变化并自动清理
        repo_entry = tk.Entry(repo_frame, textvariable=repo_url_var, width=40)
        repo_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # 示例提示
        example_frame = tk.Frame(push_win)
        example_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(example_frame, text='示例: https://github.com/用户名/仓库名.git', 
                fg='#666', font=('微软雅黑', 8)).pack(side=tk.LEFT)
        tk.Label(example_frame, text='注意: 不要包含引号或反引号', 
                fg='#ff6b6b', font=('微软雅黑', 8)).pack(side=tk.LEFT, padx=10)
        
        # 分支名称
        branch_frame = tk.Frame(push_win)
        branch_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(branch_frame, text='分支名称:', width=10, anchor='w').pack(side=tk.LEFT)
        branch_var = tk.StringVar(value='main')
        branch_entry = tk.Entry(branch_frame, textvariable=branch_var, width=20)
        branch_entry.pack(side=tk.LEFT)
        
        # 目标文件夹（可选）
        folder_frame = tk.Frame(push_win)
        folder_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(folder_frame, text='目标文件夹:', width=10, anchor='w').pack(side=tk.LEFT)
        folder_var = tk.StringVar()
        folder_entry = tk.Entry(folder_frame, textvariable=folder_var, width=30)
        folder_entry.pack(side=tk.LEFT)
        tk.Label(folder_frame, text='(可选，如: data/)', fg='#666', font=('微软雅黑', 8)).pack(side=tk.LEFT, padx=5)
        
        # 提交信息
        commit_frame = tk.LabelFrame(push_win, text='提交信息', padx=10, pady=10)
        commit_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        commit_text = tk.Text(commit_frame, height=4, width=50)
        commit_text.pack(fill=tk.BOTH, expand=True)
        commit_text.insert(tk.END, f"更新数据 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 进度信息
        progress_frame = tk.LabelFrame(push_win, text='推送进度', padx=10, pady=5)
        progress_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        progress_text = tk.Text(progress_frame, height=6, width=50)
        progress_text.pack(fill=tk.BOTH, expand=True)
        
        def update_progress(message):
            """更新进度信息"""
            progress_text.insert(tk.END, f"{datetime.now().strftime('%H:%M:%S')} - {message}\n")
            progress_text.see(tk.END)
            push_win.update()
        
        def validate_repo_url(url):
            """验证仓库地址格式"""
            if not url:
                return False, "请输入仓库地址"
            
            # 清理地址中的特殊字符
            clean_url = url.strip().strip('`"\'').strip()
            if clean_url != url:
                return False, f"仓库地址包含非法字符，请检查是否有多余的引号。清理后的地址: {clean_url}"
            
            # 支持多种格式
            valid_patterns = [
                r'^https://github\.com/[^/]+/[^/]+\.git$',
                r'^https://github\.com/[^/]+/[^/]+/?$',
                r'^git@github\.com:[^/]+/[^/]+\.git$',
                r'^https://[^/]+\.github\.io/[^/]+\.git$'
            ]
            
            for pattern in valid_patterns:
                if re.match(pattern, url):
                    return True, ""
            
            return False, "仓库地址格式不正确，请使用GitHub仓库地址"
        
        def do_push():
            """执行推送操作"""
            # 获取并清理仓库地址 - 去除各种可能的引号和空格
            raw_url = repo_url_var.get()
            update_progress(f"原始地址: '{raw_url}'")
            update_progress(f"原始地址长度: {len(raw_url)}")
            update_progress(f"原始地址ASCII码: {[ord(c) for c in raw_url]}")
            
            # 最激进的清理逻辑 - 只保留URL有效字符
            repo_url = raw_url
            
            # 第一步：去除所有空白字符（包括不可见字符）
            repo_url = ''.join(c for c in repo_url if not c.isspace())
            update_progress(f"去除空白后: '{repo_url}' 长度: {len(repo_url)}")
            
            # 第二步：去除所有引号类字符
            for char in ['`', '"', "'", '´', '‘', '’', '“', '”']:
                repo_url = repo_url.replace(char, '')
            update_progress(f"去除引号后: '{repo_url}' 长度: {len(repo_url)}")
            
            # 第三步：使用正则表达式提取URL
            import re
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
            match = re.search(url_pattern, repo_url)
            if match:
                repo_url = match.group(0)
                update_progress(f"正则提取后: '{repo_url}' 长度: {len(repo_url)}")
            else:
                # 如果没有找到URL，手动清理首尾的特殊字符
                repo_url = repo_url.strip('`"\'´‘’“”<>{}|\\^[]')
                update_progress(f"手动清理后: '{repo_url}' 长度: {len(repo_url)}")
            
            # 最终验证
            update_progress(f"最终地址: '{repo_url}'")
            update_progress(f"最终地址长度: {len(repo_url)}")
            update_progress(f"最终地址是否包含反引号: {'`' in repo_url}")
            update_progress(f"最终地址是否包含引号: {'"' in repo_url or "'" in repo_url}")
            
            # 强制重新检查，确保逻辑正确
            has_backtick = '`' in repo_url
            has_quote = '"' in repo_url or "'" in repo_url
            if has_backtick or has_quote:
                update_progress(f"❌ 地址仍然包含非法字符！反引号: {has_backtick}, 引号: {has_quote}")
                # 最后的保险措施 - 如果还有问题，手动移除
                repo_url = repo_url.replace('`', '').replace('"', '').replace("'", '')
                update_progress(f"强制清理后: '{repo_url}'")
            else:
                update_progress("✅ 地址清理成功！")
            
            branch = branch_var.get().strip() or 'main'
            target_folder = folder_var.get().strip()
            commit_msg = commit_text.get('1.0', tk.END).strip()
            
            # 验证输入
            is_valid, error_msg = validate_repo_url(repo_url)
            if not is_valid:
                messagebox.showerror('错误', error_msg)
                return
            
            if not commit_msg:
                messagebox.showerror('错误', '请输入提交信息')
                return
            
            # 禁用推送按钮
            push_btn.config(state='disabled')
            
            try:
                update_progress("开始推送流程...")
                
                # 1. 保存当前数据
                update_progress("保存当前编辑的数据...")
                self.save_all(silent=True)
                
                # 使用当前Git仓库目录
                work_dir = os.getcwd()
                
                # 如果指定了目标文件夹，创建该文件夹并复制文件
                if target_folder:
                    update_progress(f"准备推送到文件夹: {target_folder}")
                    
                    # 在当前仓库中创建目标文件夹
                    target_path = os.path.join(work_dir, target_folder)
                    os.makedirs(target_path, exist_ok=True)
                    
                    # 复制CSV文件到目标文件夹
                    shutil.copy('sites.csv', os.path.join(target_path, 'sites.csv'))
                    shutil.copy('categories.csv', os.path.join(target_path, 'categories.csv'))
                    
                    update_progress(f"✅ 文件已复制到 {target_folder}/")
                else:
                    update_progress("使用当前目录的CSV文件")
                
                # 2. 检查Git状态
                update_progress("检查Git仓库状态...")
                if not self.check_git_status(work_dir):
                    update_progress("当前目录不是Git仓库，正在初始化...")
                    subprocess.run(['git', 'init'], check=True, cwd=work_dir)
                    
                    # 设置远程仓库
                    update_progress(f"设置远程仓库: {repo_url}")
                    try:
                        subprocess.run(['git', 'remote', 'add', 'origin', repo_url], 
                                     check=True, cwd=work_dir)
                    except subprocess.CalledProcessError as e:
                        update_progress(f"❌ 添加远程仓库失败: {e}")
                        update_progress(f"仓库地址: '{repo_url}'")
                        raise
                else:
                    # 检查是否已有远程仓库
                    result = subprocess.run(['git', 'remote', 'get-url', 'origin'], 
                                          capture_output=True, text=True, cwd=work_dir)
                    if result.returncode != 0:
                        # 没有远程仓库，添加
                        update_progress(f"添加远程仓库: {repo_url}")
                        try:
                            subprocess.run(['git', 'remote', 'add', 'origin', repo_url], 
                                         check=True, cwd=work_dir)
                        except subprocess.CalledProcessError as e:
                            update_progress(f"❌ 添加远程仓库失败: {e}")
                            update_progress(f"仓库地址: '{repo_url}'")
                            raise
                    else:
                        current_remote = result.stdout.strip()
                        update_progress(f"当前远程仓库: {current_remote}")
                        if current_remote != repo_url:
                            update_progress(f"更新远程仓库地址: {repo_url}")
                            try:
                                subprocess.run(['git', 'remote', 'set-url', 'origin', repo_url], 
                                             check=True, cwd=work_dir)
                            except subprocess.CalledProcessError as e:
                                update_progress(f"❌ 更新远程仓库失败: {e}")
                                raise
                        else:
                            update_progress("✅ 远程仓库地址已正确配置")
                            subprocess.run(['git', 'remote', 'set-url', 'origin', repo_url], 
                                         check=True, cwd=work_dir)
                
                # 3. 检查Git配置
                update_progress("检查Git配置...")
                result = subprocess.run(['git', 'config', 'user.name'], 
                                      capture_output=True, text=True, cwd=work_dir)
                if result.returncode != 0 or not result.stdout.strip():
                    # 设置默认用户名
                    update_progress("设置Git用户名...")
                    subprocess.run(['git', 'config', 'user.name', '数据管理工具'], 
                                 check=True, cwd=work_dir)
                
                result = subprocess.run(['git', 'config', 'user.email'], 
                                      capture_output=True, text=True, cwd=work_dir)
                if result.returncode != 0 or not result.stdout.strip():
                    # 设置默认邮箱
                    update_progress("设置Git邮箱...")
                    subprocess.run(['git', 'config', 'user.email', 'data-manager@example.com'], 
                                 check=True, cwd=work_dir)
                
                # 4. 获取远程仓库信息
                update_progress("获取远程仓库信息...")
                try:
                    subprocess.run(['git', 'fetch', 'origin'], 
                                 check=True, cwd=work_dir)
                    
                    # 检查远程分支是否存在
                    result = subprocess.run(['git', 'branch', '-r'], 
                                          capture_output=True, text=True, cwd=work_dir)
                    remote_branch_exists = f'origin/{branch}' in result.stdout
                    
                    if remote_branch_exists:
                        # 远程分支存在，拉取最新代码
                        update_progress(f"拉取远程分支 {branch} 的最新代码...")
                        subprocess.run(['git', 'pull', 'origin', branch], 
                                     check=True, cwd=work_dir)
                    else:
                        # 远程分支不存在，创建本地分支
                        update_progress(f"创建本地分支 {branch}...")
                        # 检查本地分支是否存在
                        result = subprocess.run(['git', 'branch', '--list', branch], 
                                              capture_output=True, text=True, cwd=work_dir)
                        if result.returncode != 0 or not result.stdout.strip():
                            subprocess.run(['git', 'checkout', '-b', branch], 
                                         check=True, cwd=work_dir)
                        else:
                            subprocess.run(['git', 'checkout', branch], 
                                         check=True, cwd=work_dir)
                
                except subprocess.CalledProcessError as e:
                    update_progress(f"获取远程信息失败，继续推送: {e}")
                
                # 5. 添加文件到暂存区
                update_progress("添加数据文件到Git...")
                if target_folder:
                    # 添加目标文件夹中的文件
                    subprocess.run(['git', 'add', target_folder], 
                                 check=True, cwd=work_dir)
                else:
                    # 添加根目录文件
                    subprocess.run(['git', 'add', 'sites.csv', 'categories.csv'], 
                                 check=True, cwd=work_dir)
                
                # 6. 检查是否有变更
                update_progress("检查文件变更...")
                result = subprocess.run(['git', 'diff', '--cached', '--quiet'], 
                                      capture_output=True, cwd=work_dir)
                
                if result.returncode == 0:
                    update_progress("没有检测到数据变更")
                    messagebox.showinfo('提示', '数据没有变更，无需推送')
                    return
                
                # 7. 提交变更
                update_progress(f"提交变更: {commit_msg}")
                subprocess.run(['git', 'commit', '-m', commit_msg], 
                             check=True, cwd=work_dir)
                
                # 8. 推送到远程仓库
                update_progress(f"推送到远程仓库 {branch} 分支...")
                
                # 检查是否有初始提交
                result = subprocess.run(['git', 'rev-parse', '--verify', 'HEAD'], 
                                      capture_output=True, text=True, cwd=work_dir)
                
                if result.returncode != 0:
                    # 没有初始提交，需要先创建初始提交
                    update_progress("创建初始提交...")
                    # 创建一个空的初始提交
                    subprocess.run(['git', 'commit', '--allow-empty', '-m', '初始提交'], 
                                   check=True, cwd=work_dir)
                
                # 尝试推送，如果远程分支不存在则创建
                result = subprocess.run(['git', 'push', '-u', 'origin', branch], 
                                      capture_output=True, text=True, cwd=work_dir)
                
                if result.returncode == 0:
                    update_progress("✅ 推送成功！")
                    update_progress(f"数据已成功推送到: {repo_url}")
                    if target_folder:
                        update_progress(f"文件位置: {target_folder}/sites.csv 和 {target_folder}/categories.csv")
                    messagebox.showinfo('成功', f'数据已成功推送到GitHub仓库！\n\n仓库: {repo_url}\n分支: {branch}' + (f'\n文件夹: {target_folder}' if target_folder else ''))
                else:
                    error_detail = result.stderr
                    update_progress(f"❌ 推送失败: {error_detail}")
                    
                    # 尝试提供解决方案
                    if 'rejected' in error_detail and 'fetch first' in error_detail:
                        solution = "远程仓库有更新，请先拉取最新代码再推送"
                    elif 'Permission denied' in error_detail:
                        solution = "请检查GitHub访问权限和Token设置"
                    elif 'Authentication failed' in error_detail:
                        solution = "认证失败，请检查GitHub用户名和密码/Token"
                    elif 'src refspec' in error_detail:
                        solution = "分支不存在，尝试使用 'git push -u origin main' 创建新分支"
                    else:
                        solution = "请检查网络连接和仓库权限"
                    
                    messagebox.showerror('推送失败', f'推送到GitHub失败:\n\n{error_detail}\n\n建议: {solution}')
                
            except subprocess.CalledProcessError as e:
                error_msg = f"Git命令执行失败: {e}"
                update_progress(f"❌ {error_msg}")
                # 检查是否是远程仓库已存在错误
                if "remote origin already exists" in str(e):
                    update_progress("检测到远程仓库已存在，尝试更新URL...")
                    try:
                        subprocess.run(['git', 'remote', 'set-url', 'origin', repo_url], 
                                     check=True, cwd=work_dir)
                        update_progress("远程仓库URL已更新，重新尝试推送...")
                        # 重新尝试推送
                        result = subprocess.run(['git', 'push', '-u', 'origin', branch], 
                                              capture_output=True, text=True, cwd=work_dir)
                        if result.returncode == 0:
                            update_progress("✅ 重新推送成功！")
                            update_progress(f"数据已成功推送到: {repo_url}")
                            if target_folder:
                                update_progress(f"文件位置: {target_folder}/sites.csv 和 {target_folder}/categories.csv")
                            messagebox.showinfo('成功', f'数据已成功推送到GitHub仓库！\n\n仓库: {repo_url}\n分支: {branch}' + (f'\n文件夹: {target_folder}' if target_folder else ''))
                        else:
                            error_detail = result.stderr
                            update_progress(f"❌ 重新推送也失败了: {error_detail}")
                            messagebox.showerror('推送失败', f'重新推送到GitHub失败:\n\n{error_detail}')
                    except subprocess.CalledProcessError as set_url_error:
                        update_progress(f"❌ 更新远程仓库URL也失败了: {set_url_error}")
                        messagebox.showerror('错误', f'{error_msg}\n\n请确保Git已正确安装并配置')
                else:
                    messagebox.showerror('错误', f'{error_msg}\n\n请确保Git已正确安装并配置')
            except Exception as e:
                error_msg = f"推送过程中发生错误: {e}"
                update_progress(f"❌ {error_msg}")
                messagebox.showerror('错误', error_msg)
            finally:
                # 重新启用推送按钮
                push_btn.config(state='normal')
                update_progress("推送操作完成")
        
        # 按钮区域
        btn_frame = tk.Frame(push_win)
        btn_frame.pack(fill=tk.X, padx=10, pady=10)
        
        push_btn = tk.Button(btn_frame, text='开始推送', command=lambda: threading.Thread(target=do_push, daemon=True).start(), 
                           bg='#4caf50', fg='white', font=('微软雅黑', 10))
        push_btn.pack(side=tk.RIGHT, padx=5)
        
        tk.Button(btn_frame, text='取消', command=push_win.destroy).pack(side=tk.RIGHT, padx=5)
        
        # 帮助信息
        help_frame = tk.Frame(push_win)
        help_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(help_frame, text='提示: 首次推送需要设置GitHub Personal Access Token', 
                fg='#666', font=('微软雅黑', 8)).pack(side=tk.LEFT)
        
        # 聚焦到输入框
        repo_entry.focus()

    def create_new_project(self):
        """新建项目/目录"""
        # 创建新建项目对话框
        new_win = tk.Toplevel(self.root)
        new_win.title('新建项目')
        new_win.geometry('400x300')
        new_win.transient(self.root)
        new_win.grab_set()
        
        # 项目名称
        name_frame = tk.Frame(new_win)
        name_frame.pack(fill=tk.X, padx=10, pady=10)
        tk.Label(name_frame, text='项目名称:', width=10, anchor='w').pack(side=tk.LEFT)
        name_entry = tk.Entry(name_frame)
        name_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # 项目路径
        path_frame = tk.Frame(new_win)
        path_frame.pack(fill=tk.X, padx=10, pady=5)
        tk.Label(path_frame, text='保存路径:', width=10, anchor='w').pack(side=tk.LEFT)
        path_var = tk.StringVar(value=os.path.dirname(os.getcwd()))
        path_entry = tk.Entry(path_frame, textvariable=path_var)
        path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        
        def browse_path():
            folder = filedialog.askdirectory(initialdir=path_var.get())
            if folder:
                path_var.set(folder)
        
        tk.Button(path_frame, text='浏览', command=browse_path).pack(side=tk.RIGHT)
        
        # 选项
        options_frame = tk.LabelFrame(new_win, text='选项')
        options_frame.pack(fill=tk.X, padx=10, pady=10)
        
        git_var = tk.BooleanVar(value=True)
        readme_var = tk.BooleanVar(value=True)
        
        tk.Checkbutton(options_frame, text='初始化Git仓库', variable=git_var).pack(anchor='w', padx=10, pady=2)
        tk.Checkbutton(options_frame, text='创建README.md文件', variable=readme_var).pack(anchor='w', padx=10, pady=2)
        
        def create_project():
            project_name = name_entry.get().strip()
            base_path = path_var.get().strip()
            
            if not project_name:
                messagebox.showwarning('警告', '请输入项目名称')
                return
            
            if not base_path:
                messagebox.showwarning('警告', '请选择保存路径')
                return
            
            try:
                # 创建项目目录
                project_path = os.path.join(base_path, project_name)
                os.makedirs(project_path, exist_ok=True)
                
                # 创建空的CSV文件
                categories_file = os.path.join(project_path, 'categories.csv')
                sites_file = os.path.join(project_path, 'sites.csv')
                
                # 创建带表头的空CSV文件
                pd.DataFrame(columns=['id', 'name', 'parent']).to_csv(categories_file, index=False)
                pd.DataFrame(columns=['id', 'title', 'url', 'description', 'category', 'icon', 'visible', 'sort_order']).to_csv(sites_file, index=False)
                
                # 创建README文件
                if readme_var.get():
                    readme_file = os.path.join(project_path, 'README.md')
                    with open(readme_file, 'w', encoding='utf-8') as f:
                        f.write(f"# {project_name}\n\n")
                        f.write("数据管理项目\n\n")
                        f.write("## 文件说明\n\n")
                        f.write("- `categories.csv` - 分类数据\n")
                        f.write("- `sites.csv` - 站点数据\n\n")
                        f.write(f"创建时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                
                # 初始化Git仓库
                if git_var.get():
                    subprocess.run(['git', 'init'], cwd=project_path, check=True)
                    subprocess.run(['git', 'add', '.'], cwd=project_path, check=True)
                    subprocess.run(['git', 'commit', '-m', '初始提交'], cwd=project_path, check=True)
                
                messagebox.showinfo('成功', f'项目已创建在: {project_path}')
                new_win.destroy()
                
            except Exception as e:
                messagebox.showerror('错误', f'创建项目失败: {e}')
        
        # 按钮
        btn_frame = tk.Frame(new_win)
        btn_frame.pack(fill=tk.X, padx=10, pady=10)
        tk.Button(btn_frame, text='取消', command=new_win.destroy).pack(side=tk.RIGHT, padx=5)
        tk.Button(btn_frame, text='创建', command=create_project, bg='#4caf50', fg='white').pack(side=tk.RIGHT)

    def create_new_site_file(self):
        """新建站点文件"""
        # 创建新建站点文件对话框
        new_win = tk.Toplevel(self.root)
        new_win.title('新建站点文件')
        new_win.geometry('400x200')
        new_win.transient(self.root)
        new_win.grab_set()
        
        # 文件名
        name_frame = tk.Frame(new_win)
        name_frame.pack(fill=tk.X, padx=10, pady=10)
        tk.Label(name_frame, text='文件名:', width=10, anchor='w').pack(side=tk.LEFT)
        name_entry = tk.Entry(name_frame)
        name_entry.insert(0, 'sites.csv')
        name_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # 保存路径
        path_frame = tk.Frame(new_win)
        path_frame.pack(fill=tk.X, padx=10, pady=5)
        tk.Label(path_frame, text='保存路径:', width=10, anchor='w').pack(side=tk.LEFT)
        path_var = tk.StringVar(value=os.getcwd())
        path_entry = tk.Entry(path_frame, textvariable=path_var)
        path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        
        def browse_path():
            folder = filedialog.askdirectory(initialdir=path_var.get())
            if folder:
                path_var.set(folder)
        
        tk.Button(path_frame, text='浏览', command=browse_path).pack(side=tk.RIGHT)
        
        def create_file():
            filename = name_entry.get().strip()
            save_path = path_var.get().strip()
            
            if not filename:
                messagebox.showwarning('警告', '请输入文件名')
                return
            
            if not save_path:
                messagebox.showwarning('警告', '请选择保存路径')
                return
            
            try:
                file_path = os.path.join(save_path, filename)
                
                # 创建带表头的空站点文件
                if filename.endswith('.csv'):
                    pd.DataFrame(columns=['id', 'title', 'url', 'description', 'category', 'icon', 'visible', 'sort_order']).to_csv(file_path, index=False)
                else:
                    # 创建空文件
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write('')
                
                messagebox.showinfo('成功', f'文件已创建: {file_path}')
                new_win.destroy()
                
            except Exception as e:
                messagebox.showerror('错误', f'创建文件失败: {e}')
        
        # 按钮
        btn_frame = tk.Frame(new_win)
        btn_frame.pack(fill=tk.X, padx=10, pady=20)
        tk.Button(btn_frame, text='取消', command=new_win.destroy).pack(side=tk.RIGHT, padx=5)
        tk.Button(btn_frame, text='创建', command=create_file, bg='#4caf50', fg='white').pack(side=tk.RIGHT)

    def add_category(self):
        """新增分类"""
        # 保存撤销状态
        self.save_undo_state()
        
        # 创建新分类对话框
        add_win = tk.Toplevel(self.root)
        add_win.title('新增分类')
        add_win.geometry('500x400')
        add_win.transient(self.root)
        add_win.grab_set()
        
        # 分类字段配置
        fields = [
            ('id', 'ID', 'entry'),
            ('name', '分类名称', 'entry'),
            ('parent', '父分类', 'tree'),
            ('sort_order', '排序', 'entry')
        ]
        
        entries = {}
        
        for field, label, field_type in fields:
            frame = tk.Frame(add_win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=f'{label}:', width=15, anchor='w').pack(side=tk.LEFT)
            
            if field_type == 'tree':
                tree_widget = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree_widget)
                tree_widget.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries[field] = tree_widget
            else:
                entry_frame = tk.Frame(frame)
                entry_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                entry = tk.Entry(entry_frame)
                entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                # 为ID和排序字段添加自动生成按钮
                if field == 'id':
                    def make_generate_id(id_entry):
                        def generate_id():
                            name = entries['name'].get().strip() if 'name' in entries else ''
                            if name:
                                base_id = self.generate_pinyin_id(name)
                                existing_ids = set(self.categories['id'].tolist()) if not self.categories.empty else set()
                                unique_id = self.ensure_unique_id(base_id, existing_ids, 'cat')
                                id_entry.delete(0, tk.END)
                                id_entry.insert(0, unique_id)
                            else:
                                messagebox.showwarning('提示', '请先输入分类名称')
                        return generate_id
                    
                    tk.Button(entry_frame, text='生成', command=make_generate_id(entry), bg='#ff9800', fg='white', width=6).pack(side=tk.RIGHT, padx=(5,0))
                
                elif field == 'sort_order':
                    def make_generate_sort(sort_entry):
                        def generate_sort():
                            max_sort = 0
                            if not self.categories.empty:
                                max_sort = self.categories['sort_order'].fillna(0).astype(int).max()
                            sort_entry.delete(0, tk.END)
                            sort_entry.insert(0, str(max_sort + 1))
                        return generate_sort
                    
                    tk.Button(entry_frame, text='自动', command=make_generate_sort(entry), bg='#607d8b', fg='white', width=6).pack(side=tk.RIGHT, padx=(5,0))
                
                entries[field] = entry
        
        # 按钮区域
        btn_frame = tk.Frame(add_win)
        btn_frame.pack(fill=tk.X, padx=10, pady=20)
        
        def on_save():
            # 验证必填字段
            name = entries['name'].get().strip()
            if not name:
                messagebox.showwarning('警告', '请输入分类名称')
                return
            
            category_id = entries['id'].get().strip()
            if not category_id:
                messagebox.showwarning('警告', '请输入或生成ID')
                return
            
            # 检查ID唯一性
            if not self.categories.empty and category_id in self.categories['id'].values:
                messagebox.showwarning('警告', 'ID已存在，请使用其他ID')
                return
            
            # 获取父分类ID
            parent_selection = entries['parent'].selection()
            parent_id = parent_selection[0] if parent_selection else ''
            
            # 获取排序值
            sort_order = entries['sort_order'].get().strip()
            sort_order = int(sort_order) if sort_order.isdigit() else 0
            
            # 创建新分类
            new_category = pd.DataFrame({
                'id': [category_id],
                'name': [name],
                'parent': [parent_id],
                'sort_order': [sort_order]
            })
            
            # 添加到分类数据
            if self.categories is None or self.categories.empty:
                self.categories = new_category
            else:
                self.categories = pd.concat([self.categories, new_category], ignore_index=True)
            
            # 刷新显示
            self.show_tree()
            self.show_sites()
            
            # 标记有未保存的更改
            self.unsaved_changes = True
            
            add_win.destroy()
            messagebox.showinfo('成功', f'分类"{name}"已添加')
        
        tk.Button(btn_frame, text='取消', command=add_win.destroy).pack(side=tk.RIGHT, padx=5)
        tk.Button(btn_frame, text='保存', command=on_save, bg='#4caf50', fg='white').pack(side=tk.RIGHT)

    def add_site(self):
        """新增站点"""
        # 保存撤销状态
        self.save_undo_state()
        
        # 创建新站点对话框
        add_win = tk.Toplevel(self.root)
        add_win.title('新增站点')
        add_win.geometry('500x500')
        add_win.transient(self.root)
        add_win.grab_set()
        
        # 站点字段配置
        fields = [
            ('id', 'ID', 'entry'),
            ('title', '站点标题', 'entry'),
            ('url', 'URL地址', 'entry'),
            ('description', '描述', 'text'),
            ('category', '所属分类', 'tree'),
            ('icon', '图标', 'entry'),
            ('visible', '是否可见', 'combo'),
            ('sort_order', '排序', 'entry')
        ]
        
        entries = {}
        
        for field, label, field_type in fields:
            frame = tk.Frame(add_win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=f'{label}:', width=15, anchor='w').pack(side=tk.LEFT)
            
            if field_type == 'tree':
                tree_widget = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree_widget)
                tree_widget.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries[field] = tree_widget
            elif field_type == 'text':
                text_widget = tk.Text(frame, height=3, wrap=tk.WORD)
                text_widget.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries[field] = text_widget
            elif field_type == 'combo':
                combo_widget = ttk.Combobox(frame, values=['1', '0'], state='readonly')
                combo_widget.set('1')  # 默认可见
                combo_widget.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries[field] = combo_widget
            else:
                entry_frame = tk.Frame(frame)
                entry_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                entry = tk.Entry(entry_frame)
                entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
                
                # 为ID和排序字段添加自动生成按钮
                if field == 'id':
                    def make_generate_id(id_entry):
                        def generate_id():
                            title = entries['title'].get().strip() if 'title' in entries else ''
                            if title:
                                base_id = self.generate_pinyin_id(title)
                                existing_ids = set(self.sites['id'].tolist()) if not self.sites.empty else set()
                                unique_id = self.ensure_unique_id(base_id, existing_ids, 'site')
                                id_entry.delete(0, tk.END)
                                id_entry.insert(0, unique_id)
                            else:
                                messagebox.showwarning('提示', '请先输入站点标题')
                        return generate_id
                    
                    tk.Button(entry_frame, text='生成', command=make_generate_id(entry), bg='#ff9800', fg='white', width=6).pack(side=tk.RIGHT, padx=(5,0))
                
                elif field == 'sort_order':
                    def make_generate_sort(sort_entry):
                        def generate_sort():
                            max_sort = 0
                            if not self.sites.empty:
                                max_sort = self.sites['sort_order'].fillna(0).astype(int).max()
                            sort_entry.delete(0, tk.END)
                            sort_entry.insert(0, str(max_sort + 1))
                        return generate_sort
                    
                    tk.Button(entry_frame, text='自动', command=make_generate_sort(entry), bg='#607d8b', fg='white', width=6).pack(side=tk.RIGHT, padx=(5,0))
                
                entries[field] = entry
        
        # 按钮区域
        btn_frame = tk.Frame(add_win)
        btn_frame.pack(fill=tk.X, padx=10, pady=20)
        
        def on_save():
            # 验证必填字段
            title = entries['title'].get().strip()
            if not title:
                messagebox.showwarning('警告', '请输入站点标题')
                return
                
            url = entries['url'].get().strip()
            if not url:
                messagebox.showwarning('警告', '请输入URL地址')
                return
            
            site_id = entries['id'].get().strip()
            if not site_id:
                messagebox.showwarning('警告', '请输入或生成ID')
                return
            
            # 检查ID唯一性
            if not self.sites.empty and site_id in self.sites['id'].values:
                messagebox.showwarning('警告', 'ID已存在，请使用其他ID')
                return
            
            # 获取分类ID
            category_selection = entries['category'].selection()
            category_id = category_selection[0] if category_selection else ''
            
            # 获取描述
            description = entries['description'].get('1.0', tk.END).strip()
            
            # 获取其他字段
            icon = entries['icon'].get().strip()
            visible = entries['visible'].get()
            sort_order = entries['sort_order'].get().strip()
            sort_order = int(sort_order) if sort_order.isdigit() else 0
            
            # 创建新站点
            new_site = pd.DataFrame({
                'id': [site_id],
                'title': [title],
                'url': [url],
                'description': [description],
                'category': [category_id],
                'icon': [icon],
                'visible': [int(visible)],
                'sort_order': [sort_order]
            })
            
            # 添加到站点数据
            if self.sites is None or self.sites.empty:
                self.sites = new_site
            else:
                self.sites = pd.concat([self.sites, new_site], ignore_index=True)
            
            # 刷新显示
            self.show_sites()
            
            # 标记有未保存的更改
            self.unsaved_changes = True
            
            add_win.destroy()
            messagebox.showinfo('成功', f'站点"{title}"已添加')
        
        tk.Button(btn_frame, text='取消', command=add_win.destroy).pack(side=tk.RIGHT, padx=5)
        tk.Button(btn_frame, text='保存', command=on_save, bg='#4caf50', fg='white').pack(side=tk.RIGHT)

    def _reorder_within_parent(self, parent_id: str, ordered_ids: list[str]):
        parent_id = '' if parent_id is None else str(parent_id)
        df = self.categories.copy()
        df['id'] = df['id'].astype(str)
        df['parent'] = df['parent'].fillna('').astype(str)
        rest = df[df['parent'] != parent_id]
        group = df[df['parent'] == parent_id].copy()
        # 只保留出现的id顺序，缺失的追加在末尾
        existing = [i for i in ordered_ids if i in set(group['id'])]
        tail = [i for i in group['id'].tolist() if i not in set(existing)]
        order = existing + tail
        new_group = group.set_index('id').loc[order].reset_index()
        self.categories = pd.concat([rest, new_group], ignore_index=True)

    # 移动到某父分类(parent_id)的末尾
    def _move_to_parent_end(self, src_id: str, parent_id: str):
        src_id = str(src_id)
        parent_id = '' if parent_id is None else str(parent_id)
        self.categories['id'] = self.categories['id'].astype(str)
        self.categories['parent'] = self.categories['parent'].fillna('').astype(str)
        self.categories.loc[self.categories['id'] == src_id, 'parent'] = parent_id
        ids = self.categories[self.categories['parent'] == parent_id]['id'].astype(str).tolist()
        # 确保 src 在末尾
        if src_id in ids:
            ids.remove(src_id)
        ids.append(src_id)
        self._reorder_within_parent(parent_id, ids)

    def on_tree_drag_start(self, event):
        item = self.tree.identify_row(event.y)
        if item:
            self._clear_drag_visuals()
            self._dragging_cat = item
            self._is_dragging = False
            self._press_xy = (event.x_root, event.y_root)

    def on_tree_drag_motion(self, event):
        target = self.tree.identify_row(event.y)
        # 拖动时高亮目标节点
        if self._dragging_cat:
            # 判断是否进入拖拽（超过阈值）
            if not self._is_dragging and self._press_xy is not None:
                px, py = self._press_xy
                if max(abs(event.x_root - px), abs(event.y_root - py)) >= 4:
                    self._is_dragging = True
                    self._suspend_tree_select = True

        if target and self._dragging_cat and self._is_dragging and target != self._dragging_cat and not self._is_subcat(self._dragging_cat, target):
            self.tree.selection_set(target)
            self._drag_target = target
            # 判定放置位置（上方/内部/下方）
            self._drag_position = self._pos_relative_to_item(target, event.y)
            pos_text = {'before': '上方', 'inside': '内部', 'after': '下方'}.get(self._drag_position, '内部')
            try:
                name = self.tree.item(target, 'text') or str(target)
                self.status_var.set(f"拖拽：放到『{name}』的{pos_text}")
            except Exception:
                pass
            # 更新可视化：内部高亮 or before/after 插入线
            self._update_drag_visuals(target, self._drag_position)
        else:
            if self._is_dragging:
                # 仅在拖拽时，回退到拖拽源的视觉
                self._drag_target = None
                self._drag_position = None
                self._clear_drag_visuals()

    def on_tree_drag_drop(self, event):
        if not self._dragging_cat:
            return
        # 先清理视觉元素
        self._clear_drag_visuals()
        target = self.tree.identify_row(event.y)
        src_id = str(self._dragging_cat)
        
        # 保存撤销状态（在拖拽操作前）
        self.save_undo_state()
        
        # 如果未发生真实拖拽，当作普通点击：设置选择并刷新右侧
        if not self._is_dragging:
            if target:
                try:
                    self.tree.selection_set(target)
                except Exception:
                    pass
            # 恢复选择事件
            self._suspend_tree_select = False
            # 直接刷新一次右侧列表（防止有环境下 select 事件不触发）
            try:
                self.on_tree_select(None)
            except Exception:
                pass
            # 清理状态并退出
            self._dragging_cat = None
            self._drag_target = None
            self._press_xy = None
            return
        # 禁止拖到自身或子孙节点
        if target and (str(target) == src_id or self._is_subcat(src_id, str(target))):
            self._dragging_cat = None
            self._drag_target = None
            self._drag_position = None
            if self._drag_line:
                self.tree.delete(self._drag_line)
                self._drag_line = None
            # 取消时不清空选择
            try:
                self.status_var.set('拖拽被取消：不能拖到自身或其子节点')
            except Exception:
                pass
            self._suspend_tree_select = False
            self._press_xy = None
            return
        src_row = self.categories[self.categories['id'].astype(str) == src_id].iloc[0]
        if not target:
            # 拖到空白处，变为顶级分类
            self._move_to_parent_end(src_id, '')
            self.show_tree()
            self.show_sites()
            self.tree.selection_set(src_id)
            try:
                self.status_var.set('已移动为顶级分类')
            except Exception:
                pass
        else:
            target = str(target)
            target_row = self.categories[self.categories['id'].astype(str) == target].iloc[0]
            drop_pos = self._drag_position or 'inside'
            if drop_pos == 'inside':
                # 成为目标的子分类
                self._move_to_parent_end(src_id, target)
                self.show_tree()
                self.show_sites()
                self.tree.selection_set(src_id)
                try:
                    self.status_var.set('已移动为目标的子分类（内部）')
                except Exception:
                    pass
            else:
                # 同级：插入到目标的前/后
                parent_id = '' if pd.isna(target_row['parent']) else str(target_row['parent'])
                # 如原父不同，先切换到目标的父类
                if str(src_row['parent']) != parent_id:
                    self.categories.loc[self.categories['id'].astype(str) == src_id, 'parent'] = parent_id
                ids = self.categories[self.categories['parent'].astype(str) == parent_id]['id'].astype(str).tolist()
                if src_id in ids:
                    ids.remove(src_id)
                tgt_idx = ids.index(target)
                insert_idx = tgt_idx if drop_pos == 'before' else tgt_idx + 1
                ids.insert(insert_idx, src_id)
                self._reorder_within_parent(parent_id, ids)
                self.show_tree()
                self.show_sites()
                self.tree.selection_set(src_id)
                try:
                    self.status_var.set('已在目标同级完成顺序调整')
                except Exception:
                    pass
        self._dragging_cat = None
        self._drag_target = None
        self._drag_position = None
        self._is_dragging = False
        self._suspend_tree_select = False
        if self._drag_line:
            self.tree.delete(self._drag_line)
            self._drag_line = None
        # 保留当前选择，不再清空
        try:
            self.root.after(1500, lambda: self.status_var.set('就绪'))
        except Exception:
            pass
        self._press_xy = None

    # 可视化辅助：更新拖拽插入指示
    def _update_drag_visuals(self, item, pos):
        if pos == 'inside':
            # 行高亮
            self._show_hover(item)
            self._hide_insert_line()
        else:
            # 插入线
            self._clear_hover()
            self._show_insert_line(item, pos)

    def _show_insert_line(self, item, pos):
        try:
            x, iy, w, h = self.tree.bbox(item)
        except Exception:
            return
        if h <= 0:
            return
        line_y = iy if pos == 'before' else iy + h - 1
        if self._drag_line_widget is None:
            self._drag_line_widget = tk.Frame(self.tree, height=2, bg='#ff4d4f')  # 红色线
        # 横向铺满
        self._drag_line_widget.place(x=0, y=line_y, relwidth=1, height=2)

    def _hide_insert_line(self):
        if self._drag_line_widget is not None:
            try:
                self._drag_line_widget.place_forget()
            except Exception:
                pass

    def _show_hover(self, item):
        if self._hover_item == item:
            return
        # 清理旧
        self._clear_hover()
        try:
            # 添加 hover 标签
            tags = list(self.tree.item(item, 'tags') or [])
            if 'hover' not in tags:
                tags.append('hover')
                self.tree.item(item, tags=tuple(tags))
        except Exception:
            pass
        self._hover_item = item

    def _clear_hover(self):
        if self._hover_item:
            try:
                tags = list(self.tree.item(self._hover_item, 'tags') or [])
                tags = [t for t in tags if t != 'hover']
                self.tree.item(self._hover_item, tags=tuple(tags))
            except Exception:
                pass
            self._hover_item = None

    def _clear_drag_visuals(self):
        self._hide_insert_line()
        self._clear_hover()

    def _pos_relative_to_item(self, item, y_widget):
        """判断指针相对某行的位置：上方(before)/内部(inside)/下方(after)"""
        try:
            x, iy, w, h = self.tree.bbox(item)
            if h <= 0:
                return 'inside'
            if y_widget < iy + h / 3:
                return 'before'
            elif y_widget > iy + 2 * h / 3:
                return 'after'
            else:
                return 'inside'
        except Exception:
            return 'inside'

    def _is_subcat(self, src_id, target_id):
        # 判断 target_id 是否为 src_id 的子孙节点
        sub_ids = self.get_all_subcats(src_id)
        return target_id in sub_ids

    def get_all_subcats(self, cat_id):
        # 获取所有子分类id（含自身）
        cat_id = str(cat_id)
        ids = [cat_id]
        print(f"DEBUG get_all_subcats: 输入cat_id={cat_id}")
        print(f"DEBUG get_all_subcats: categories数据框形状={self.categories.shape}")
        print(f"DEBUG get_all_subcats: categories列名={list(self.categories.columns)}")
        print(f"DEBUG get_all_subcats: categories前5行数据:")
        print(self.categories.head())
        print(f"DEBUG get_all_subcats: 查找parent='{cat_id}'的记录:")
        matching_parents = self.categories[self.categories['parent'].astype(str) == cat_id]
        print(f"DEBUG get_all_subcats: 匹配到的记录数={len(matching_parents)}")
        if len(matching_parents) > 0:
            print(f"DEBUG get_all_subcats: 匹配的子分类ID={matching_parents['id'].tolist()}")
        
        def find_children(pid):
            print(f"DEBUG find_children: 查找pid={pid}的子分类")
            # 确保parent列也是字符串类型
            children = self.categories[self.categories['parent'].astype(str) == str(pid)]['id'].astype(str).tolist()
            print(f"DEBUG find_children: 找到的子分类={children}")
            for cid in children:
                ids.append(cid)
                find_children(cid)
        
        find_children(cat_id)
        print(f"DEBUG get_all_subcats: 最终返回的ids={ids}")
        return ids

    def setup_tree_drag(self):
        self.tree.bind('<ButtonPress-1>', self.on_tree_drag_start)
        self.tree.bind('<B1-Motion>', self.on_tree_drag_motion)
        self.tree.bind('<ButtonRelease-1>', self.on_tree_drag_drop)
        self._dragging_cat = None
        self._drag_target = None
        self._drag_line = None
        self._drag_position = None
        self._drag_line_widget = None  # 插入线（Frame）
        self._hover_item = None        # 高亮的行
        self._is_dragging = False
        self._press_xy = None
        self._suspend_tree_select = False  # 拖动期间暂停选择事件

if __name__ == '__main__':
    root = tk.Tk()
    app = DataManagerGUI(root)
    root.mainloop()
