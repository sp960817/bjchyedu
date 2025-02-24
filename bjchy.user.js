// ==UserScript==
// @name         视频完成按钮（仅视频页面）优化版
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  安全增强版，优化按钮样式和交互，增加超时验证
// @author       siiloo
// @match        http://58.132.9.45/*
// @match        http://yxw.bjchyedu.cn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 配置参数
    const CONFIG = {
        CORRECT_PASSWORD: 'xiaojilingqiu',   // 加密密码
        VERIFY_TIMEOUT: 72 * 3600 * 1000 // 24小时验证有效期
    };

    // 初始化全局变量
    let resourceInfoId = null;
    let totalLength = null;
    let userId = null;
    let courseInfoId =null;

    // 样式模板
    GM_addStyle(`
        .custom-overlay {
            background: rgba(0,0,0,0.5);
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
        }
        .password-dialog {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
        }
        .complete-btn {
            position: fixed;
            bottom: 40px;
            right: 20px;
            padding: 10px 20px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            z-index: 1000;
            transition: all 0.3s;
        }
        .complete-btn:disabled {
            background: #9E9E9E;
            cursor: not-allowed;
        }
    `);

    // 验证系统
    function checkAuth() {
        const lastVerify = GM_getValue('lastVerify', 0);
        const isVerified = GM_getValue('isVerified', false);

        if (isVerified && (Date.now() - lastVerify < CONFIG.VERIFY_TIMEOUT)) {
            return true;
        }
        GM_setValue('isVerified', false);
        return false;
    }

    // 密码输入对话框
    function showAuthDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'custom-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'password-dialog';

        const input = document.createElement('input');
        input.type = 'password';
        input.placeholder = '请输入访问密码';
        input.style.margin = '10px 0';
        input.style.padding = '8px';

        const btn = document.createElement('button');
        btn.textContent = '确认';
        btn.onclick = () => handleAuth(input.value, overlay);
        btn.style.padding = '8px 16px';

        dialog.append(input, btn);
        overlay.append(dialog);
        document.body.append(overlay);
        input.focus();
    }

    // 处理验证逻辑
    function handleAuth(input, overlay) {
        if (input === CONFIG.CORRECT_PASSWORD) {
            GM_setValue('isVerified', true);
            GM_setValue('lastVerify', Date.now());
            overlay.remove();
            initializeCore();
        } else {
            alert('密码错误，功能将不会启用');
            overlay.remove();
        }
    }

    // 核心功能初始化
    function initializeCore() {
        // 拦截网络请求
        interceptRequests();

        // 智能等待视频加载
        waitForVideo().then(video => {
            injectControlButton(video);
        }).catch(err => {
            console.error('视频加载超时:', err);
        });
    }

    // 请求拦截器
    function interceptRequests() {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (url.includes('selectStuResourceInfo.action')) {
            const params = new URLSearchParams(url.split('?')[1]);
            resourceInfoId = params.get('resourceInfoId');
            totalLength = Number(params.get('totalLength')); // 可选，保留作为备用
            userId = params.get('userId'); // 捕获 userId
            courseInfoId = params.get('courseInfoId'); // 捕获 courseInfoId
            console.debug('成功捕获参数:', {resourceInfoId, totalLength, userId, courseInfoId});
        }
        origOpen.apply(this, arguments);
    };
}

    // 视频元素检测（带超时）
    function waitForVideo(timeout = 15000) {
        return new Promise((resolve, reject) => {
            const video = document.querySelector('video');
            if (video) return resolve(video);

            const observer = new MutationObserver(mutations => {
                const target = document.querySelector('video');
                if (target) {
                    observer.disconnect();
                    resolve(target);
                }
            });

            observer.observe(document, {
                childList: true,
                subtree: true
            });

            // 设置超时保险
            setTimeout(() => {
                observer.disconnect();
                reject(new Error('视频加载超时'));
            }, timeout);
        });
    }

    // 注入控制按钮
    function injectControlButton(video) {
        if (document.querySelector('.complete-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'complete-btn';
        btn.textContent = '⏩ 一键完成';

        // 按钮交互逻辑
        btn.onclick = async () => {
            try {
                btn.disabled = true;
                btn.textContent = '处理中...';

                if (!validateParams()) {
                    throw new Error('关键参数未就绪，请刷新页面重试');
                }

                const lookTimes = calculateLookTimes();
                await submitRequest(lookTimes);
                showToast('✅ 已完成观看！', 'success');
            } catch (err) {
                showToast(`❌ 错误: ${err.message}`, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '⏩ 一键完成';
            }
        };

        document.body.append(btn);
    }

    // 参数验证
    function validateParams() {
        return resourceInfoId && totalLength >= 0;
    }

    // 计算观看时长
    function calculateLookTimes() {
        const calculated = totalLength - 12;
        return Math.max(calculated, 0).toFixed(2);
    }

    // 提交请求
   function submitRequest(lookTimes) {
    return new Promise((resolve, reject) => {
        const host = window.location.host;
        const baseURL = host.includes('58.132.9.45')
            ? 'http://58.132.9.45/BKPT/stuResourceInfo.action'
            : 'http://yxw.bjchyedu.cn/BKPT/stuResourceInfo.action';

        const params = new URLSearchParams({
            lookTimes,
            totalLength,
            resourceInfoId,
            userId: userId || '5000167466', // 使用捕获的值，失败则回退
            roleInfoId: '7',
            courseInfoId: courseInfoId || '5000027326' // 使用捕获的值，失败则回退
        });

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${baseURL}?${params}`);
        xhr.onload = () => (xhr.status === 200) ? resolve() : reject(new Error('请求失败'));
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.send();
    });
}
    // 可视化提示
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'error' ? '#ff4444' : '#00C851'};
            color: white;
            border-radius: 4px;
            animation: slideIn 0.3s;
            z-index: 9999;
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // 启动入口
    if (checkAuth()) {
        initializeCore();
    } else {
        showAuthDialog();
    }
})();
