// ==UserScript==
// @name         朝阳教师学习平台视频进度欺骗器
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  强制标记视频为已完成状态
// @author       siiloo
// @match        http://58.132.9.45/*
// @match        http://yxw.bjchyedu.cn/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 劫持原始时间参数
    let hijacked = false;

    const overrideTimeParams = () => {
        const myVid = document.getElementById('player');
        if (!myVid) return;

        // 覆盖关键时间检测函数
        myVid.seekable.end = function() {
            return [999999]; // 设置超大可播放时长
        };

        // 劫持当前播放时间
        Object.defineProperty(myVid, 'currentTime', {
            get: function() { return 999999; }, // 始终返回极大值
            set: function() {} // 禁用时间设置
        });

        // 劫持mytime计数器
        const _interval = window.myInterval;
        window.myInterval = function() {
            window.mytime = 999999; // 强制设置计时器
            _interval && _interval();
        };

        hijacked = true;
    };

    // 绕过问题验证
    const bypassVerification = () => {
        $.blockUI = function() { console.log('BlockUI prevented'); };
        window.reload_code = function() {};
    };

    // 强制提交完成请求
    const forceComplete = () => {
        const fakeParams = {
            resourceInfoId: resourceInfoId2,
            userId: userId2,
            courseInfoId: courseInfoId2,
            wanChengType: 1
        };

        fetch('/BKPT/checkLookResource.action?' + new URLSearchParams(fakeParams), {
            method: 'GET',
            credentials: 'include'
        });
    };

    // 创建并添加按钮
    const createButton = () => {
        const video = document.getElementById('player');
        if (!video) return;

        const button = document.createElement('button');
        button.textContent = '标记完成';
        button.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: #ff4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        // 鼠标悬停效果
        button.onmouseover = () => {
            button.style.background = '#ff6666';
        };
        button.onmouseout = () => {
            button.style.background = '#ff4444';
        };

        // 点击事件
        button.onclick = () => {
            if (!hijacked) {
                overrideTimeParams();
                bypassVerification();
                forceComplete();

                // 持续监控（应对SPA）
                setInterval(() => {
                    overrideTimeParams();
                    forceComplete();
                }, 5000);

                button.textContent = '已标记';
                button.style.background = '#44ff44';
                button.disabled = true;
            }
        };

        // 将按钮添加到视频的父元素
        video.parentElement.style.position = 'relative';
        video.parentElement.appendChild(button);
    };

    // 初始化函数
    const init = () => {
        // 检查视频元素是否加载完成
        const checkVideo = setInterval(() => {
            if (document.getElementById('player')) {
                clearInterval(checkVideo);
                createButton();
            }
        }, 500);
    };

    // 页面加载完成后启动
    window.addEventListener('load', init);
})();
