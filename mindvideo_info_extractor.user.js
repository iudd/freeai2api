// ==UserScript==
// @name         MindVideo API Extractor
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Extract API information from mindvideo.ai/zh for curl usage with improved detection
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
            width: 550px;
            max-height: 700px;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            overflow-y: auto;
            cursor: move;
            user-select: text;
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
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .panel-content h3 {
            margin: 15px 0 8px 0;
            color: #81c784;
            font-size: 15px;
            font-family: Arial, sans-serif;
        }
        .panel-content p {
            margin: 5px 0;
            line-height: 1.4;
            font-family: Arial, sans-serif;
        }
        .api-info {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #555;
            border-radius: 4px;
            padding: 10px;
            margin: 5px 0;
            overflow-x: auto;
        }
        .api-info pre {
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
            font-size: 12px;
        }
        .copy-btn:hover {
            background: #45a049;
        }
        .manual-trigger-btn {
            background: #ff9800;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin: 5px 5px 5px 0;
            font-size: 12px;
        }
        .manual-trigger-btn:hover {
            background: #f57c00;
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
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 5px;
        }
        .status-listening {
            background: #ff9800;
        }
        .status-captured {
            background: #4CAF50;
        }
        .debug-info {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid #333;
            border-radius: 4px;
            padding: 8px;
            margin: 5px 0;
            font-size: 11px;
            color: #ccc;
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
    let capturedRequests = [];
    let isListening = false;
    let originalFetch = null;
    let originalXMLHttpRequest = null;
    let debugInfo = [];

    // 添加调试信息
    function addDebugInfo(message) {
        debugInfo.push(`${new Date().toLocaleTimeString()}: ${message}`);
        if (debugInfo.length > 20) {
            debugInfo.shift(); // 保持最近20条
        }
        console.log('🔍', message);
        if (currentPanel) {
            updatePanel();
        }
    }

    // 提取页面信息
    function extractPageInfo() {
        addDebugInfo('开始提取页面信息...');
        
        const info = {
            website: 'MindVideo',
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toLocaleString()
        };
        
        // 提取提示词输入框的值 - 扩大选择器范围
        const promptSelectors = [
            'input[type="text"]',
            'textarea',
            '[placeholder*="提示"]',
            '[placeholder*="prompt"]',
            '[placeholder*="描述"]',
            '[placeholder*="内容"]',
            '[name*="prompt"]',
            '[name*="text"]',
            '[id*="prompt"]',
            '[id*="text"]',
            '.prompt-input',
            '.text-input',
            '[data-testid*="prompt"]',
            '[aria-label*="提示"]',
            '[aria-label*="prompt"]'
        ];
        
        for (const selector of promptSelectors) {
            try {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.value && input.value.trim() && input.value.length > 3) {
                        info.prompt = input.value.trim();
                        addDebugInfo(`找到提示词: ${info.prompt.substring(0, 50)}...`);
                        break;
                    }
                }
                if (info.prompt) break;
            } catch (e) {
                // 忽略选择器错误
            }
        }
        
        // 提取尺寸选择 - 扩大选择器范围
        const sizeSelectors = [
            'select',
            '[data-size]',
            '.size-selector',
            '[name*="size"]',
            '[name*="dimension"]',
            '[id*="size"]',
            '[data-testid*="size"]',
            'input[type="radio"][name*="size"]',
            'input[type="radio"][name*="dimension"]'
        ];
        
        for (const selector of sizeSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    let value = '';
                    if (element.tagName === 'SELECT') {
                        value = element.value;
                    } else if (element.type === 'radio' && element.checked) {
                        value = element.value || element.getAttribute('data-value');
                    } else {
                        value = element.getAttribute('data-size') || element.textContent;
                    }
                    
                    if (value && value.trim()) {
                        info.size = value.trim();
                        addDebugInfo(`找到尺寸: ${info.size}`);
                        break;
                    }
                }
                if (info.size) break;
            } catch (e) {
                // 忽略选择器错误
            }
        }
        
        addDebugInfo('页面信息提取完成');
        return info;
    }

    // 拦截网络请求 - 扩大检测范围
    function startInterceptingRequests() {
        if (isListening) return;
        
        isListening = true;
        capturedRequests = [];
        addDebugInfo('开始拦截所有网络请求...');
        
        // 拦截 fetch - 扩大URL匹配范围
        originalFetch = window.fetch;
        window.fetch = function(...args) {
            const [url, options = {}] = args;
            
            // 记录所有请求，但只显示API相关的
            const requestInfo = {
                method: options.method || 'GET',
                url: url,
                headers: options.headers || {},
                body: options.body || null,
                timestamp: new Date().toLocaleString(),
                type: 'fetch'
            };
            
            // 检查是否是API请求
            const isApiRequest = typeof url === 'string' && (
                url.includes('/api/') ||
                url.includes('generate') ||
                url.includes('create') ||
                url.includes('video') ||
                url.includes('submit') ||
                url.includes('mindvideo.ai') ||
                (options.method && options.method !== 'GET')
            );
            
            if (isApiRequest) {
                capturedRequests.push(requestInfo);
                addDebugInfo(`捕获到API请求: ${requestInfo.method} ${url}`);
                
                if (currentPanel) {
                    updatePanel();
                }
            }
            
            return originalFetch.apply(this, args);
        };
        
        // 拦截 XMLHttpRequest - 扩大范围
        originalXMLHttpRequest = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXMLHttpRequest();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            let requestInfo = {};
            
            xhr.open = function(method, url, ...args) {
                requestInfo = {
                    method: method,
                    url: url,
                    headers: {},
                    timestamp: new Date().toLocaleString(),
                    type: 'xhr'
                };
                return originalOpen.apply(this, [method, url, ...args]);
            };
            
            xhr.setRequestHeader = function(header, value) {
                requestInfo.headers[header] = value;
                return xhr.__proto__.setRequestHeader.call(this, header, value);
            };
            
            xhr.send = function(body) {
                requestInfo.body = body;
                
                // 检查是否是API请求
                const isApiRequest = 
                    requestInfo.url.includes('/api/') ||
                    requestInfo.url.includes('generate') ||
                    requestInfo.url.includes('create') ||
                    requestInfo.url.includes('video') ||
                    requestInfo.url.includes('submit') ||
                    requestInfo.url.includes('mindvideo.ai') ||
                    requestInfo.method !== 'GET';
                
                if (isApiRequest) {
                    capturedRequests.push(requestInfo);
                    addDebugInfo(`捕获到XHR API请求: ${requestInfo.method} ${requestInfo.url}`);
                    
                    if (currentPanel) {
                        updatePanel();
                    }
                }
                
                return originalSend.call(this, body);
            };
            
            return xhr;
        };
    }

    // 停止拦截
    function stopInterceptingRequests() {
        if (!isListening) return;
        
        if (originalFetch) {
            window.fetch = originalFetch;
            originalFetch = null;
        }
        
        if (originalXMLHttpRequest) {
            window.XMLHttpRequest = originalXMLHttpRequest;
            originalXMLHttpRequest = null;
        }
        
        isListening = false;
        addDebugInfo('停止拦截网络请求');
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
                curl += ` \\\n  -d "${body.replace(/"/g, '\\"')}"`;
            } else {
                curl += ` \\\n  -d "${JSON.stringify(body).replace(/"/g, '\\"')}"`;
            }
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
        `;
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2000);
    }

    // 手动触发提取
    function manualTrigger() {
        addDebugInfo('手动触发提取...');
        const pageInfo = extractPageInfo();
        startInterceptingRequests();
        
        // 5秒后停止监听
        setTimeout(() => {
            stopInterceptingRequests();
            addDebugInfo('手动触发监听结束');
        }, 5000);
    }

    // 更新面板
    function updatePanel() {
        if (!currentPanel) return;
        
        const pageInfo = extractPageInfo();
        
        let html = `
            <div class="debug-info">
                <strong>调试信息 (最近${debugInfo.length}条):</strong><br>
                ${debugInfo.slice(-5).join('<br>')}
            </div>
            
            <h3>📄 页面信息</h3>
            <div class="api-info">
                <p><strong>网站:</strong> ${pageInfo.website}</p>
                <p><strong>网址:</strong> ${pageInfo.url}</p>
                <p><strong>标题:</strong> ${pageInfo.title}</p>
                <p><strong>提示词:</strong> ${pageInfo.prompt || '<span style="color: #ff6b6b;">未检测到 - 请检查输入框</span>'}</p>
                <p><strong>尺寸:</strong> ${pageInfo.size || '<span style="color: #ff6b6b;">未检测到 - 请检查选择器</span>'}</p>
                <p><strong>时间:</strong> ${pageInfo.timestamp}</p>
            </div>
            
            <h3>
                <span class="status-indicator ${isListening ? 'status-listening' : 'status-captured'}"></span>
                API请求 (${capturedRequests.length})
                <button class="manual-trigger-btn" onclick="manualTrigger()">手动触发</button>
            </h3>
        `;
        
        if (capturedRequests.length === 0) {
            html += '<p style="color: #888;">暂无捕获的请求，请点击"创建"按钮或使用"手动触发"</p>';
        } else {
            capturedRequests.forEach((request, index) => {
                const curlCommand = generateCurlCommand(request);
                html += `
                    <div class="api-info">
                        <p><strong>请求 #${index + 1}</strong> (${request.timestamp})</p>
                        <p><strong>方法:</strong> ${request.method}</p>
                        <p><strong>URL:</strong> ${request.url}</p>
                        <p><strong>Headers:</strong></p>
                        <pre>${JSON.stringify(request.headers, null, 2)}</pre>
                        ${request.body ? `<p><strong>Body:</strong></p><pre>${typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2)}</pre>` : ''}
                        <p><strong>Curl命令:</strong></p>
                        <pre>${curlCommand}</pre>
                        <button class="copy-btn" onclick="copyToClipboard(\`${curlCommand.replace(/`/g, '\\`')}\`)">复制Curl命令</button>
                        <button class="copy-btn" onclick="copyToClipboard(\`${JSON.stringify(request, null, 2).replace(/`/g, '\\`')}\`)">复制JSON</button>
                    </div>
                `;
            });
        }
        
        currentPanel.querySelector('.panel-content').innerHTML = html;
    }

    // 创建信息面板
    function createInfoPanel() {
        if (currentPanel) {
            currentPanel.remove();
            currentPanel = null;
            stopInterceptingRequests();
            return;
        }
        
        const panel = document.createElement('div');
        panel.className = 'mindvideo-extractor-panel';
        panel.style.left = '20px';
        panel.style.top = '20px';
        
        panel.innerHTML = `
            <div class="panel-header">
                🎯 MindVideo API提取器 v1.2.0
                <span style="font-size: 11px; color: #ccc;">增强检测</span>
            </div>
            <div class="panel-content">
                <p>正在加载...</p>
            </div>
            <div class="panel-close">×</div>
        `;
        
        // 添加关闭事件
        panel.querySelector('.panel-close').onclick = () => {
            panel.remove();
            currentPanel = null;
            stopInterceptingRequests();
        };
        
        // 添加拖拽功能
        new DraggablePanel(panel);
        
        document.body.appendChild(panel);
        currentPanel = panel;
        
        // 开始拦截
        startInterceptingRequests();
        updatePanel();
    }

    // 监听创建按钮 - 扩大选择器范围
    function listenForCreateButton() {
        const possibleSelectors = [
            'button:contains("创建")',
            'button:contains("Create")',
            'button:contains("生成")',
            'button:contains("Generate")',
            'button:contains("开始")',
            'button:contains("Start")',
            'button[type="submit"]',
            'input[type="submit"]',
            '.create-btn',
            '#create-btn',
            '[data-action="create"]',
            '[data-action="generate"]',
            '[data-action="submit"]',
            'button[class*="create"]',
            'button[class*="generate"]',
            'button[class*="submit"]',
            'button[id*="create"]',
            'button[id*="generate"]',
            'button[id*="submit"]',
            // 更宽泛的选择器
            'button:not([disabled])',
            'input[type="submit"]'
        ];
        
        let foundButtons = 0;
        possibleSelectors.forEach(selector => {
            try {
                const buttons = document.querySelectorAll(selector);
                buttons.forEach(button => {
                    if (!button.hasAttribute('data-api-listened')) {
                        button.setAttribute('data-api-listened', 'true');
                        foundButtons++;
                        button.addEventListener('click', () => {
                            addDebugInfo(`检测到按钮点击: ${button.textContent || button.value || selector}`);
                            startInterceptingRequests();
                        });
                    }
                });
            } catch (e) {
                // 忽略选择器错误
            }
        });
        
        if (foundButtons > 0) {
            addDebugInfo(`找到 ${foundButtons} 个按钮进行监听`);
        }
        
        // 每隔2秒重新检查按钮
        setInterval(listenForCreateButton, 2000);
    }

    // 创建浮动按钮
    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'extractor-toggle';
        button.innerHTML = '🎯';
        button.title = '提取MindVideo API信息';
        button.onclick = createInfoPanel;
        document.body.appendChild(button);
    }

    // 初始化
    addDebugInfo('MindVideo API提取器 v1.2.0 已加载 - 增强检测模式');
    createToggleButton();
    listenForCreateButton();
    
    // 页面加载完成后立即开始监听
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addDebugInfo('页面加载完成，开始监听');
            listenForCreateButton();
        });
    } else {
        listenForCreateButton();
    }
    
})();