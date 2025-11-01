// ==UserScript==
// @name         FreeAI Image Generator with Movable Settings
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  FreeAI图片生成器，支持拖拽移动设置面板，避免挡住页面按钮
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

    // 设置面板默认位置
    const DEFAULT_POSITION = { top: '10px', left: '10px' };

    // 获取保存的位置
    function getPanelPosition() {
        const saved = GM_getValue('panelPosition', DEFAULT_POSITION);
        return {
            top: saved.top || DEFAULT_POSITION.top,
            left: saved.left || DEFAULT_POSITION.left
        };
    }

    // 保存位置
    function savePanelPosition(position) {
        GM_setValue('panelPosition', position);
    }

    // 获取设置
    function getSettings() {
        return {
            autoShow: GM_getValue('autoShow', true),
            size: GM_getValue('defaultSize', '512x512'),
            negativePrompt: GM_getValue('negativePrompt', '模糊，变形，畸形，低质量'),
            position: getPanelPosition()
        };
    }

    // 保存设置
    function saveSettings(settings) {
        GM_setValue('autoShow', settings.autoShow);
        GM_setValue('defaultSize', settings.size);
        GM_setValue('negativePrompt', settings.negativePrompt);
        savePanelPosition(settings.position);
    }

    // 添加样式
    GM_addStyle(`
        .freeai-panel {
            position: fixed;
            top: ${getPanelPosition().top};
            left: ${getPanelPosition().left};
            width: 320px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: move;
            user-select: none;
        }

        .freeai-panel.dragging {
            cursor: grabbing;
            opacity: 0.8;
        }

        .freeai-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            cursor: move;
        }

        .freeai-panel-title {
            font-weight: bold;
            font-size: 16px;
            color: #4CAF50;
        }

        .freeai-panel-controls {
            display: flex;
            gap: 5px;
        }

        .freeai-btn {
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .freeai-btn:hover {
            opacity: 0.8;
        }

        .freeai-btn.minimize {
            background: #ff9800;
            color: white;
        }

        .freeai-btn.close {
            background: #f44336;
            color: white;
        }

        .freeai-panel-content {
            display: block;
        }

        .freeai-panel.minimized .freeai-panel-content {
            display: none;
        }

        .freeai-form-group {
            margin-bottom: 10px;
        }

        .freeai-label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
        }

        .freeai-input, .freeai-textarea, .freeai-select {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 13px;
            box-sizing: border-box;
        }

        .freeai-input:focus, .freeai-textarea:focus, .freeai-select:focus {
            outline: none;
            border-color: #4CAF50;
            background: rgba(255, 255, 255, 0.15);
        }

        .freeai-textarea {
            resize: vertical;
            min-height: 60px;
        }

        .freeai-generate-btn {
            width: 100%;
            padding: 10px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
            transition: all 0.3s;
        }

        .freeai-generate-btn:hover {
            background: linear-gradient(135deg, #45a049, #4CAF50);
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .freeai-generate-btn.generating {
            background: linear-gradient(135deg, #ff9800, #f57c00);
            cursor: not-allowed;
        }

        .freeai-status {
            margin-top: 8px;
            padding: 6px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
        }

        .freeai-status.success {
            background: rgba(76, 175, 80, 0.2);
            color: #81c784;
            border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .freeai-status.error {
            background: rgba(244, 67, 54, 0.2);
            color: #ef5350;
            border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .freeai-status.info {
            background: rgba(255, 152, 0, 0.2);
            color: #ffb74d;
            border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .freeai-results {
            margin-top: 10px;
            max-height: 200px;
            overflow-y: auto;
        }

        .freeai-image-item {
            margin-bottom: 8px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        .freeai-image-link {
            color: #4CAF50;
            text-decoration: none;
            word-break: break-all;
        }

        .freeai-image-link:hover {
            text-decoration: underline;
        }

        .freeai-image-preview {
            max-width: 100%;
            border-radius: 4px;
            margin-top: 5px;
            display: none;
        }

        .freeai-show-preview {
            background: none;
            border: none;
            color: #4CAF50;
            cursor: pointer;
            font-size: 12px;
            padding: 2px 0;
        }

        .freeai-show-preview:hover {
            text-decoration: underline;
        }

        .freeai-toggle-settings {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            z-index: 10001;
            font-size: 18px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            transition: all 0.3s;
        }

        .freeai-toggle-settings:hover {
            background: #45a049;
            transform: scale(1.1);
        }

        .freeai-toggle-settings.hidden {
            display: none;
        }
    `);

    // 创建拖拽功能
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
            const header = this.panel.querySelector('.freeai-panel-header');

            header.addEventListener('mousedown', this.startDrag.bind(this));
            document.addEventListener('mousemove', this.drag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));

            // 触摸事件支持
            header.addEventListener('touchstart', this.startDragTouch.bind(this));
            document.addEventListener('touchmove', this.dragTouch.bind(this));
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

            // 限制在视窗内
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

            // 保存新位置
            const position = {
                left: this.panel.style.left,
                top: this.panel.style.top
            };
            savePanelPosition(position);
        }

        startDragTouch(e) {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.startDrag({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault()
                });
            }
        }

        dragTouch(e) {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.drag({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault()
                });
            }
        }
    }

    // FreeAI客户端
    class FreeAIClient {
        constructor() {
            this.baseUrl = 'https://freeaiimage.net';
            this.timeout = 60000;
            this.pollInterval = 3000;
        }

        async createImageTask(request) {
            const { prompt, width = 512, height = 512, batch_size = 1, negative_prompt } = request;

            const payload = {
                prompt: prompt.trim(),
                width,
                height,
                batch_size,
                negative_prompt: negative_prompt || '模糊，变形，畸形'
            };

            console.log('🎨 发送请求到FreeAI:', payload);

            const response = await this.makeRequest('/api/services/create-qwen-image', 'POST', payload);

            if (!response.success || !response.task_id) {
                throw new Error(`创建任务失败: ${JSON.stringify(response)}`);
            }

            return response.task_id;
        }

        async waitForCompletion(taskId) {
            const startTime = Date.now();
            let attempts = 0;

            while (attempts < 200) {
                attempts++;

                try {
                    const taskResponse = await this.getTaskStatus(taskId);
                    console.log(`🔄 检查任务状态 (${attempts}):`, taskResponse.status);

                    if (taskResponse.status === 'completed' && taskResponse.data) {
                        const responseTime = Date.now() - startTime;
                        console.log(`✅ 任务完成，用时: ${responseTime}ms`);

                        return {
                            task_id: taskResponse.task_id,
                            prompt: taskResponse.params.prompt,
                            status: taskResponse.status,
                            images: taskResponse.data,
                            response_time_ms: responseTime
                        };
                    }

                    if (taskResponse.status === 'failed') {
                        throw new Error(`任务失败: ${JSON.stringify(taskResponse)}`);
                    }

                    await this.sleep(this.pollInterval);

                } catch (error) {
                    console.error(`❌ 任务检查失败 (${attempts}):`, error);
                    await this.sleep(this.pollInterval);
                }
            }

            throw new Error(`任务超时 (${attempts} 次检查)`);
        }

        async getTaskStatus(taskId) {
            const url = `/api/services/aigc/task?taskId=${taskId}&taskType=qwen_image`;
            return await this.makeRequest(url, 'GET');
        }

        async makeRequest(path, method, data) {
            return new Promise((resolve, reject) => {
                const url = this.baseUrl + path;

                const options = {
                    method: method,
                    url: url,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'FreeAI-Tampermonkey/1.1.0',
                        'Accept': 'application/json',
                        'Origin': window.location.origin
                    },
                    timeout: this.timeout,
                    onload: (response) => {
                        try {
                            const result = JSON.parse(response.responseText);
                            resolve(result);
                        } catch (e) {
                            reject(new Error(`解析响应失败: ${response.responseText}`));
                        }
                    },
                    onerror: (error) => {
                        reject(new Error(`网络请求失败: ${error.error}`));
                    },
                    ontimeout: () => {
                        reject(new Error('请求超时'));
                    }
                };

                if (data && (method === 'POST' || method === 'PUT')) {
                    options.data = JSON.stringify(data);
                }

                GM_xmlhttpRequest(options);
            });
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // 主应用类
    class FreeAIImageGenerator {
        constructor() {
            this.client = new FreeAIClient();
            this.panel = null;
            this.toggleBtn = null;
            this.isMinimized = false;
            this.isGenerating = false;
            this.draggable = null;

            this.init();
        }

        init() {
            this.createToggleButton();
            this.createPanel();
            this.bindEvents();

            const settings = getSettings();
            if (settings.autoShow) {
                this.showPanel();
            }
        }

        createToggleButton() {
            this.toggleBtn = document.createElement('button');
            this.toggleBtn.className = 'freeai-toggle-settings';
            this.toggleBtn.innerHTML = '🎨';
            this.toggleBtn.title = 'FreeAI 图片生成器';
            this.toggleBtn.addEventListener('click', () => this.togglePanel());
            document.body.appendChild(this.toggleBtn);
        }

        createPanel() {
            const settings = getSettings();

            this.panel = document.createElement('div');
            this.panel.className = 'freeai-panel';
            this.panel.style.top = settings.position.top;
            this.panel.style.left = settings.position.left;

            this.panel.innerHTML = `
                <div class="freeai-panel-header">
                    <div class="freeai-panel-title">🎨 FreeAI 图片生成器</div>
                    <div class="freeai-panel-controls">
                        <button class="freeai-btn minimize" title="最小化">_</button>
                        <button class="freeai-btn close" title="关闭">×</button>
                    </div>
                </div>
                <div class="freeai-panel-content">
                    <div class="freeai-form-group">
                        <label class="freeai-label">提示词 (Prompt)</label>
                        <textarea class="freeai-textarea" placeholder="描述你想要生成的图片..."></textarea>
                    </div>

                    <div class="freeai-form-group">
                        <label class="freeai-label">尺寸 (Size)</label>
                        <select class="freeai-select">
                            <option value="256x256">256x256 (快速)</option>
                            <option value="512x512" selected>512x512 (推荐)</option>
                            <option value="768x768">768x768 (高质量)</option>
                            <option value="1024x1024">1024x1024 (超高清)</option>
                        </select>
                    </div>

                    <div class="freeai-form-group">
                        <label class="freeai-label">负面提示词 (Negative Prompt)</label>
                        <input type="text" class="freeai-input" placeholder="不需要的元素...">
                    </div>

                    <button class="freeai-generate-btn">🎨 生成图片</button>

                    <div class="freeai-status" style="display: none;"></div>

                    <div class="freeai-results" style="display: none;"></div>
                </div>
            `;

            document.body.appendChild(this.panel);

            // 设置默认值
            const sizeSelect = this.panel.querySelector('.freeai-select');
            const negativeInput = this.panel.querySelector('.freeai-input');

            sizeSelect.value = settings.size;
            negativeInput.value = settings.negativePrompt;

            // 初始化拖拽
            this.draggable = new DraggablePanel(this.panel);

            // 绑定事件
            this.bindPanelEvents();
        }

        bindPanelEvents() {
            const minimizeBtn = this.panel.querySelector('.minimize');
            const closeBtn = this.panel.querySelector('.close');
            const generateBtn = this.panel.querySelector('.freeai-generate-btn');

            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMinimize();
            });

            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hidePanel();
            });

            generateBtn.addEventListener('click', () => this.generateImage());
        }

        bindEvents() {
            // ESC键关闭面板
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.panel && this.panel.style.display !== 'none') {
                    this.hidePanel();
                }
            });
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

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.panel.classList.toggle('minimized');

            const minimizeBtn = this.panel.querySelector('.minimize');
            minimizeBtn.textContent = this.isMinimized ? '□' : '_';
            minimizeBtn.title = this.isMinimized ? '还原' : '最小化';
        }

        async generateImage() {
            if (this.isGenerating) return;

            const promptTextarea = this.panel.querySelector('.freeai-textarea');
            const sizeSelect = this.panel.querySelector('.freeai-select');
            const negativeInput = this.panel.querySelector('.freeai-input');
            const generateBtn = this.panel.querySelector('.freeai-generate-btn');
            const statusDiv = this.panel.querySelector('.freeai-status');
            const resultsDiv = this.panel.querySelector('.freeai-results');

            const prompt = promptTextarea.value.trim();
            const size = sizeSelect.value;
            const negativePrompt = negativeInput.value.trim();

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
            generateBtn.textContent = '⏳ 生成中...';
            generateBtn.classList.add('generating');
            statusDiv.style.display = 'none';
            resultsDiv.style.display = 'none';

            try {
                this.showStatus('🎨 正在创建任务...', 'info');

                const [width, height] = size.split('x').map(Number);
                const taskId = await this.client.createImageTask({
                    prompt: prompt,
                    width: width,
                    height: height,
                    batch_size: 1,
                    negative_prompt: negativePrompt
                });

                this.showStatus(`✅ 任务已创建，ID: ${taskId}`, 'success');

                const result = await this.client.waitForCompletion(taskId);

                this.showResults(result.images, prompt);
                this.showStatus(`🎉 生成完成！用时: ${Math.round(result.response_time_ms / 1000)}秒`, 'success');

            } catch (error) {
                console.error('生成失败:', error);
                this.showStatus(`❌ 生成失败: ${error.message}`, 'error');
            } finally {
                this.isGenerating = false;
                generateBtn.textContent = '🎨 生成图片';
                generateBtn.classList.remove('generating');
            }
        }

        showStatus(message, type) {
            const statusDiv = this.panel.querySelector('.freeai-status');
            statusDiv.textContent = message;
            statusDiv.className = `freeai-status ${type}`;
            statusDiv.style.display = 'block';
        }

        showResults(images, prompt) {
            const resultsDiv = this.panel.querySelector('.freeai-results');
            resultsDiv.innerHTML = '';

            images.forEach((imageUrl, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'freeai-image-item';

                const link = document.createElement('a');
                link.href = imageUrl;
                link.target = '_blank';
                link.className = 'freeai-image-link';
                link.textContent = `📷 生成的图片 ${index + 1}`;

                const previewBtn = document.createElement('button');
                previewBtn.className = 'freeai-show-preview';
                previewBtn.textContent = '预览';

                const img = document.createElement('img');
                img.className = 'freeai-image-preview';
                img.src = imageUrl;
                img.alt = prompt;

                previewBtn.addEventListener('click', () => {
                    img.style.display = img.style.display === 'none' ? 'block' : 'none';
                    previewBtn.textContent = img.style.display === 'none' ? '预览' : '隐藏预览';
                });

                itemDiv.appendChild(link);
                itemDiv.appendChild(previewBtn);
                itemDiv.appendChild(img);

                resultsDiv.appendChild(itemDiv);
            });

            resultsDiv.style.display = 'block';
        }
    }

    // 启动应用
    console.log('🚀 FreeAI 图片生成器加载完成！拖拽设置面板可移动位置。');
    new FreeAIImageGenerator();

})();