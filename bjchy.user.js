// ==UserScript==
// @name         视频完成按钮（仅视频页面）优化版
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  修改为一键触发指定事件请求，动态替换参数
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
        VERIFY_TIMEOUT: 72 * 3600 * 1000,    // 72小时验证有效期
        ERROR_PAGE_URL: 'http://58.132.9.45/BKPT/jsp/common/error.jsp' // 要屏蔽的错误页面
    };

    // 初始化全局变量
    let resourceInfoId = null;
    let userId = null;
    let courseInfoId = null;

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

    // 拦截 XMLHttpRequest
    function interceptXHR() {
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if (url === CONFIG.ERROR_PAGE_URL) {
                console.log('拦截到错误页面请求:', url);
                return; // 不执行请求
            }
            if (url.includes('selectStuResourceInfo.action')) {
                const params = new URLSearchParams(url.split('?')[1]);
                resourceInfoId = params.get('resourceInfoId');
//                userId = params.get('userId') ;
//                courseInfoId = params.get('courseInfoId') ;
                console.debug('成功捕获参数:', { resourceInfoId });
            }
            origOpen.apply(this, arguments);
        };
    }

    // 拦截 fetch 请求
    function interceptFetch() {
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
            if (typeof input === 'string' && input === CONFIG.ERROR_PAGE_URL) {
                console.log('拦截到错误页面 fetch 请求:', input);
                return Promise.reject(new Error('Blocked by script'));
            }
            return origFetch.apply(this, arguments);
        };
    }

    // 拦截页面导航
    function interceptNavigation() {
        document.addEventListener('click', function(event) {
            if (event.target.tagName === 'A' && event.target.href === CONFIG.ERROR_PAGE_URL) {
                event.preventDefault();
                console.log('阻止导航到错误页面');
            }
        });

        let oldHref = document.location.href;
        const observer = new MutationObserver(() => {
            if (oldHref !== document.location.href) {
                oldHref = document.location.href;
                if (document.location.href === CONFIG.ERROR_PAGE_URL) {
                    history.back();
                    console.log('检测到错误页面跳转，已返回上一页');
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 核心功能初始化
    function initializeCore() {
        interceptXHR();
        interceptFetch();
        interceptNavigation();

        waitForVideo().then(video => {
            injectControlButton(video);
        }).catch(err => {
            console.error('视频加载超时:', err);
        });
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

            observer.observe(document, { childList: true, subtree: true });

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

        btn.onclick = async () => {
            try {
                btn.disabled = true;
                btn.textContent = '处理中...';

                if (!validateParams()) {
                    throw new Error('关键参数未就绪，请播放一下视频');
                }

                await triggerEvent();
                showToast('✅ 已完成！', 'success');
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
        return resourceInfoId ;
    }

    // 触发事件请求
    function triggerEvent() {
        return new Promise((resolve, reject) => {
            const baseURL = 'http://58.132.9.45/BKPT/checkLookResource.action';
            const params = new URLSearchParams({
                resourceInfoId: resourceInfoId,
                wanChengType: '1'
            });

            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${baseURL}?${params}`);
            xhr.onload = () => {
                if (xhr.status === 200) {
                    console.log('事件触发成功:', xhr.responseText);
                    resolve();
                } else {
                    reject(new Error(`请求失败，状态码: ${xhr.status}`));
                }
            };
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
