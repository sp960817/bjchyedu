// ==UserScript==
// @name         视频完成按钮（仅视频页面）
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  仅在视频页面显示一个“完成观看”按钮，支持两个域名，密码只验证一次
// @author       siiloo
// @match        http://58.132.9.45/*
// @match        http://yxw.bjchyedu.cn/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 定义全局变量存储动态参数
    let resourceInfoId = null;
    let totalLength = null;
    const correctPassword = '小机灵球'; // 设置密码

    // 使用 Greasemonkey 的 GM_getValue 和 GM_setValue 来跨域名存储验证状态
    const isVerified = GM_getValue('scriptVerified', false);

    // 密码验证函数，只在整个会话中验证一次
    function verifyPassword() {
        if (isVerified) {
            initializeScript();
            return;
        }

        const password = prompt('请输入密码以启用脚本：');
        if (password === correctPassword) {
            GM_setValue('scriptVerified', true); // 存储验证状态
            alert('验证成功！');
            initializeScript();
        } else {
            alert('密码错误，脚本将不会运行！');
        }
    }

    // 初始化脚本的主要逻辑
    function initializeScript() {
        // 重写XMLHttpRequest的open方法，拦截网络请求
        (function() {
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (method === 'GET' && url.includes('selectStuResourceInfo.action')) {
                    const params = new URLSearchParams(url.split('?')[1]);
                    resourceInfoId = params.get('resourceInfoId');
                    totalLength = parseFloat(params.get('totalLength'));
                    console.log('捕获到的参数:', 'resourceInfoId=', resourceInfoId, 'totalLength=', totalLength);
                }
                originalOpen.apply(this, arguments);
            };
        })();

        // 等待视频元素加载并添加按钮
        function waitForVideo() {
            const video = document.querySelector('video');
            if (video) {
                addButton(video);
            } else {
                // 如果页面还没有视频元素，监听DOM变化
                const observer = new MutationObserver(function(mutations) {
                    const video = document.querySelector('video');
                    if (video) {
                        addButton(video);
                        observer.disconnect(); // 停止观察
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }

        // 添加单个按钮到视频播放器附近
        function addButton(video) {
            // 检查是否已添加按钮，避免重复
            if (video.parentElement.querySelector('.complete-button')) return;

            // 创建按钮
            const completeButton = document.createElement('button');
            completeButton.textContent = '完成观看';
            completeButton.className = 'complete-button';
            completeButton.style.position = 'absolute';
            completeButton.style.top = '10px';
            completeButton.style.right = '10px';
            completeButton.style.zIndex = '1000';
            completeButton.style.padding = '5px 10px';
            completeButton.style.backgroundColor = '#4CAF50';
            completeButton.style.color = 'white';
            completeButton.style.border = 'none';
            completeButton.style.borderRadius = '3px';
            completeButton.style.cursor = 'pointer';

            // 将按钮添加到视频元素的父元素
            video.parentElement.style.position = 'relative';
            video.parentElement.appendChild(completeButton);

            // 按钮点击事件
            completeButton.addEventListener('click', function() {
                if (resourceInfoId && totalLength !== null) {
                    const lookTimes = calculateLookTimes(totalLength);
                    sendRequest(lookTimes);
                    alert('已发送完成观看请求！');
                } else {
                    alert('未获取到参数，请确保视频已加载！');
                }
            });
        }

        // 计算lookTimes
        function calculateLookTimes(totalLength) {
            let lookTimes = totalLength - 12; // 假设完成观看为视频总时长减去12秒
            return Math.max(lookTimes.toFixed(2), 0);
        }

        // 发送请求，动态选择域名
        function sendRequest(lookTimes) {
            const xhr = new XMLHttpRequest();
            const currentHost = window.location.hostname;
            let baseUrl;
            if (currentHost === '58.132.9.45') {
                baseUrl = 'http://58.132.9.45/BKPT/stuResourceInfo.action';
            } else if (currentHost === 'yxw.bjchyedu.cn') {
                baseUrl = 'http://yxw.bjchyedu.cn/BKPT/stuResourceInfo.action';
            } else {
                alert('未知的域名，无法发送请求！');
                return;
            }

            const url = `${baseUrl}?lookTimes=${lookTimes}&totalLength=${totalLength}&resourceInfoId=${resourceInfoId}&userId=5000167466&roleInfoId=7&courseInfoId=5000027326`;
            xhr.open('GET', url, true);
            xhr.send();
            console.log('发送请求:', url);
        }

        // 启动脚本
        waitForVideo();
    }

    // 启动密码验证
    verifyPassword();
})();
