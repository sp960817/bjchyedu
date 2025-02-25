// ==UserScript==
// @name         朝阳教师学习平台视频进度欺骗器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  强制标记视频为已完成状态（新增密码验证）
// @author       siiloo
// @match        http://58.132.9.45/*
// @match        http://yxw.bjchyedu.cn/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 检查是否已验证过（使用 localStorage 存储验证状态）
    const isVerified = localStorage.getItem('scriptVerified') === 'true';
    const correctPassword = 'xiaojilingqiu';

    // 如果未验证，显示密码输入框
    if (!isVerified) {
        const userInput = prompt('请输入密码以使用脚本：', '');
        if (userInput !== correctPassword) {
            alert('密码错误，脚本将不会运行！');
            return; // 退出脚本
        } else {
            localStorage.setItem('scriptVerified', 'true');
            alert('密码正确，脚本已激活！');
        }
    }

    // 劫持原始时间参数
    let hijacked = false;

    const overrideTimeParams = () => {
        const myVid = document.getElementById('player');
        if (!myVid) return;

        myVid.seekable.end = function() {
            return [999999];
        };

        Object.defineProperty(myVid, 'currentTime', {
            get: function() { return 999999; },
            set: function() {}
        });

        const _interval = window.myInterval;
        window.myInterval = function() {
            window.mytime = 999999;
            _interval && _interval();
        };

        hijacked = true;
    };

    const bypassVerification = () => {
        $.blockUI = function() { console.log('BlockUI prevented'); };
        window.reload_code = function() {};
    };

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

        button.onmouseover = () => {
            button.style.background = '#ff6666';
        };
        button.onmouseout = () => {
            button.style.background = '#ff4444';
        };

        button.onclick = () => {
            if (!hijacked) {
                overrideTimeParams();
                bypassVerification();
                forceComplete();

                // 延迟1秒后播放视频并在0.5秒后暂停
                setTimeout(() => {
                    video.play().then(() => {
                        setTimeout(() => {
                            video.pause();
                        }, 500); // 暂停延迟0.5秒
                    }).catch(err => {
                        console.log('播放失败:', err);
                    });
                }, 1000); // 初始延迟1秒

                setInterval(() => {
                    overrideTimeParams();
                    forceComplete();
                }, 5000);

                button.textContent = '已标记';
                button.style.background = '#44ff44';
                button.disabled = true;
            }
        };

        video.parentElement.style.position = 'relative';
        video.parentElement.appendChild(button);
    };

    const init = () => {
        const checkVideo = setInterval(() => {
            if (document.getElementById('player')) {
                clearInterval(checkVideo);
                createButton();
            }
        }, 500);
    };

    window.addEventListener('load', init);
})();
