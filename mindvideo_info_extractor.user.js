// ==UserScript==
// @name         MindVideo Information Extractor
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Extract useful information and analyze useful links from mindvideo.ai/zh, including generated video links
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
        .video-link {
            color: #ff5722 !important;
            font-weight: bold;
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

    // 全局变量
    let currentPanel = null;
    let videoLinks = [];
    let observer = null;

    // 提取和分析信息
    function extractInformation() {
        const info = {
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.content || '',
            url: window.location.href,
            links: [],
            videoLinks: videoLinks.slice() // 复制当前视频链接
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

    // 提取视频链接
    function extractVideoLinks() {
        // 查找视频元素
        const videoElements = document.querySelectorAll('video, source[type*="video"]');
        const videoUrls = [];
        
        videoElements.forEach(video => {
            if (video.src) {
                videoUrls.push({
                    url: video.src,
                    type: 'video',
                    timestamp: new Date().toLocaleString()
                });
            }
            if (video.currentSrc && video.currentSrc !== video.src) {
                videoUrls.push({
                    url: video.currentSrc,
                    type: 'video',
                    timestamp: new Date().toLocaleString()
                });
            }
        });
        
        // 查找视频下载链接
        const downloadLinks = document.querySelectorAll('a[href*="download"], a[href*="video"], a[href*="mp4"], a[href*="mov"]');
        downloadLinks.forEach(link => {
            if (link.href && (link.href.includes('video') || link.href.includes('mp4') || link.href.includes('mov') || link.href.includes('download'))) {
                videoUrls.push({
                    url: link.href,
                    type: 'download',
                    timestamp: new Date().toLocaleString()
                });
            }
        });
        
        // 查找可能包含视频URL的元素
        const potentialVideoContainers = document.querySelectorAll('[data-video-url], [data-src], .video-container, .player');
        potentialVideoContainers.forEach(container => {
            const videoUrl = container.getAttribute('data-video-url') || container.getAttribute('data-src');
            if (videoUrl && (videoUrl.includes('video') || videoUrl.includes('mp4') || videoUrl.includes('mov'))) {
                videoUrls.push({
                    url: videoUrl,
                    type: 'data-url',
                    timestamp: new Date().toLocaleString()
                });
            }
        });
        
        // 去重
        const uniqueUrls = [];
        const seen = new Set();
        videoUrls.forEach(item => {
            if (!seen.has(item.url)) {
                seen.add(item.url);
                uniqueUrls.push(item);
            }
        });
        
        return uniqueUrls;
    }

    // 更新视频链接
    function updateVideoLinks() {
        const newVideoLinks = extractVideoLinks();
        const added = [];
        
        newVideoLinks.forEach(link => {
            if (!videoLinks.find(existing => existing.url === link.url)) {
                videoLinks.push(link);
                added.push(link);
            }
        });
        
        if (added.length > 0 && currentPanel) {
            updatePanel();
        }
        
        return added;
    }

    // 监听页面变化
    function startObserving() {
        if (observer) return;
        
        observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // 检查是否有新元素添加
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'VIDEO' || node.querySelector('video') ||
                                node.getAttribute && (node.getAttribute('data-video-url') || node.getAttribute('data-src')) ||
                                node.classList && (node.classList.contains('video-container') || node.classList.contains('player'))) {
                                shouldUpdate = true;
                            }
                        }
                    });
                } else if (mutation.type === 'attributes') {
                    // 检查属性变化
                    if (mutation.attributeName === 'src' || mutation.attributeName === 'data-video-url' || mutation.attributeName === 'data-src') {
                        shouldUpdate = true;
                    }
                }
            });
            
            if (shouldUpdate) {
                setTimeout(updateVideoLinks, 1000); // 延迟1秒以确保内容加载完成
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'data-video-url', 'data-src']
        });
    }

    // 监听生成按钮点击
    function listenForGenerateButton() {
        // 查找可能的生成按钮
        const possibleSelectors = [
            'button[type="submit"]',
            'button:contains("生成")',
            'button:contains("Generate")',
            'button:contains("创建")',
            'button:contains("Create")',
            '.generate-btn',
            '#generate-btn',
            '[data-action="generate"]'
        ];
        
        possibleSelectors.forEach(selector => {
            try {
                const buttons = document.querySelectorAll(selector);
                buttons.forEach(button => {
                    if (!button.hasAttribute('data-extractor-listened')) {
                        button.setAttribute('data-extractor-listened', 'true');
                        button.addEventListener('click', () => {
                            console.log('🎬 检测到生成按钮点击，开始监听视频链接...');
                            setTimeout(updateVideoLinks, 2000); // 2秒后检查
                            setTimeout(updateVideoLinks, 5000); // 5秒后检查
                            setTimeout(updateVideoLinks, 10000); // 10秒后检查
                        });
                    }
                });
            } catch (e) {
                // 忽略选择器错误
            }
        });
        
        // 每隔5秒重新检查按钮（动态加载的按钮）
        setInterval(listenForGenerateButton, 5000);
    }

    // 更新面板
    function updatePanel() {
        if (!currentPanel) return;
        
        const info = extractInformation();
        
        const linksHtml = info.links.map(link => `
            <div class="link-item">
                <a href="${link.href}" target="_blank">${link.text}</a>
                <span class="link-type">(${link.type})</span>
                ${link.isExternal ? '<span style="color: #ffb74d; font-size: 11px;">外部</span>' : ''}
            </div>
        `).join('');
        
        const videoLinksHtml = info.videoLinks.map(link => `
            <div class="link-item">
                <a href="${link.url}" target="_blank" class="video-link">🎬 ${link.type.toUpperCase()} - ${link.timestamp}</a>
            </div>
        `).join('');
        
        currentPanel.querySelector('.panel-content').innerHTML = `
            <h3>📄 页面信息</h3>
            <p><strong>标题:</strong> ${info.title}</p>
            <p><strong>描述:</strong> ${info.description}</p>
            <p><strong>URL:</strong> <a href="${info.url}" target="_blank" style="color: #4CAF50;">${info.url}</a></p>
            
            <h3>🎬 生成的视频链接 (${info.videoLinks.length})</h3>
            <div class="links-list">
                ${videoLinksHtml || '<p style="color: #888;">暂无视频链接，点击生成按钮后会自动检测</p>'}
            </div>
            
            <h3>🔗 有用链接 (${info.links.length})</h3>
            <div class="links-list">
                ${linksHtml}
            </div>
        `;
    }

    // 创建信息面板
    function createInfoPanel() {
        if (currentPanel) {
            currentPanel.remove();
            currentPanel = null;
            return;
        }
        
        const info = extractInformation();
        
        const panel = document.createElement('div');
        panel.className = 'mindvideo-extractor-panel';
        panel.style.left = '20px';
        panel.style.top = '20px';
        
        panel.innerHTML = `
            <div class="panel-header">📹 MindVideo 信息提取器</div>
            <div class="panel-content">
                <h3>📄 页面信息</h3>
                <p><strong>标题:</strong> ${info.title}</p>
                <p><strong>描述:</strong> ${info.description}</p>
                <p><strong>URL:</strong> <a href="${info.url}" target="_blank" style="color: #4CAF50;">${info.url}</a></p>
                
                <h3>🎬 生成的视频链接 (${info.videoLinks.length})</h3>
                <div class="links-list">
                    ${info.videoLinks.map(link => `
                        <div class="link-item">
                            <a href="${link.url}" target="_blank" class="video-link">🎬 ${link.type.toUpperCase()} - ${link.timestamp}</a>
                        </div>
                    `).join('') || '<p style="color: #888;">暂无视频链接，点击生成按钮后会自动检测</p>'}
                </div>
                
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
        panel.querySelector('.panel-close').onclick = () => {
            panel.remove();
            currentPanel = null;
        };
        
        // 添加拖拽功能
        new DraggablePanel(panel);
        
        document.body.appendChild(panel);
        currentPanel = panel;
        
        // 开始监听页面变化
        startObserving();
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
    console.log('🚀 MindVideo 信息提取器已加载 - 支持视频链接检测');
    createToggleButton();
    listenForGenerateButton();
    startObserving();
    
    // 定期更新视频链接
    setInterval(updateVideoLinks, 30000); // 每30秒检查一次
    
})();