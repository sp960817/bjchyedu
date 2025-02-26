// ==UserScript==
// @name         朝阳教师学习网脚本
// @namespace    http://your-namespace.com
// @version      3.2
// @description  跨框架提取资源ID并自动标记完成（单次密码验证）
// @author       siiloo
// @match        http://58.132.9.45/BKPT/unitCenter.action*
// @match        http://yxw.bjchyedu.cn/BKPT/unitCenter.action*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 密码验证相关
    const correctPassword = 'xiaojilingqiu';
    const VERIFIED_KEY = 'script_verified';

    // 检查是否已验证
    const isVerified = GM_getValue(VERIFIED_KEY, false);

    if (!isVerified) {
        const userInput = prompt('请输入密码：', '');
        if (userInput !== correctPassword) {
            alert('密码错误，脚本未加载！');
            return;
        }
        GM_setValue(VERIFIED_KEY, true);
        alert('密码正确，脚本加载成功！验证状态已保存');
    }

    // 获取当前域名
    const currentDomain = window.location.hostname;
    const baseUrl = `http://${currentDomain}/BKPT/`;

    // 界面样式
    GM_addStyle(`
        .extract-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: linear-gradient(145deg, #2196F3, #1976D2);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(33,150,243,0.3);
            font-size: 16px;
            transition: transform 0.2s;
            z-index: 2147483647;
        }

        .status-panel {
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(255,255,255,0.95);
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            width: 300px;
            font-family: Arial, sans-serif;
        }

        .progress-bar {
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }

        .progress-fill {
            height: 100%;
            background: #4CAF50;
            transition: width 0.3s ease;
        }
    `);

    // 创建界面元素
    const btn = document.createElement('button');
    btn.className = 'extract-btn';
    btn.textContent = '🏁 开始标记';
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.className = 'status-panel';
    panel.innerHTML = `
        <h3 style="margin:0 0 10px">执行进度</h3>
        <div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>
        <div>已完成: <span class="completed">0</span>/<span class="total">0</span></div>
        <div>当前ID: <span class="current-id">-</span></div>
        <div>状态: <span class="status">等待开始</span></div>
    `;
    document.body.appendChild(panel);

    // 核心功能
    async function processResources() {
        const iframe = document.getElementById('unitIframe');
        const ids = await extractResourceIds(iframe);

        if (ids.length === 0) {
            updateStatus('未找到资源ID', 'error');
            return;
        }

        btn.disabled = true;
        updateStatus(`开始处理 ${ids.length} 个资源`, 'processing');
        updateProgress(0, ids.length);

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            updateStatus(`正在处理 ID: ${id}`, 'processing');
            updateCurrentId(id);

            try {
                await sendRequest(id);
                updateProgress(i + 1, ids.length);
                await randomDelay(1000, 1500);
            } catch (error) {
                console.error(`资源 ${id} 处理失败:`, error);
                updateStatus(`处理失败: ${id}`, 'error');
            }
        }

        updateStatus('全部处理完成', 'success');
        btn.disabled = false;
        GM_notification({
            title: '处理完成',
            text: `成功处理 ${ids.length} 个资源`,
            timeout: 5000
        });
    }

    // 跨框架提取ID
    async function extractResourceIds(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            return Array.from(iframeDoc.querySelectorAll('a[href^="javascript:selectResource"]'))
                .map(a => a.href.match(/selectResource\('(\d+)'/)?.[1])
                .filter(Boolean);
        } catch (e) {
            console.warn('跨域访问失败，尝试备用方案');
            const src = iframe.src.match(/courseInfoId=(\d+)/);
            return src ? [src[1]] : [];
        }
    }

    // 发送请求
    function sendRequest(id) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${baseUrl}checkLookResource.action?resourceInfoId=${id}&wanChengType=1`,
                onload: (res) => {
                    if (res.status === 200) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.status}`));
                    }
                },
                onerror: reject
            });
        });
    }

    // 工具函数
    function randomDelay(min, max) {
        return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
    }

    function updateProgress(current, total) {
        const percent = ((current / total) * 100).toFixed(1);
        panel.querySelector('.progress-fill').style.width = `${percent}%`;
        panel.querySelector('.completed').textContent = current;
        panel.querySelector('.total').textContent = total;
    }

    function updateStatus(text, type = 'info') {
        const statusEl = panel.querySelector('.status');
        statusEl.textContent = text;
        statusEl.style.color = {
            info: '#333',
            processing: '#2196F3',
            success: '#4CAF50',
            error: '#F44336'
        }[type];
    }

    function updateCurrentId(id) {
        panel.querySelector('.current-id').textContent = id;
    }

    // 事件绑定
    btn.addEventListener('click', processResources);
})();
