// ==UserScript==
// @name         MindVideo API Extractor
// @namespace    http://tampermonkey.net/
// @version      3.2.0
// @description  Extract API information from mindvideo.ai/zh for curl usage - Fixed Version
// @author       iudd
// @match        https://www.mindvideo.ai/zh/*
// @match        https://www.mindvideo.ai/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .mindvideo-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 520px;
            max-height: 85vh;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            border-radius: 10px;
            padding: 15px;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.6);
            overflow-y: auto;
            overflow-x: hidden;
            border: 1px solid #333;
        }
        .panel-header {
            font-weight: bold;
            font-size: 17px;
            margin-bottom: 12px;
            color: #4CAF50;
            border-bottom: 2px solid #555;
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .panel-section {
            margin: 12px 0;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #444;
            border-radius: 6px;
            padding: 12px;
        }
        .panel-section h4 {
            margin: 0 0 10px 0;
            color: #81c784;
            font-size: 15px;
            font-weight: bold;
        }
        .info-content {
            max-height: 220px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.4);
            padding: 10px;
            border-radius: 4px;
            font-size: 11px;
            border: 1px solid #666;
        }
        .info-content pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-all;
            color: #e8f5e8;
            line-height: 1.4;
        }
        .copy-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px 5px 5px 0;
            font-size: 11px;
            font-weight: bold;
            transition: all 0.2s;
        }
        .copy-btn:hover {
            background: #45a049;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }
        .copy-btn:active {
            transform: translateY(0);
        }
        .clear-btn {
            background: #f44336;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px 5px 5px 0;
            font-size: 11px;
            font-weight: bold;
            transition: all 0.2s;
        }
        .clear-btn:hover {
            background: #d32f2f;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
        }
        .toggle-btn {
            position: fixed;
            top: 20px;
            left: 20px;
            width: 55px;
            height: 55px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10001;
            font-size: 24px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            transition: all 0.3s;
        }
        .toggle-btn:hover {
            background: linear-gradient(135deg, #45a049, #4CAF50);
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        }
        .close-btn {
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            font-weight: bold;
            transition: all 0.2s;
        }
        .close-btn:hover {
            background: #ff2222;
            transform: scale(1.1);
        }
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
            background: #4CAF50;
            box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
        }
        .status-indicator.active {
            background: #ff9800;
            box-shadow: 0 0 6px rgba(255, 152, 0, 0.6);
        }
        .status-indicator.warning {
            background: #ff5722;
            box-shadow: 0 0 6px rgba(255, 87, 34, 0.6);
        }
        .no-data {
            color: #888;
            font-style: italic;
            padding: 15px;
            text-align: center;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
        }
        .refresh-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px 5px 5px 0;
            font-size: 11px;
            font-weight: bold;
            transition: all 0.2s;
        }
        .refresh-btn:hover {
            background: #1976D2;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
        }
        .auto-save-indicator {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #2196F3;
            margin-left: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .expand-btn {
            background: #9C27B0;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            margin-left: 8px;
        }
        .expand-btn:hover {
            background: #7B1FA2;
        }
        .collapsed {
            max-height: 50px;
            overflow: hidden;
        }
    `);

    // 全局变量
    let currentPanel = null;
    let capturedRequests = [];
    let capturedClicks = [];
    let originalFetch = null;
    let originalXHR = null;
    let isInterceptionActive = false;
    let autoSaveTimer = null;
    let collapsedSections = new Set();
    let clickTimeout = null;

    // 从存储加载数据
    function loadFromStorage() {
        try {
            const saved = GM_getValue('mindvideo_data', null);
            if (saved) {
                const data = JSON.parse(saved);
                capturedRequests = data.requests || [];
                capturedClicks = data.clicks || [];
                console.log('📥 从存储加载数据:', capturedRequests.length, '请求,', capturedClicks.length, '点击');
            }
        } catch (e) {
            console.error('加载存储数据失败:', e);
        }
    }

    // 保存到存储
    function saveToStorage() {
        try {
            const data = {
                requests: capturedRequests.slice(-50), // 只保存最近50条
                clicks: capturedClicks.slice(-50),
                timestamp: new Date().toISOString()
            };
            GM_setValue('mindvideo_data', JSON.stringify(data));
            console.log('💾 数据已自动保存');
        } catch (e) {
            console.error('保存数据失败:', e);
        }
    }

    // 启动自动保存
    function startAutoSave() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(saveToStorage, 10000); // 每10秒保存一次
    }

    // 提取页面信息
    function extractPageInfo() {
        const info = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toLocaleString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer
        };

        // 提取输入框信息
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="password"], textarea');
        inputs.forEach(input => {
            if (input.value && input.value.trim()) {
                info[input.name || input.id || 'input_' + Math.random().toString(36).substr(2, 9)] = input.value.trim();
            }
        });

        // 提取选择器信息
        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
            if (select.value) {
                info[select.name || select.id || 'select_' + Math.random().toString(36).substr(2, 9)] = select.value;
            }
        });

        // 提取单选框和复选框
        const radios = document.querySelectorAll('input[type="radio"]:checked');
        radios.forEach(radio => {
            info[radio.name || 'radio_' + Math.random().toString(36).substr(2, 9)] = radio.value;
        });

        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            info[checkbox.name || 'checkbox_' + Math.random().toString(36).substr(2, 9)] = checkbox.value;
        });

        // 提取按钮信息
        const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
        info.buttons = Array.from(buttons).map(btn => ({
            text: btn.textContent?.trim() || btn.value?.trim(),
            class: btn.className,
            id: btn.id,
            disabled: btn.disabled,
            type: btn.type
        }));

        return info;
    }

    // 提取视频链接
    function extractVideoLinks() {
        const links = [];

        // 查找video元素
        document.querySelectorAll('video').forEach(video => {
            if (video.src) {
                links.push({
                    type: 'video',
                    url: video.src,
                    poster: video.poster,
                    duration: video.duration,
                    timestamp: new Date().toLocaleString()
                });
            }
            // 检查video的子元素source
            video.querySelectorAll('source').forEach(source => {
                if (source.src) {
                    links.push({
                        type: 'video_source',
                        url: source.src,
                        type: source.type,
                        timestamp: new Date().toLocaleString()
                    });
                }
            });
        });

        // 查找独立的source元素
        document.querySelectorAll('source').forEach(source => {
            if (source.src && !source.closest('video')) {
                links.push({
                    type: 'source',
                    url: source.src,
                    type: source.type,
                    timestamp: new Date().toLocaleString()
                });
            }
        });

        // 查找下载链接
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.href;
            if (href && (
                href.includes('.mp4') ||
                href.includes('.mov') ||
                href.includes('.avi') ||
                href.includes('.webm') ||
                href.includes('video') ||
                href.includes('download') ||
                href.includes('export')
            )) {
                links.push({
                    type: 'download',
                    url: href,
                    text: link.textContent?.trim(),
                    title: link.title,
                    timestamp: new Date().toLocaleString()
                });
            }
        });

        // 查找可能的API响应中的链接
        document.querySelectorAll('*').forEach(el => {
            const text = el.textContent;
            if (text && (
                text.includes('.mp4') ||
                text.includes('video') ||
                text.includes('cdn.mindvideo')
            )) {
                const urls = text.match(/https?:\/\/[^\s"'<>]+/g);
                if (urls) {
                    urls.forEach(url => {
                        if (url.includes('.mp4') || url.includes('video') || url.includes('cdn.mindvideo')) {
                            links.push({
                                type: 'text_url',
                                url: url,
                                context: text.substring(0, 100) + '...',
                                timestamp: new Date().toLocaleString()
                            });
                        }
                    });
                }
            }
        });

        return links;
    }

    // 拦截网络请求
    function startInterception() {
        if (isInterceptionActive) return;

        isInterceptionActive = true;
        console.log('🕸️ 开始拦截网络请求...');

        // 拦截fetch
        originalFetch = window.fetch;
        window.fetch = function(...args) {
            const [url, options = {}] = args;

            const requestInfo = {
                type: 'fetch',
                method: options.method || 'GET',
                url: typeof url === 'string' ? url : '',
                headers: options.headers || {},
                body: options.body || null,
                timestamp: new Date().toLocaleString()
            };

            // 检查是否是相关API请求 - 扩大检测范围
            if (requestInfo.url && (
                requestInfo.url.includes('/api/') ||
                requestInfo.url.includes('/v1/') ||
                requestInfo.url.includes('generate') ||
                requestInfo.url.includes('create') ||
                requestInfo.url.includes('video') ||
                requestInfo.url.includes('submit') ||
                requestInfo.url.includes('upload') ||
                requestInfo.url.includes('process') ||
                requestInfo.url.includes('mindvideo.ai') ||
                requestInfo.url.includes('cdn.mindvideo') ||
                (options.method && options.method !== 'GET') ||
                (options.body && typeof options.body === 'string' && options.body.length > 10)
            )) {
                capturedRequests.push(requestInfo);
                console.log('📡 捕获API请求:', requestInfo.method, requestInfo.url);
                updatePanel();
            }

            return originalFetch.apply(this, args);
        };

        // 拦截XHR
        originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;

            let requestInfo = {};

            xhr.open = function(method, url, ...args) {
                requestInfo = {
                    type: 'xhr',
                    method: method,
                    url: url,
                    headers: {},
                    timestamp: new Date().toLocaleString()
                };
                return originalOpen.call(this, method, url, ...args);
            };

            xhr.setRequestHeader = function(header, value) {
                requestInfo.headers[header] = value;
            };

            xhr.send = function(body) {
                requestInfo.body = body;

                // 检查是否是相关API请求 - 扩大检测范围
                if (requestInfo.url && (
                    requestInfo.url.includes('/api/') ||
                    requestInfo.url.includes('/v1/') ||
                    requestInfo.url.includes('generate') ||
                    requestInfo.url.includes('create') ||
                    requestInfo.url.includes('video') ||
                    requestInfo.url.includes('submit') ||
                    requestInfo.url.includes('upload') ||
                    requestInfo.url.includes('process') ||
                    requestInfo.url.includes('mindvideo.ai') ||
                    requestInfo.url.includes('cdn.mindvideo') ||
                    requestInfo.method !== 'GET' ||
                    (requestInfo.body && requestInfo.body.length > 10)
                )) {
                    capturedRequests.push(requestInfo);
                    console.log('📡 捕获XHR请求:', requestInfo.method, requestInfo.url);
                    updatePanel();
                }

                return originalSend.call(this, body);
            };

            return xhr;
        };
    }

    // 停止拦截
    function stopInterception() {
        if (!isInterceptionActive) return;

        if (originalFetch) {
            window.fetch = originalFetch;
            originalFetch = null;
        }

        if (originalXHR) {
            window.XMLHttpRequest = originalXHR;
            originalXHR = null;
        }

        isInterceptionActive = false;
        console.log('🛑 停止拦截网络请求');
    }

    // 生成curl命令
    function generateCurlCommand(request) {
        let curl = `curl -X ${request.method} "${request.url}"`;

        // 添加headers
        for (const [key, value] of Object.entries(request.headers)) {
            curl += ` \\\n  -H "${key}: ${value}"`;
        }

        // 添加body
        if (request.body) {
            let body = request.body;
            if (typeof body === 'string') {
                // 转义引号和换行符
                body = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
            } else {
                body = JSON.stringify(body).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            }
            curl += ` \\\n  -d "${body}"`;
        }

        return curl;
    }

    // 复制到剪贴板 - 改进版本
    function copyToClipboard(text) {
        // 方法1: 使用现代clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('已复制到剪贴板！');
            }).catch(err => {
                console.error('Clipboard API failed:', err);
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    // 备用复制方法
    function fallbackCopy(text) {
        try {
            // 创建临时元素
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);

            // 选择并复制
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                showNotification('已复制到剪贴板！');
            } else {
                throw new Error('execCommand failed');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            showNotification('复制失败，请手动选择文本复制');

            // 最后尝试：显示文本让用户手动复制
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: black;
                color: white;
                padding: 20px;
                border-radius: 8px;
                z-index: 10002;
                max-width: 500px;
                max-height: 400px;
                overflow: auto;
                border: 2px solid #4CAF50;
            `;
            modal.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #4CAF50;">请手动复制以下内容：</h3>
                <textarea style="width: 100%; height: 200px; background: #333; color: white; border: 1px solid #666; padding: 10px; font-family: monospace; font-size: 12px;" readonly>${text}</textarea>
                <button style="margin-top: 10px; background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;" onclick="this.parentNode.remove()">关闭</button>
            `;
            document.body.appendChild(modal);
        }
    }

    // 显示通知
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 10002;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2500);
    }

    // 监听按钮点击 - 修复拦截问题
    function startClickMonitoring() {
        // 使用事件委托，避免阻止事件传播
        document.addEventListener('click', function(e) {
            // 不阻止事件传播，让原始事件继续
            // 只记录点击信息，不干扰功能

            const target = e.target;
            if (target.tagName === 'BUTTON' || target.type === 'submit' || target.closest('button')) {
                const button = target.closest('button') || target;

                // 延迟记录，避免干扰点击
                if (clickTimeout) clearTimeout(clickTimeout);
                clickTimeout = setTimeout(() => {
                    capturedClicks.push({
                        type: 'click',
                        text: button.textContent?.trim() || button.value?.trim(),
                        class: button.className,
                        id: button.id,
                        name: button.name,
                        tagName: button.tagName,
                        timestamp: new Date().toLocaleString()
                    });
                    console.log('👆 记录点击:', button.textContent?.trim());
                    updatePanel();
                }, 100); // 延迟100ms记录
            }
        }, true); // 使用捕获阶段，但不阻止传播

        document.addEventListener('submit', function(e) {
            // 记录表单提交，但不阻止
            setTimeout(() => {
                capturedClicks.push({
                    type: 'submit',
                    action: e.target.action,
                    method: e.target.method,
                    timestamp: new Date().toLocaleString()
                });
                console.log('📋 记录表单提交:', e.target.action);
                updatePanel();
            }, 100);
        }, true); // 使用捕获阶段
    }

    // 切换折叠状态
    function toggleCollapse(sectionId) {
        if (collapsedSections.has(sectionId)) {
            collapsedSections.delete(sectionId);
        } else {
            collapsedSections.add(sectionId);
        }
        updatePanel();
    }

    // 更新面板
    function updatePanel() {
        if (!currentPanel) return;

        const pageInfo = extractPageInfo();
        const videoLinks = extractVideoLinks();

        let html = `
            <div class="panel-header">
                🎯 MindVideo API提取器 v3.2
                <div>
                    <span class="auto-save-indicator" title="自动保存中"></span>
                    <button class="close-btn" onclick="this.closest('.mindvideo-panel').remove()">×</button>
                </div>
            </div>
        `;

        // 页面信息
        const pageCollapsed = collapsedSections.has('page');
        html += `
            <div class="panel-section">
                <h4 onclick="toggleCollapse('page')" style="cursor: pointer;">
                    <span class="status-indicator"></span>
                    📄 页面信息
                    <button class="expand-btn">${pageCollapsed ? '展开' : '折叠'}</button>
                </h4>
                <div class="info-content ${pageCollapsed ? 'collapsed' : ''}">
                    <pre>${JSON.stringify(pageInfo, null, 2)}</pre>
                </div>
                <button class="copy-btn" onclick="copyToClipboard(\`${JSON.stringify(pageInfo, null, 2).replace(/`/g, '\\`')}\`)">复制</button>
            </div>
        `;

        // 视频链接
        const videoCollapsed = collapsedSections.has('video');
        html += `
            <div class="panel-section">
                <h4 onclick="toggleCollapse('video')" style="cursor: pointer;">
                    <span class="status-indicator ${videoLinks.length > 0 ? '' : 'warning'}"></span>
                    🎬 视频链接 (${videoLinks.length})
                    <button class="expand-btn">${videoCollapsed ? '展开' : '折叠'}</button>
                </h4>
                ${videoLinks.length > 0 ?
                    `<div class="info-content ${videoCollapsed ? 'collapsed' : ''}"><pre>${JSON.stringify(videoLinks.slice(-15), null, 2)}</pre></div>` :
                    '<div class="no-data">暂无视频链接，点击"创建"按钮生成视频</div>'
                }
                ${videoLinks.length > 0 ? `<button class="copy-btn" onclick="copyToClipboard(\`${JSON.stringify(videoLinks.slice(-15), null, 2).replace(/`/g, '\\`')}\`)">复制</button>` : ''}
            </div>
        `;

        // API请求
        const apiCollapsed = collapsedSections.has('api');
        html += `
            <div class="panel-section">
                <h4 onclick="toggleCollapse('api')" style="cursor: pointer;">
                    <span class="status-indicator ${isInterceptionActive ? 'active' : ''}"></span>
                    📡 API请求 (${capturedRequests.length})
                    <button class="expand-btn">${apiCollapsed ? '展开' : '折叠'}</button>
                </h4>
                ${capturedRequests.length > 0 ?
                    `<div class="info-content ${apiCollapsed ? 'collapsed' : ''}"><pre>${JSON.stringify(capturedRequests.slice(-15), null, 2)}</pre></div>` :
                    '<div class="no-data">暂无API请求，请点击"创建"按钮触发请求</div>'
                }
                ${capturedRequests.length > 0 ? `<button class="copy-btn" onclick="copyToClipboard(\`${JSON.stringify(capturedRequests.slice(-15), null, 2).replace(/`/g, '\\`')}\`)">复制</button>` : ''}
            </div>
        `;

        // 点击事件
        const clickCollapsed = collapsedSections.has('click');
        html += `
            <div class="panel-section">
                <h4 onclick="toggleCollapse('click')" style="cursor: pointer;">
                    <span class="status-indicator"></span>
                    👆 点击事件 (${capturedClicks.length})
                    <button class="expand-btn">${clickCollapsed ? '展开' : '折叠'}</button>
                </h4>
                ${capturedClicks.length > 0 ?
                    `<div class="info-content ${clickCollapsed ? 'collapsed' : ''}"><pre>${JSON.stringify(capturedClicks.slice(-15), null, 2)}</pre></div>` :
                    '<div class="no-data">暂无点击事件</div>'
                }
                ${capturedClicks.length > 0 ? `<button class="copy-btn" onclick="copyToClipboard(\`${JSON.stringify(capturedClicks.slice(-15), null, 2).replace(/`/g, '\\`')}\`)">复制</button>` : ''}
            </div>
        `;

        // Curl命令
        if (capturedRequests.length > 0) {
            const curlCollapsed = collapsedSections.has('curl');
            html += `<div class="panel-section">
                <h4 onclick="toggleCollapse('curl')" style="cursor: pointer;">
                    🔧 Curl命令
                    <button class="expand-btn">${curlCollapsed ? '展开' : '折叠'}</button>
                </h4>`;
            if (!curlCollapsed) {
                capturedRequests.forEach((request, index) => {
                    if (request.method && request.url) {
                        const curl = generateCurlCommand(request);
                        html += `
                            <div class="info-content">
                                <pre>命令 ${index + 1}:\n${curl}</pre>
                                <button class="copy-btn" onclick="copyToClipboard(\`${curl.replace(/`/g, '\\`')}\`)">复制</button>
                            </div>
                        `;
                    }
                });
            }
            html += '</div>';
        }

        // 操作按钮
        html += `
            <div class="panel-section">
                <button class="copy-btn" onclick="startInterception()">开始拦截</button>
                <button class="copy-btn" onclick="stopInterception()">停止拦截</button>
                <button class="refresh-btn" onclick="updatePanel()">刷新</button>
                <button class="clear-btn" onclick="capturedRequests=[];capturedClicks=[];saveToStorage();updatePanel()">清空</button>
            </div>
        `;

        currentPanel.innerHTML = html;
    }

    // 创建面板
    function createPanel() {
        if (currentPanel) {
            currentPanel.remove();
            currentPanel = null;
            stopInterception();
            return;
        }

        currentPanel = document.createElement('div');
        currentPanel.className = 'mindvideo-panel';
        currentPanel.innerHTML = `
            <div class="panel-header">
                🎯 MindVideo API提取器 v3.2
                <div>
                    <span class="auto-save-indicator" title="自动保存中"></span>
                    <button class="close-btn" onclick="this.closest('.mindvideo-panel').remove()">×</button>
                </div>
            </div>
            <div class="panel-section">
                <div class="no-data">正在初始化...</div>
            </div>
        `;

        document.body.appendChild(currentPanel);

        // 开始监控
        startInterception();
        startClickMonitoring();
        updatePanel();

        // 每5秒更新一次
        setInterval(updatePanel, 5000);
    }

    // 创建浮动按钮
    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'toggle-btn';
        button.innerHTML = '🎯';
        button.title = 'MindVideo API提取器 v3.2';
        button.onclick = createPanel;
        document.body.appendChild(button);
    }

    // 初始化
    function init() {
        loadFromStorage();
        createToggleButton();
        startAutoSave();
        console.log('🎯 MindVideo API提取器 v3.2 已加载 - 修复版');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 全局函数
    window.startInterception = startInterception;
    window.stopInterception = stopInterception;
    window.copyToClipboard = copyToClipboard;
    window.toggleCollapse = toggleCollapse;
    window.saveToStorage = saveToStorage;

})();