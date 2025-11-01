// ==UserScript==
// @name         FreeAI Image Generator (Original + Movable)
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  FreeAI图片生成器 - 原始版本升级为可移动设置面板
// @author       iudd
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      freeaiimage.net
// @connect      cdnfy.foxai.me
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 默认设置
    const DEFAULT_SETTINGS = {
        position: { top: '20px', right: '20px' },
        size: '512x512',
        negativePrompt: '模糊，变形，畸形，低质量'
    };

    // 获取保存的设置
    function getSettings() {
        return {
            position: GM_getValue('panelPosition', DEFAULT_SETTINGS.position),
            size: GM_getValue('imageSize', DEFAULT_SETTINGS.size),
            negativePrompt: GM_getValue('negativePrompt', DEFAULT_SETTINGS.negativePrompt)
        };
    }

    // 保存设置
    function saveSettings(settings) {
        GM_setValue('panelPosition', settings.position);
        GM_setValue('imageSize', settings.size);
        GM_setValue('negativePrompt', settings.negativePrompt);
    }

    // 添加样式
    GM_addStyle(`
        .freeai-generator {
            position: fixed;
            top: ${getSettings().position.top};
            right: ${getSettings().position.right};
            width: 300px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            cursor: move;
            user-select: none;
        }

        .freeai-generator.dragging {
            cursor: grabbing;
            opacity: 0.9;
        }

        .freeai-header {
            cursor: move;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .freeai-title {
            font-weight: bold;
            color: #4CAF50;
        }

        .freeai-close {
            cursor: pointer;
            color: #ff6b6b;
            font-size: 18px;
            line-height: 1;
        }

        .freeai-close:hover {
            color: #ff5252;
        }

        .freeai-input-group {
            margin-bottom: 10px;
        }

        .freeai-label {
            display: block;
            margin-bottom: 3px;
            font-weight: bold;
        }

        .freeai-input, .freeai-textarea, .freeai-select {
            width: 100%;
            padding: 5px;
            border: 1px solid #555;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            box-sizing: border-box;
        }

        .freeai-input:focus, .freeai-textarea:focus, .freeai-select:focus {
            outline: none;
            border-color: #4CAF50;
        }

        .freeai-textarea {
            resize: vertical;
            min-height: 60px;
        }

        .freeai-button {
            width: 100%;
            padding: 8px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 5px;
        }

        .freeai-button:hover {
            background: #45a049;
        }

        .freeai-button:disabled {
            background: #666;
            cursor: not-allowed;
        }

        .freeai-status {
            margin-top: 8px;
            padding: 5px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
        }

        .freeai-status.success {
            background: rgba(76, 175, 80, 0.2);
            color: #81c784;
        }

        .freeai-status.error {
            background: rgba(244, 67, 54, 0.2);
            color: #ef5350;
        }

        .freeai-status.info {
            background: rgba(255, 152, 0, 0.2);
            color: #ffb74d;
        }

        .freeai-results {
            margin-top: 10px;
            max-height: 150px;
            overflow-y: auto;
        }

        .freeai-result-item {
            margin-bottom: 5px;
            padding: 5px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .freeai-result-link {
            color: #4CAF50;
            text-decoration: none;
        }

        .freeai-result-link:hover {
            text-decoration: underline;
        }

        .freeai-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10001;
            font-size: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .freeai-toggle:hover {
            background: #45a049;
        }

        .freeai-toggle.hidden {
            display: none;
        }
    `);

    // 拖拽功能类
    class DraggablePanel {
        constructor(panel) {
            this.panel = panel;
            this.isDragging = false;
            this.startX = 0;
            this.startY = 0;
            this.startRight = 0;
            this.startTop = 0;

            this.init();
        }

        init() {
            const header = this.panel.querySelector('.freeai-header');

            header.addEventListener('mousedown', this.startDrag.bind(this));
            document.addEventListener('mousemove', this.drag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));

            // 触摸事件
            header.addEventListener('touchstart', this.startDragTouch.bind(this), { passive: false });
            document.addEventListener('touchmove', this.dragTouch.bind(this), { passive: false });
            document.addEventListener('touchend', this.stopDrag.bind(this));
        }

        startDrag(e) {
            this.isDragging = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            this.startRight = window.innerWidth - rect.right;
            this.startTop = rect.top;

            this.panel.classList.add('dragging');
            e.preventDefault();
        }

        drag(e) {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.startX;
            const deltaY = e.clientY - this.startY;

            const newTop = this.startTop + deltaY;
            const newRight = this.startRight - deltaX;

            // 限制边界
            const maxTop = window.innerHeight - this.panel.offsetHeight;
            const maxRight = window.innerWidth - this.panel.offsetWidth;

            this.panel.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            this.panel.style.right = Math.max(0, Math.min(newRight, maxRight)) + 'px';

            e.preventDefault();
        }

        stopDrag() {
            if (!this.isDragging) return;

            this.isDragging = false;
            this.panel.classList.remove('dragging');

            // 保存新位置
            const position = {
                top: this.panel.style.top,
                right: this.panel.style.right
            };
            const settings = getSettings();
            settings.position = position;
            saveSettings(settings);
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

    // FreeAI API 客户端
    class FreeAIClient {
        constructor() {
            this.baseUrl = 'https://freeaiimage.net';
        }

        async generateImage(prompt, size = '512x512', negativePrompt = '') {
            try {
                // 创建任务
                const createResponse = await this.makeRequest('/api/services/create-qwen-image', 'POST', {
                    prompt: prompt,
                    width: parseInt(size.split('x')[0]),
                    height: parseInt(size.split('x')[1]),
                    batch_size: 1,
                    negative_prompt: negativePrompt || '模糊，变形，畸形'
                });

                if (!createResponse.success) {
                    throw new Error('创建任务失败: ' + JSON.stringify(createResponse));
                }

                const taskId = createResponse.task_id;
                console.log('任务创建成功, ID:', taskId);

                // 轮询任务状态
                return await this.waitForTaskCompletion(taskId);

            } catch (error) {
                console.error('API调用失败:', error);
                throw error;
            }
        }

        async waitForTaskCompletion(taskId) {
            const maxAttempts = 60; // 最多等待5分钟
            let attempts = 0;

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    const statusResponse = await this.makeRequest(
                        `/api/services/aigc/task?taskId=${taskId}&taskType=qwen_image`,
                        'GET'
                    );

                    if (statusResponse.status === 'completed' && statusResponse.data) {
                        return statusResponse.data;
                    }

                    if (statusResponse.status === 'failed') {
                        throw new Error('任务执行失败');
                    }

                    // 等待3秒后重试
                    await this.sleep(3000);

                } catch (error) {
                    console.error(`检查任务状态失败 (${attempts}/${maxAttempts}):`, error);
                    await this.sleep(3000);
                }
            }

            throw new Error('任务执行超时');
        }

        makeRequest(path, method, data) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: method,
                    url: this.baseUrl + path,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'FreeAI-Tampermonkey/1.0.1'
                    },
                    data: data ? JSON.stringify(data) : null,
                    timeout: 30000,
                    onload: (response) => {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            reject(new Error('解析响应失败'));
                        }
                    },
                    onerror: (error) => reject(error),
                    ontimeout: () => reject(new Error('请求超时'))
                });
            });
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // 主应用
    class FreeAIGenerator {
        constructor() {
            this.client = new FreeAIClient();
            this.panel = null;
            this.toggleBtn = null;
            this.draggable = null;
            this.isGenerating = false;

            this.init();
        }

        init() {
            this.createToggleButton();
            this.createPanel();
        }

        createToggleButton() {
            this.toggleBtn = document.createElement('button');
            this.toggleBtn.className = 'freeai-toggle';
            this.toggleBtn.innerHTML = '🎨';
            this.toggleBtn.title = 'FreeAI 图片生成器';
            this.toggleBtn.onclick = () => this.togglePanel();
            document.body.appendChild(this.toggleBtn);
        }

        createPanel() {
            const settings = getSettings();

            this.panel = document.createElement('div');
            this.panel.className = 'freeai-generator';
            this.panel.style.top = settings.position.top;
            this.panel.style.right = settings.position.right;

            this.panel.innerHTML = `
                <div class="freeai-header">
                    <div class="freeai-title">🎨 FreeAI 图片生成器</div>
                    <div class="freeai-close" onclick="this.closest('.freeai-generator').style.display='none'; document.querySelector('.freeai-toggle').classList.remove('hidden');">×</div>
                </div>

                <div class="freeai-input-group">
                    <label class="freeai-label">提示词:</label>
                    <textarea class="freeai-textarea" placeholder="描述你想要生成的图片..."></textarea>
                </div>

                <div class="freeai-input-group">
                    <label class="freeai-label">尺寸:</label>
                    <select class="freeai-select">
                        <option value="256x256">256x256 (快速)</option>
                        <option value="512x512">512x512 (推荐)</option>
                        <option value="768x768">768x768 (高清)</option>
                        <option value="1024x1024">1024x1024 (超清)</option>
                    </select>
                </div>

                <div class="freeai-input-group">
                    <label class="freeai-label">负面提示词:</label>
                    <input type="text" class="freeai-input" placeholder="不需要的元素...">
                </div>

                <button class="freeai-button" onclick="window.freeaiGenerator.generate()">生成图片</button>

                <div class="freeai-status" id="freeai-status" style="display: none;"></div>

                <div class="freeai-results" id="freeai-results" style="display: none;"></div>
            `;

            document.body.appendChild(this.panel);

            // 设置默认值
            const sizeSelect = this.panel.querySelector('.freeai-select');
            const negativeInput = this.panel.querySelector('.freeai-input');

            sizeSelect.value = settings.size;
            negativeInput.value = settings.negativePrompt;

            // 初始化拖拽
            this.draggable = new DraggablePanel(this.panel);

            // 绑定关闭事件
            const closeBtn = this.panel.querySelector('.freeai-close');
            closeBtn.onclick = () => this.hidePanel();
        }

        togglePanel() {
            if (this.panel.style.display === 'none') {
                this.showPanel();
            } else {
                this.hidePanel();
            }
        }

        showPanel() {
            this.panel.style.display = 'block';
            this.toggleBtn.classList.add('hidden');
        }

        hidePanel() {
            this.panel.style.display = 'none';
            this.toggleBtn.classList.remove('hidden');
        }

        async generate() {
            if (this.isGenerating) return;

            const prompt = this.panel.querySelector('.freeai-textarea').value.trim();
            const size = this.panel.querySelector('.freeai-select').value;
            const negativePrompt = this.panel.querySelector('.freeai-input').value.trim();

            if (!prompt) {
                this.showStatus('请输入提示词', 'error');
                return;
            }

            // 保存设置
            const settings = getSettings();
            settings.size = size;
            settings.negativePrompt = negativePrompt;
            saveSettings(settings);

            this.isGenerating = true;
            const button = this.panel.querySelector('.freeai-button');
            button.textContent = '生成中...';
            button.disabled = true;

            try {
                this.showStatus('正在生成图片...', 'info');

                const images = await this.client.generateImage(prompt, size, negativePrompt);

                this.showResults(images, prompt);
                this.showStatus('生成成功!', 'success');

            } catch (error) {
                console.error('生成失败:', error);
                this.showStatus('生成失败: ' + error.message, 'error');
            } finally {
                this.isGenerating = false;
                button.textContent = '生成图片';
                button.disabled = false;
            }
        }

        showStatus(message, type) {
            const statusDiv = document.getElementById('freeai-status');
            statusDiv.textContent = message;
            statusDiv.className = `freeai-status ${type}`;
            statusDiv.style.display = 'block';
        }

        showResults(images, prompt) {
            const resultsDiv = document.getElementById('freeai-results');
            resultsDiv.innerHTML = '';

            images.forEach((imageUrl, index) => {
                const item = document.createElement('div');
                item.className = 'freeai-result-item';

                const link = document.createElement('a');
                link.href = imageUrl;
                link.target = '_blank';
                link.className = 'freeai-result-link';
                link.textContent = `查看生成的图片 ${index + 1}`;

                item.appendChild(link);
                resultsDiv.appendChild(item);
            });

            resultsDiv.style.display = 'block';
        }
    }

    // 启动
    console.log('🚀 FreeAI 图片生成器 (可移动版本) 已加载');
    window.freeaiGenerator = new FreeAIGenerator();

})();