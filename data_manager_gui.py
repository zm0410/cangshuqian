import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import pandas as pd
import os
import uuid
import re
try:
    from pypinyin import pinyin, Style
except ImportError:
    pinyin = None

DATA_FILES = {
    '分类数据': 'categories.csv',
    '站点数据': 'sites.csv'
}

class DataManagerGUI:
    # ===== 公共辅助 =====
    def _normalize_ids(self):
        if self.categories is not None and not self.categories.empty:
            self.categories['id'] = self.categories['id'].astype(str)
            self.categories['parent'] = self.categories['parent'].fillna('').astype(str)
        if self.sites is not None and not self.sites.empty and 'category' in self.sites.columns:
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
        cat = self.categories[self.categories['id'] == cat_id]
        if cat.empty:
            return
        columns = list(self.categories.columns)
        values = cat.iloc[0].tolist()
        edit_win = tk.Toplevel(self.root)
        edit_win.title('编辑分类')
        edit_win.geometry('400x350')
        entries = []
        tree_selector = None
        for i, col in enumerate(columns):
            frame = tk.Frame(edit_win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=col, width=15, anchor='w').pack(side=tk.LEFT)
            if col == 'parent':
                tree_selector = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree_selector, select_id=values[i])
                tree_selector.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(tree_selector)
            else:
                entry = tk.Entry(frame)
                entry.insert(0, str(values[i]))
                entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(entry)
        def on_save():
            new_vals = []
            for i, col in enumerate(columns):
                if col == 'parent':
                    sel = entries[i].selection()
                    new_vals.append(sel[0] if sel else '')
                else:
                    new_vals.append(entries[i].get())
            for i, col in enumerate(columns):
                self.categories.loc[self.categories['id'] == cat_id, col] = new_vals[i]
            self.show_tree()
            self.show_sites()
            edit_win.destroy()
        tk.Button(edit_win, text='保存', command=on_save, bg='#2196f3', fg='white').pack(pady=10)

    def delete_category(self):
        sel = self.tree.selection()
        if not sel:
            return
        cat_id = sel[0]
        # 获取所有子分类id
        all_ids = self.get_all_subcats(cat_id)
        # 删除分类
        self.categories = self.categories[~self.categories['id'].isin(all_ids)]
        # 删除相关站点
        self.sites = self.sites[~self.sites['category'].isin(all_ids)]
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
        edit_win.geometry('400x350')
        entries = []
        tree_selector = None
        for i, col in enumerate(columns):
            frame = tk.Frame(edit_win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=col, width=15, anchor='w').pack(side=tk.LEFT)
            if col == 'category':
                tree_selector = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree_selector, select_id=values[i])
                tree_selector.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(tree_selector)
            else:
                entry = tk.Entry(frame)
                entry.insert(0, str(values[i]))
                entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
                entries.append(entry)
        def on_save():
            new_vals = []
            for i, col in enumerate(columns):
                if col == 'category':
                    sel = entries[i].selection()
                    new_vals.append(sel[0] if sel else '')
                else:
                    new_vals.append(entries[i].get())
            for i, col in enumerate(columns):
                self.sites.loc[idx, col] = new_vals[i]
            self.show_sites()
            edit_win.destroy()
        tk.Button(edit_win, text='保存', command=on_save, bg='#2196f3', fg='white').pack(pady=10)

    def delete_site(self):
        sel = self.site_table.selection()
        if not sel:
            return
        try:
            idxs = [int(i) for i in sel]
        except Exception:
            return
        self.sites.drop(index=idxs, inplace=True, errors='ignore')
        self.sites.reset_index(drop=True, inplace=True)
        self.show_sites()
    def __init__(self, root):
        self.root = root
        self.root.title('CSV数据管理器')
        self.root.geometry('1200x700')
        self.categories = None
        self.sites = None
        self.create_widgets()

    # 界面布局美化
    def create_widgets(self):
        # 顶部操作区
        top_frame = tk.Frame(self.root, bg='#f8f8f8', bd=1, relief=tk.GROOVE)
        top_frame.pack(fill=tk.X, padx=10, pady=5)
        tk.Label(top_frame, text='数据管理工具', font=('微软雅黑', 14, 'bold'), bg='#f8f8f8').pack(side=tk.LEFT, padx=10)
        btn_frame = tk.Frame(top_frame, bg='#f8f8f8')
        btn_frame.pack(side=tk.LEFT, padx=10)
        tk.Button(btn_frame, text='导入分类CSV', command=lambda: self.import_csv('categories')).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text='导入站点CSV', command=lambda: self.import_csv('sites')).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text='导出分类CSV', command=lambda: self.export_csv('categories')).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text='导出站点CSV', command=lambda: self.export_csv('sites')).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text='保存所有', command=self.save_all, bg='#4caf50', fg='white').pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text='一键生成所有ID', command=self.generate_all_ids, bg='#ff9800', fg='white').pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text='新增分类', command=self.add_category, bg='#8bc34a', fg='white').pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text='新增站点', command=self.add_site, bg='#03a9f4', fg='white').pack(side=tk.LEFT, padx=5)
    

        # 主体分栏
        main_pane = tk.PanedWindow(self.root, sashrelief=tk.RAISED, bg='#e0e0e0')
        main_pane.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # 左侧分类树
        left_frame = tk.Frame(main_pane, bd=2, relief=tk.GROOVE)
        tk.Label(left_frame, text='分类目录树', font=('微软雅黑', 12, 'bold')).pack(anchor='w', pady=5)
        self.tree = ttk.Treeview(left_frame, show='tree')
        self.tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        # 高亮标签（用于“内部”放置时的行背景突出）
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

    def show_sites(self, filter_cat=None):
        # 清理表格
        for i in self.site_table.get_children():
            self.site_table.delete(i)
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
            # 递归获取所有子分类id（字符串）
            all_cat_ids = [str(x) for x in self.get_all_subcats(str(filter_cat))]
            if 'category' in df.columns:
                df['category'] = df['category'].astype(str)
                df = df[df['category'].isin(all_cat_ids)]
        for idx, row in df.iterrows():
            self.site_table.insert('', 'end', iid=str(idx), values=list(row))

    def get_all_subcats(self, cat_id):
        # 获取所有子分类id（含自身）
        cat_id = str(cat_id)
        ids = [cat_id]
        def find_children(pid):
            children = self.categories[self.categories['parent'] == str(pid)]['id'].astype(str).tolist()
            for cid in children:
                ids.append(cid)
                find_children(cid)
        find_children(cat_id)
        return ids

    def edit_site_cell(self, event):
        item = self.site_table.selection()
        if not item:
            return
        item_id = item[0]
        col = self.site_table.identify_column(event.x)
        col_idx = int(col.replace('#','')) - 1
        old_value = self.site_table.item(item_id, 'values')[col_idx]
        new_value = self.simple_input('编辑字段', f'原值: {old_value}\n新值:')
        if new_value is not None:
            values = list(self.site_table.item(item_id, 'values'))
            values[col_idx] = new_value
            self.site_table.item(item_id, values=values)
            try:
                df_idx = int(item_id)
                col_name = self.site_table['columns'][col_idx]
                self.sites.loc[df_idx, col_name] = new_value
            except Exception:
                pass

    def simple_input(self, title, prompt):
        win = tk.Toplevel(self.root)
        win.title(title)
        tk.Label(win, text=prompt).pack(padx=10, pady=5)
        entry = tk.Entry(win)
        entry.pack(padx=10, pady=5)
        entry.focus()
        result = {'value': None}
        def on_ok():
            result['value'] = entry.get()
            win.destroy()
        tk.Button(win, text='确定', command=on_ok).pack(pady=5)
        win.wait_window()
        return result['value']

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

    # 分组重排: 将同一父分类(parent_id)下的顺序调整为 ordered_ids
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

    def _fill_tree_selector(self, tree, select_id=None):
        cats = self.categories.copy()
        cats['parent'] = cats['parent'].fillna('')
        def add_node(parent_id, tree_parent):
            children = cats[cats['parent'] == parent_id]
            for _, row in children.iterrows():
                node_id = str(row['id'])
                node = tree.insert(tree_parent, 'end', iid=node_id, text=str(row.get('name', node_id)))
                add_node(node_id, node)
        add_node('', '')
        if select_id and str(select_id):
            sid = str(select_id)
            try:
                # 展开到该节点
                p = sid
                while True:
                    p = tree.parent(p)
                    if not p:
                        break
                    tree.item(p, open=True)
                tree.selection_set(sid)
            except Exception:
                pass
        def on_click(event):
            item = tree.identify_row(event.y)
            if item:
                tree.selection_set(item)
        tree.bind('<ButtonRelease-1>', on_click)

    # 可扩展：批量操作、批量新增、批量删除等
    # 可根据需要添加批量操作按钮和逻辑

    def import_csv(self, which):
        file_path = filedialog.askopenfilename(title='导入CSV', filetypes=[('CSV文件','*.csv')])
        if not file_path:
            return
        try:
            new_df = pd.read_csv(file_path)
            if which == 'categories':
                if 'name' not in new_df.columns:
                    messagebox.showerror('导入失败', '分类CSV缺少 name 列')
                    return
                if 'parent' not in new_df.columns:
                    new_df['parent'] = ''
                if 'id' not in new_df.columns:
                    new_df['id'] = ''
                new_df['name'] = new_df['name'].astype(str).fillna('')
                new_df['parent'] = new_df['parent'].fillna('').astype(str)
                new_df['id'] = new_df['id'].fillna('').astype(str)
                used = set()
                ids = []
                for _, r in new_df.iterrows():
                    base = r['id'] if r['id'] else self._id_from_name_rule(r['name'])
                    ids.append(self._make_unique(base, used))
                new_df['id'] = ids
                self.categories = new_df
            else:
                if 'category' not in new_df.columns:
                    new_df['category'] = ''
                for c in new_df.columns:
                    new_df[c] = new_df[c].astype(str).fillna('')
                self.sites = new_df
            self._normalize_ids()
            self.show_tree()
            self.show_sites()
        except Exception as e:
            messagebox.showerror('导入失败', str(e))

    def export_csv(self, which):
        file_path = filedialog.asksaveasfilename(title='导出CSV', defaultextension='.csv', filetypes=[('CSV文件','*.csv')])
        if not file_path:
            return
        try:
            if which == 'categories':
                self.categories.to_csv(file_path, index=False)
            else:
                self.sites.to_csv(file_path, index=False)
            messagebox.showinfo('导出成功', f'已保存到: {file_path}')
        except Exception as e:
            messagebox.showerror('导出失败', str(e))

    def save_all(self):
        self.categories.to_csv(DATA_FILES['分类数据'], index=False)
        self.sites.to_csv(DATA_FILES['站点数据'], index=False)
        messagebox.showinfo('保存成功', '所有数据已保存')
    def on_tree_select(self, event):
        if self._suspend_tree_select:
            return
        sel = self.tree.selection()
        if not sel:
            self.show_sites()
            return
        cat_id = sel[0]
        self.show_sites(filter_cat=cat_id)

    # ===== ID 规则与唯一性 =====
    def _id_from_name_rule(self, name: str) -> str:
        if not isinstance(name, str) or not name:
            return 'id'
        # 如果没有 pypinyin，使用随机后缀保证唯一性
        if pinyin is None:
            return ('id' + uuid.uuid4().hex[:6]).lower()
        try:
            pys_full = pinyin(name, style=Style.NORMAL, errors='ignore')
            pys_first = pinyin(name[:-1], style=Style.FIRST_LETTER, errors='ignore') if len(name) > 1 else []
            parts = [x[0] for x in pys_first] + ([pys_full[-1][0]] if pys_full else [])
            candidate = ''.join(parts)
            # 如果 pypinyin 没有产出（例如纯拉丁字符），回退到 uuid 方案
            if not candidate:
                return ('id' + uuid.uuid4().hex[:6]).lower()
            return candidate
        except Exception:
            return ('id' + uuid.uuid4().hex[:6]).lower()

    def _make_unique(self, base: str, used: set) -> str:
        # 清理 base，保留小写字母、数字和下划线
        base = (base or 'id').lower()
        base = re.sub(r'[^a-z0-9_]', '', base)
        if not base:
            base = 'id' + uuid.uuid4().hex[:6]
        cand = base
        n = 2
        while cand in used or cand == '':
            cand = f"{base}{n}"
            n += 1
        used.add(cand)
        return cand

    # ===== 新增分类与站点 =====
    def add_category(self):
        if self.categories is None or self.categories.empty:
            self.categories = pd.DataFrame(columns=['id','name','parent'])
        columns = list(self.categories.columns)
        win = tk.Toplevel(self.root)
        win.title('新增分类')
        win.geometry('420x380')
        inputs = {}
        # 确定用于生成 ID 的名称字段（优先 name）
        name_field = 'name' if 'name' in columns else (columns[0] if columns else None)
        for col in columns:
            frame = tk.Frame(win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=col, width=12, anchor='w').pack(side=tk.LEFT)
            if col == 'parent':
                tree = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree, select_id='')
                tree.pack(side=tk.LEFT, fill=tk.X, expand=True)
                inputs[col] = tree
            elif col == 'id':
                ent = tk.Entry(frame)
                ent.pack(side=tk.LEFT, fill=tk.X, expand=True)
                inputs[col] = ent
                # 绑定当前 ent 和 name_field 到闭包，避免循环变量捕获问题
                def generate_id(ent=ent, name_field=name_field):
                    nm = ''
                    widget = inputs.get(name_field)
                    if widget is not None:
                        try:
                            if isinstance(widget, ttk.Treeview):
                                sel = widget.selection()
                                nm = sel[0] if sel else ''
                            else:
                                nm = widget.get()
                        except Exception:
                            nm = ''
                    used = set(self.categories['id'].astype(str)) if 'id' in self.categories.columns else set()
                    new_id = self._make_unique(self._id_from_name_rule(nm), used)
                    try:
                        ent.delete(0, tk.END)
                        ent.insert(0, new_id)
                    except Exception:
                        pass
                tk.Button(frame, text='自动生成ID', command=generate_id).pack(side=tk.LEFT, padx=5)
            else:
                ent = tk.Entry(frame)
                ent.pack(side=tk.LEFT, fill=tk.X, expand=True)
                inputs[col] = ent
        def on_save():
            data = {}
            for col in columns:
                if col == 'parent':
                    sel = inputs[col].selection()
                    data[col] = sel[0] if sel else ''
                else:
                    data[col] = inputs[col].get()
            used = set(self.categories['id'].astype(str)) if 'id' in self.categories.columns else set()
            if not data.get('id'):
                data['id'] = self._make_unique(self._id_from_name_rule(data.get(name_field,'')), used)
            elif data['id'] in used:
                data['id'] = self._make_unique(data['id'], used)
            self.categories = pd.concat([self.categories, pd.DataFrame([data])], ignore_index=True)
            self._normalize_ids(); self.show_tree(); self.show_sites(); win.destroy()
        tk.Button(win, text='保存', command=on_save, bg='#4caf50', fg='white').pack(pady=10)

    def add_site(self):
        if self.sites is None or self.sites.empty:
            self.sites = pd.DataFrame(columns=['id','name','category','url'])
        columns = list(self.sites.columns)
        win = tk.Toplevel(self.root)
        win.title('新增站点')
        win.geometry('480x440')
        inputs = {}
        # 确定用于生成 ID 的名称字段（站点优先 title，其次 name，最后取第一个非 id/category 列）
        if 'title' in columns:
            site_name_field = 'title'
        elif 'name' in columns:
            site_name_field = 'name'
        else:
            site_name_field = None
            for c in columns:
                if c not in ('id', 'category'):
                    site_name_field = c
                    break
        for col in columns:
            frame = tk.Frame(win)
            frame.pack(fill=tk.X, padx=10, pady=6)
            tk.Label(frame, text=col, width=12, anchor='w').pack(side=tk.LEFT)
            if col == 'category':
                tree = ttk.Treeview(frame, show='tree', height=6)
                self._fill_tree_selector(tree, select_id='')
                tree.pack(side=tk.LEFT, fill=tk.X, expand=True)
                inputs[col] = tree
            elif col == 'id':
                ent = tk.Entry(frame)
                ent.pack(side=tk.LEFT, fill=tk.X, expand=True)
                inputs[col] = ent
                # 绑定 ent 和 site_name_field 到闭包，避免被循环覆盖
                def generate_id(ent=ent, site_name_field=site_name_field):
                    nm = ''
                    widget = inputs.get(site_name_field)
                    if widget is not None:
                        try:
                            if isinstance(widget, ttk.Treeview):
                                sel = widget.selection()
                                nm = sel[0] if sel else ''
                            else:
                                nm = widget.get()
                        except Exception:
                            nm = ''
                    used = set(self.sites['id'].astype(str)) if 'id' in self.sites.columns else set()
                    new_id = self._make_unique(self._id_from_name_rule(nm), used)
                    try:
                        ent.delete(0, tk.END)
                        ent.insert(0, new_id)
                    except Exception:
                        pass
                tk.Button(frame, text='自动生成ID', command=generate_id).pack(side=tk.LEFT, padx=5)
            else:
                ent = tk.Entry(frame)
                ent.pack(side=tk.LEFT, fill=tk.X, expand=True)
                inputs[col] = ent
        def on_save():
            data = {}
            for col in columns:
                if col == 'category':
                    sel = inputs[col].selection()
                    data[col] = sel[0] if sel else ''
                else:
                    data[col] = inputs[col].get()
            if 'id' in columns:
                used = set(self.sites['id'].astype(str)) if 'id' in self.sites.columns else set()
                if not data.get('id'):
                    # 使用事先确定的站点名称字段
                    data['id'] = self._make_unique(self._id_from_name_rule(data.get(site_name_field,'')), used)
                elif data['id'] in used:
                    data['id'] = self._make_unique(data['id'], used)
            self.sites = pd.concat([self.sites, pd.DataFrame([data])], ignore_index=True)
            self._normalize_ids(); self.show_sites(); win.destroy()
        tk.Button(win, text='保存', command=on_save, bg='#4caf50', fg='white').pack(pady=10)

    def generate_all_ids(self):
        if self.categories is None or self.categories.empty:
            messagebox.showwarning('提示', '没有分类数据可生成ID。')
            return
        cats = self.categories.copy()
        cats['id'] = cats['id'].astype(str).fillna('') if 'id' in cats.columns else ''
        cats['name'] = cats['name'].astype(str).fillna('') if 'name' in cats.columns else ''
        used = set()
        id_map = {}
        for _, row in cats.iterrows():
            old_id = str(row.get('id',''))
            base = self._id_from_name_rule(str(row.get('name','')))
            new_id = self._make_unique(base, used)
            id_map[old_id] = new_id
        cats['id'] = cats['id'].map(lambda x: id_map.get(str(x), str(x)))
        if 'parent' in cats.columns:
            cats['parent'] = cats['parent'].fillna('').astype(str).map(lambda x: id_map.get(str(x), str(x)))
        if self.sites is not None and not self.sites.empty and 'category' in self.sites.columns:
            sites = self.sites.copy()
            sites['category'] = sites['category'].fillna('').astype(str).map(lambda x: id_map.get(str(x), str(x)))
            self.sites = sites
        # 为站点生成 ID（优先用 title 字段），确保唯一性
        if self.sites is not None and not self.sites.empty:
            sites_df = self.sites.copy()
            # 优先用 title 字段生成 ID
            name_col = None
            if 'title' in sites_df.columns:
                name_col = 'title'
            elif 'name' in sites_df.columns:
                name_col = 'name'
            else:
                name_col = sites_df.columns[0] if len(sites_df.columns)>0 else None
            if name_col:
                used_sites = set()
                new_ids = []
                for _, row in sites_df.iterrows():
                    nm = str(row.get(name_col, ''))
                    base = self._id_from_name_rule(nm)
                    uid = self._make_unique(base, used_sites)
                    new_ids.append(uid)
                sites_df['id'] = new_ids
                self.sites = sites_df
        self.categories = cats
        self._normalize_ids(); self.show_tree(); self.show_sites()
        messagebox.showinfo('ID生成完成', '所有分类ID已按规则生成，子分类与站点已级联更新。')

if __name__ == '__main__':
    root = tk.Tk()
    app = DataManagerGUI(root)
    root.mainloop()
