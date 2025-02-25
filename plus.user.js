// ==UserScript==
// @name         朝阳教师学习平台视频进度欺骗器
// @namespace    http://tampermonkey.net/
// @version      1.0
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
        if(!myVid) return;

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

    // 显示浮动提示
    const showNotification = () => {
        const video = document.getElementById('player');
        if (!video) return;

        // 创建提示元素
        const notification = document.createElement('div');
        notification.textContent = '脚本加载成功';
        notification.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 16px;
        `;

        // 将提示添加到视频的父元素
        video.parentElement.style.position = 'relative';
        video.parentElement.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    };

    // 执行主逻辑
    const main = () => {
        if(hijacked) return;

        overrideTimeParams();
        bypassVerification();
        forceComplete();

        // 持续监控（应对SPA）
        setInterval(() => {
            overrideTimeParams();
            forceComplete();
        }, 5000);

        // 显示提示
        showNotification();
    };

    // 延迟启动以适应页面加载
    setTimeout(main, 3000);
})();
