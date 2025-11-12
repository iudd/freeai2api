// ==UserScript==
// @name         MindVideo Info Collector
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Collect basic info from mindvideo.ai for debugging
// @author       iudd
// @match        https://www.mindvideo.ai/zh/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .info-collector-panel {
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
        .info-collector-panel.dragging {
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
        .info-content {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #555;
            border-radius: 4px;
            padding: 10px;
            margin: 5px 0;
            overflow-x: auto;
            max-height: 200px;
            overflow-y: auto;
        }
        .info-content pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-all;
            color: #e8f5e8;
            font-size: 12px;
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
        .clear-btn {
            background: #f44336;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin: 5px 5px 5px 0;
            font-size: 12px;
        }
        .clear-btn:hover {
            background: #d32f2f;
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
        .collector-toggle {
            position: fixed;
            top: 20px;
            left: 20px;
            width: 60px;
            height: 60px;
            background: #1976D2;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10001;
            font-size: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            line-height: 1.2;
        }
        .collector-toggle:hover {
            background: #1565C0;
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

    let currentPanel = null;
    let collectedInfo = {
        pageInfo: {},
        formData: {},
        networkRequests: [],
        consoleLogs: []
    };

    // 收集页面基本信息
    function collectPageInfo() {
        collectedInfo.pageInfo = {
            url: window.location.href,
            title: document.title,
            userAgent: navigator.userAgent,
            timestamp: new Date().toLocaleString(),
            cookie: document.cookie.substring(0, 200) + '...',
            referrer: document.referrer,
            language: navigator.language
        };
    }

    // 收集表单数据
    function collectFormData() {
        const forms = document.querySelectorAll('form');
        forms.forEach((form, index) => {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            collectedInfo.formData[`form_${index}`] = data;
        });

        // 收集所有输入框值
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.name || input.id) {
                const key = input.name || input.id;
                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.checked) {
                        collectedInfo.formData[key] = input.value;
                    }
                } else {
                    collectedInfo.formData[key] = input.value;
                }
            }
        });

        // 收集按钮和链接
        const buttons = document.querySelectorAll('button, input[type="submit"], a[role="button"]');
        collectedInfo.formData.buttons = Array.from(buttons).map(btn => ({
            text: btn.textContent || btn.value,
            class: btn.className,
            id: btn.id,
            type: btn.type,
            disabled: btn.disabled
        }));
    }

    // 监听网络请求
    function startNetworkMonitoring() {
        // 拦截 fetch
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const [url, options = {}] = args;
            const requestInfo = {
                type: 'fetch',
                url: url,
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body || null,
                timestamp: new Date().toLocaleString()
            };
            collectedInfo.networkRequests.push(requestInfo);
            
            return originalFetch.apply(this, args);
        };

        // 拦截 XMLHttpRequest
        const originalXMLHttpRequest = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXMLHttpRequest();
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
            };
            
            xhr.setRequestHeader = function(header, value) {
                requestInfo.headers[header] = value;
            };
            
            xhr.send = function(body) {
                requestInfo.body = body;
                collectedInfo.networkRequests.push(requestInfo);
            };
            
            return xhr;
        };

        // 监听按钮点击
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.tagName === 'BUTTON' || target.type === 'submit' || target.closest('button')) {
                const button = target.closest('button') || target;
                collectedInfo.consoleLogs.push({
                    type: 'button_click',
                    text: button.textContent || button.value,
                    class: button.className,
                    id: button.id,
                    name: button.name,
                    timestamp: new Date().toLocaleString()
                });
            }
        }, true);

        // 监听表单提交
        document.addEventListener('submit', function(e) {
            collectedInfo.consoleLogs.push({
                type: 'form_submit',
                action: e.target.action,
                method: e.target.method,
                timestamp: new Date().toLocaleString()
            });
        }, true);
    }

    // 更新面板
    function updatePanel() {
        if (!currentPanel) return;

        const infoHtml = `
            <div class="panel-header">🔍 MindVideo 信息收集器 v2.0</div>
            
            <h3>📄 页面信息</h3>
            <div class="info-content">
                <pre>${JSON.stringify(collectedInfo.pageInfo, null, 2)}</pre>
            </div>

            <h3>📝 表单数据</h3>
            <div class="info-content">
                <pre>${JSON.stringify(collectedInfo.formData, null, 2)}</pre>
            </div>

            <h3>🌐 网络请求 (${collectedInfo.networkRequests.length})</h3>
            <div class="info-content">
                <pre>${JSON.stringify(collectedInfo.networkRequests.slice(-10), null, 2)}</pre>
            </div>

            <h3>📋 事件日志 (${collectedInfo.consoleLogs.length})</h3>
            <div class="info-content">
                <pre>${JSON.stringify(collectedInfo.consoleLogs.slice(-10), null, 2)}</pre>
            </div>

            <button class="copy-btn" onclick="copyCollectedInfo()">复制所有信息</button>
            <button class="clear-btn" onclick="clearCollectedInfo()">清空信息</button>
        `;

        currentPanel.innerHTML = infoHtml;
        
        // 添加拖拽功能
        if (!currentPanel.draggableInstance) {
            currentPanel.draggableInstance = new DraggablePanel(currentPanel);
        }
    }

    // 复制信息到剪贴板
    window.copyCollectedInfo = function() {
        const text = JSON.stringify(collectedInfo, null, 2);
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // 显示提示
        const notification = document.createElement('div');
        notification.textContent = '信息已复制到剪贴板！请粘贴给我。';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10002;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 3000);
    };

    // 清空信息
    window.clearCollectedInfo = function() {
        collectedInfo = {
            pageInfo: {},
            formData: {},
            networkRequests: [],
            consoleLogs: []
        };
        updatePanel();
    };

    // 创建面板
    function createPanel() {
        if (currentPanel) {
            currentPanel.remove();
            currentPanel = null;
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'info-collector-panel';
        panel.style.left = '20px';
        panel.style.top = '20px';

        document.body.appendChild(panel);
        currentPanel = panel;

        // 开始收集信息
        collectPageInfo();
        collectFormData();
        startNetworkMonitoring();
        updatePanel();

        // 每秒更新一次
        setInterval(() => {
            collectFormData();
            updatePanel();
        }, 1000);
    }

    // 创建浮动按钮
    const button = document.createElement('button');
    button.className = 'collector-toggle';
    button.innerHTML = '🔍<br>收集';
    button.title = '收集页面信息用于调试';
    button.onclick = createPanel;
    document.body.appendChild(button);

    console.log('🔍 MindVideo 信息收集器 v2.0 已加载 - 收集页面、表单、网络、事件信息');

})();