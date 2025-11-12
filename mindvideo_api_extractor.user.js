// ==UserScript==
// @name         MindVideo API Extractor
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Extract API information from mindvideo.ai/zh for curl usage
// @author       iudd
// @match        https://www.mindvideo.ai/zh/*
// @match        https://www.mindvideo.ai/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .mindvideo-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 500px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            overflow-y: auto;
            overflow-x: hidden;
        }
        .panel-header {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            color: #4CAF50;
            border-bottom: 1px solid #555;
            padding-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .panel-section {
            margin: 15px 0;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #555;
            border-radius: 4px;
            padding: 10px;
        }
        .panel-section h4 {
            margin: 0 0 8px 0;
            color: #81c784;
            font-size: 14px;
        }
        .info-content {
            max-height: 200px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.3);
            padding: 8px;
            border-radius: 4px;
            font-size: 11px;
        }
        .info-content pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-all;
            color: #e8f5e8;
        }
        .copy-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin: 5px 5px 5px 0;
            font-size: 11px;
        }
        .copy-btn:hover {
            background: #45a049;
        }
        .clear-btn {
            background: #f44336;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin: 5px 5px 5px 0;
            font-size: 11px;
        }
        .clear-btn:hover {
            background: #d32f2f;
        }
        .toggle-btn {
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
        .toggle-btn:hover {
            background: #45a049;
            transform: scale(1.1);
        }
        .close-btn {
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            cursor: pointer;
            font-size: 12px;
            line-height: 1;
        }
        .close-btn:hover {
            background: #ff2222;
        }
        .status-indicator {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-right: 5px;
            background: #4CAF50;
        }
        .status-indicator.active {
            background: #ff9800;
        }
        .no-data {
            color: #888;
            font-style: italic;
            padding: 10px;
            text-align: center;
        }
    `);

    // 全局变量
    let currentPanel = null;
    let capturedRequests = [];
    let capturedClicks = [];
    let originalFetch = null;
    let originalXHR = null;
    let isInterceptionActive = false;

    // 提取页面信息
    function extractPageInfo() {
        const info = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toLocaleString(),
            userAgent: navigator.userAgent
        };

        // 提取输入框信息
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
        inputs.forEach(input => {
            if (input.value && input.value.trim()) {
                info[input.name || input.id || 'input'] = input.value.trim();
            }
        });

        // 提取选择器信息
        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
            if (select.value) {
                info[select.name || select.id || 'select'] = select.value;
            }
        });

        // 提取按钮信息
        const buttons = document.querySelectorAll('button');
        info.buttons = Array.from(buttons).map(btn => ({
            text: btn.textContent?.trim(),
            class: btn.className,
            id: btn.id,
            disabled: btn.disabled
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
                    timestamp: new Date().toLocaleString()
                });
            }
        });

        // 查找source元素
        document.querySelectorAll('source').forEach(source => {
            if (source.src) {
                links.push({
                    type: 'source',
                    url: source.src,
                    timestamp: new Date().toLocaleString()
                });
            }
        });

        // 查找下载链接
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.href;
            if (href && (href.includes('.mp4') || href.includes('video') || href.includes('download'))) {
                links.push({
                    type: 'download',
                    url: href,
                    text: link.textContent?.trim(),
                    timestamp: new Date().toLocaleString()
                });
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

            // 检查是否是相关API请求
            if (requestInfo.url && (
                requestInfo.url.includes('/api/') || 
                requestInfo.url.includes('generate') || 
                requestInfo.url.includes('create') || 
                requestInfo.url.includes('video') ||
                requestInfo.url.includes('submit')
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

                // 检查是否是相关API请求
                if (requestInfo.url && (
                    requestInfo.url.includes('/api/') || 
                    requestInfo.url.includes('generate') || 
                    requestInfo.url.includes('create') || 
                    requestInfo.url.includes('video')
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
            const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
            curl += ` \\\n  -d "${body.replace(/"/g, '\\"')}"`;
        }

        return curl;
    }

    // 复制到剪贴板
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        // 显示提示
        const notification = document.createElement('div');
        notification.textContent = '已复制到剪贴板！';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10002;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2000);
    }

    // 监听按钮点击
    function startClickMonitoring() {
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.tagName === 'BUTTON' || target.type === 'submit' || target.closest('button')) {
                const button = target.closest('button') || target;
                capturedClicks.push({
                    type: 'click',
                    text: button.textContent?.trim(),
                    class: button.className,
                    id: button.id,
                    timestamp: new Date().toLocaleString()
                });
                console.log('👆 点击按钮:', button.textContent);
                updatePanel();
            }
        }, true);

        document.addEventListener('submit', function(e) {
            capturedClicks.push({
                type: 'submit',
                action: e.target.action,
                method: e.target.method,
                timestamp: new Date().toLocaleString()
            });
            console.log('📋 表单提交:', e.target.action);
            updatePanel();
        }, true);
    }

    // 更新面板
    function updatePanel() {
        if (!currentPanel) return;

        const pageInfo = extractPageInfo();
        const videoLinks = extractVideoLinks();

        let html = `
            <div class="panel-header">
                🎯 MindVideo API提取器 v3.0
                <button class="close-btn" onclick="this.closest('.mindvideo-panel').remove()">×</button>
            </div>
        `;

        // 页面信息
        html += `
            <div class="panel-section">
                <h4>
                    <span class="status-indicator"></span>
                    📄 页面信息
                </h4>
                <div class="info-content">
                    <pre>${JSON.stringify(pageInfo, null, 2)}</pre>
                </div>
                <button class="copy-btn" onclick="copyToClipboard(JSON.stringify(${JSON.stringify(pageInfo)}, null, 2))">复制</button>
            </div>
        `;

        // 视频链接
        html += `
            <div class="panel-section">
                <h4>
                    <span class="status-indicator ${videoLinks.length > 0 ? '' : 'active'}"></span>
                    🎬 视频链接 (${videoLinks.length})
                </h4>
                ${videoLinks.length > 0 ? 
                    `<div class="info-content"><pre>${JSON.stringify(videoLinks.slice(-10), null, 2)}</pre></div>` :
                    '<div class="no-data">暂无视频链接</div>'
                }
                ${videoLinks.length > 0 ? `<button class="copy-btn" onclick="copyToClipboard(JSON.stringify(${JSON.stringify(videoLinks.slice(-10))}, null, 2))">复制</button>` : ''}
            </div>
        `;

        // API请求
        html += `
            <div class="panel-section">
                <h4>
                    <span class="status-indicator ${isInterceptionActive ? 'active' : ''}"></span>
                    📡 API请求 (${capturedRequests.length})
                </h4>
                ${capturedRequests.length > 0 ? 
                    `<div class="info-content"><pre>${JSON.stringify(capturedRequests.slice(-10), null, 2)}</pre></div>` :
                    '<div class="no-data">暂无API请求，请点击"创建"按钮</div>'
                }
                ${capturedRequests.length > 0 ? `<button class="copy-btn" onclick="copyToClipboard(JSON.stringify(${JSON.stringify(capturedRequests.slice(-10))}, null, 2))">复制</button>` : ''}
            </div>
        `;

        // 点击事件
        html += `
            <div class="panel-section">
                <h4>
                    <span class="status-indicator"></span>
                    👆 点击事件 (${capturedClicks.length})
                </h4>
                ${capturedClicks.length > 0 ? 
                    `<div class="info-content"><pre>${JSON.stringify(capturedClicks.slice(-10), null, 2)}</pre></div>` :
                    '<div class="no-data">暂无点击事件</div>'
                }
                ${capturedClicks.length > 0 ? `<button class="copy-btn" onclick="copyToClipboard(JSON.stringify(${JSON.stringify(capturedClicks.slice(-10))}, null, 2))">复制</button>` : ''}
            </div>
        `;

        // Curl命令
        if (capturedRequests.length > 0) {
            html += '<div class="panel-section"><h4>🔧 Curl命令</h4>';
            capturedRequests.forEach((request, index) => {
                if (request.method && request.url) {
                    const curl = generateCurlCommand(request);
                    html += `
                        <div class="info-content">
                            <pre>命令 ${index + 1}:\n${curl}</pre>
                            <button class="copy-btn" onclick="copyToClipboard('${curl.replace(/'/g, "\\'")}')">复制</button>
                        </div>
                    `;
                }
            });
            html += '</div>';
        }

        // 操作按钮
        html += `
            <div class="panel-section">
                <button class="copy-btn" onclick="startInterception()">开始拦截</button>
                <button class="copy-btn" onclick="stopInterception()">停止拦截</button>
                <button class="clear-btn" onclick="capturedRequests=[];capturedClicks=[];updatePanel()">清空</button>
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
                🎯 MindVideo API提取器 v3.0
                <button class="close-btn" onclick="this.closest('.mindvideo-panel').remove()">×</button>
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

        // 每3秒更新一次
        setInterval(updatePanel, 3000);
    }

    // 创建浮动按钮
    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'toggle-btn';
        button.innerHTML = '🎯';
        button.title = 'MindVideo API提取器';
        button.onclick = createPanel;
        document.body.appendChild(button);
    }

    // 监听表单提交
    document.addEventListener('DOMContentLoaded', function() {
        createToggleButton();
        console.log('🎯 MindVideo API提取器 v3.0 已加载');
    });

    // 全局函数
    window.startInterception = startInterception;
    window.stopInterception = stopInterception;
    window.copyToClipboard = copyToClipboard;

})();