// ==UserScript==
// @name         MindVideo信息提取器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  提取MindVideo信息
// @author       AI
// @match        https://www.mindvideo.ai/*
// ==/UserScript==

(function() {
    'use strict';

    // 创建按钮
    function createButton() {
        const btn = document.createElement('button');
        btn.innerHTML = '🎯';
        btn.style.cssText = 'position:fixed;top:20px;left:20px;background:green;color:white;border:none;border-radius:50%;width:50px;height:50px;cursor:pointer;z-index:9999;font-size:20px;';
        btn.title = '打开信息面板';
        
        btn.onclick = function() {
            const info = {
                url: window.location.href,
                title: document.title,
                timestamp: new Date().toLocaleString()
            };
            
            const videos = Array.from(document.querySelectorAll('video, a')).map(el => el.src || el.href).filter(Boolean);
            
            alert('页面信息:\n' + JSON.stringify(info, null, 2) + '\n\n视频链接:\n' + videos.join('\n'));
        };
        
        document.body.appendChild(btn);
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createButton);
    } else {
        createButton();
    }

    console.log('MindVideo信息提取器已加载');
})();