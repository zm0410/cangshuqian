#!/usr/bin/env python3
"""
创建应用程序图标的脚本
这个脚本会生成一个简单的图标文件
"""

from PIL import Image, ImageDraw
import os

def create_icon():
    """创建一个简单的应用程序图标"""
    # 创建一个 64x64 像素的图像
    size = 64
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制一个蓝色的圆形作为图标背景
    center = size // 2
    radius = size // 2 - 5
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                 fill=(66, 133, 244, 255))  # 蓝色
    
    # 绘制一个白色的"D"字母
    font_size = size // 2
    # 由于PIL的字体支持有限，我们简单绘制一个矩形代表"D"
    draw.rectangle([center - radius//2, center - radius//2, center, center + radius//2], 
                   fill=(255, 255, 255, 255))
    
    # 保存为ICO文件
    img.save('app_icon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("图标文件 'app_icon.ico' 已创建")

if __name__ == "__main__":
    try:
        create_icon()
        print("图标创建成功！")
    except ImportError:
        print("需要安装PIL库来创建图标")
        print("请运行: pip install Pillow")
    except Exception as e:
        print(f"创建图标失败: {e}")