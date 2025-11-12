// ==UserScript==
// @name         MindVideo Information Extractor
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Extract useful information and analyze useful links from mindvideo.ai/zh
// @author       iudd
// @match        https://www.mindvideo.ai/zh/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .mindvideo-extractor-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            overflow-y: auto;
            cursor: move;
            user-select: none;
        }
        .mindvideo-extractor-panel.dragging {
            cursor: grabbing;
            opacity: 0.9;
        }
        .panel-header {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            color: #4CAF50;
            border-bottom: 1px solid #555;
            padding-bottom: 5px;
        }
        .panel-content h3 {
            margin: 15px 0 8px 0;
            color: #81c784;
            font-size: 15px;
        }
        .panel-content p {
            margin: 5px 0;
            line-height: 1.4;
        }
        .links-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .link-item {
            margin: 5px 0;
            padding: 5px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }
        .link-item a {
            color: #4CAF50;
            text-decoration: none;
        }
        .link-item a:hover {
            text-decoration: underline;
        }
        .link-type {
            color: #ffb74d;
            font-size: 12px;
        }
        .panel-close {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            color: #ff6b6b;
            font-size: 18px;
            line-height: 1;
        }
        .panel-close:hover {
            color: #ff5252;
        }
        .extractor-toggle {
            position: fixed;
            top: 20px;
            left: 20px;
            width: 50px;
            height: 50px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10001;
            font-size: 24px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .extractor-toggle:hover {
            background: #45a049;
            transform: scale(1.1);
        }
    `);

    // 拖拽功能类
    class DraggablePanel {
        constructor(panel) {
            this.panel = panel;
            this.isDragging = false;
            this.startX = 0;
            this.startY = 0;
            this.startLeft = 0;
            this.startTop = 0;
            
            this.init();
        }
        
        init() {
            this.panel.addEventListener('mousedown', this.startDrag.bind(this));
            document.addEventListener('mousemove', this.drag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));
            
            // 触摸支持
            this.panel.addEventListener('touchstart', this.startDragTouch.bind(this), { passive: false });
            document.addEventListener('touchmove', this.dragTouch.bind(this), { passive: false });
            document.addEventListener('touchend', this.stopDrag.bind(this));
        }
        
        startDrag(e) {
            this.isDragging = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            this.startLeft = rect.left;
            this.startTop = rect.top;
            
            this.panel.classList.add('dragging');
            e.preventDefault();
        }
        
        drag(e) {
            if (!this.isDragging) return;
            
            const deltaX = e.clientX - this.startX;
            const deltaY = e.clientY - this.startY;
            
            const newLeft = this.startLeft + deltaX;
            const newTop = this.startTop + deltaY;
            
            // 限制边界
            const maxLeft = window.innerWidth - this.panel.offsetWidth;
            const maxTop = window.innerHeight - this.panel.offsetHeight;
            
            this.panel.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            this.panel.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            
            e.preventDefault();
        }
        
        stopDrag() {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            this.panel.classList.remove('dragging');
        }
        
        startDragTouch(e) {
            if (e.touches.length === 1) {
                e.preventDefault();
                const touch = e.touches[0];
                this.startDrag({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => {}
                });
            }
        }
        
        dragTouch(e) {
            if (e.touches.length === 1) {
                e.preventDefault();
                const touch = e.touches[0];
                this.drag({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => {}
                });
            }
        }
    }

    // 提取和分析信息
    function extractInformation() {
        const info = {
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.content || '',
            url: window.location.href,
            links: []
        };
        
        // 提取所有链接
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        
        info.links = allLinks.map(a => {
            const href = a.href;
            const text = a.textContent.trim() || a.getAttribute('title') || '无文本';
            
            return {
                text: text,
                href: href,
                type: classifyLink(href),
                isExternal: !href.includes('mindvideo.ai')
            };
        }).filter(link => link.type !== 'other' && link.text.length > 0);
        
        return info;
    }
    
    // 分类链接
    function classifyLink(href) {
        const url = href.toLowerCase();
        
        if (url.includes('/docs') || url.includes('/tutorial') || url.includes('/guide') || url.includes('/help') || url.includes('教程') || url.includes('指南')) {
            return '教程/文档';
        }
        
        if (url.includes('/api') || url.includes('/developer') || url.includes('api文档')) {
            return 'API/开发';
        }
        
        if (url.includes('/pricing') || url.includes('/price') || url.includes('/plan') || url.includes('定价') || url.includes('价格')) {
            return '定价/套餐';
        }
        
        if (url.includes('/contact') || url.includes('/support') || url.includes('/help') || url.includes('联系') || url.includes('支持')) {
            return '联系/支持';
        }
        
        if (url.includes('/blog') || url.includes('/news') || url.includes('博客') || url.includes('新闻')) {
            return '博客/新闻';
        }
        
        if (url.includes('mindvideo.ai') && (url.includes('/zh/') || url.includes('/en/'))) {
            return '网站页面';
        }
        
        return 'other';
    }
    
    // 创建信息面板
    function createInfoPanel() {
        const info = extractInformation();
        
        const panel = document.createElement('div');
        panel.className = 'mindvideo-extractor-panel';
        panel.style.left = '20px'; // 初始位置
        panel.style.top = '20px';
        
        panel.innerHTML = `
            <div class="panel-header">📹 MindVideo 信息提取器</div>
            <div class="panel-content">
                <h3>📄 页面信息</h3>
                <p><strong>标题:</strong> ${info.title}</p>
                <p><strong>描述:</strong> ${info.description}</p>
                <p><strong>URL:</strong> <a href="${info.url}" target="_blank" style="color: #4CAF50;">${info.url}</a></p>
                
                <h3>🔗 有用链接 (${info.links.length})</h3>
                <div class="links-list">
                    ${info.links.map(link => `
                        <div class="link-item">
                            <a href="${link.href}" target="_blank">${link.text}</a>
                            <span class="link-type">(${link.type})</span>
                            ${link.isExternal ? '<span style="color: #ffb74d; font-size: 11px;">外部</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="panel-close">×</div>
        `;
        
        // 添加关闭事件
        panel.querySelector('.panel-close').onclick = () => panel.remove();
        
        // 添加拖拽功能
        new DraggablePanel(panel);
        
        document.body.appendChild(panel);
    }
    
    // 创建浮动按钮
    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'extractor-toggle';
        button.innerHTML = '📊';
        button.title = '提取MindVideo信息';
        button.onclick = createInfoPanel;
        document.body.appendChild(button);
    }
    
    // 初始化
    console.log('🚀 MindVideo 信息提取器已加载');
    createToggleButton();
    
})();