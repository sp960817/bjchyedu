// ==UserScript==
// @name         一键结业
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  一键完成调查问卷
// @author       siiloo
// @match        http://58.132.9.45/survey/actor/*
// @match        http://yxw.bjchyedu.cn/survey/actor/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 获取当前域名
    const currentHost = window.location.hostname;

    // 创建一键完成按钮
    const completeButton = document.createElement('button');
    completeButton.textContent = '一键结业';
    completeButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 9999;
    `;

    // 添加按钮到页面
    document.body.appendChild(completeButton);

    // 监听按钮点击事件
    completeButton.addEventListener('click', function() {
        // 获取当前URL的查询参数
        const urlParams = new URLSearchParams(window.location.search);

        // 获取页面中可能存在的参数
        let surveyId = urlParams.get('surveyId') || '22589'; // 默认值
        let tempUserId = urlParams.get('tempUserId') || '53794'; // 默认值
        let itemId = urlParams.get('itemId') || '255549'; // 默认值
        let firstItemId = urlParams.get('firstItemId') || '255465'; // 默认值
        let preItemId = urlParams.get('preItemId') || '255542'; // 默认值
        let nextItemId = urlParams.get('nextItemId') || '255465'; // 默认值
        let lastItemId = urlParams.get('lastItemId') || '255549'; // 默认值

        // 获取当前时间
        const now = new Date();
        const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}+${String(now.getHours()).padStart(2, '0')}%3A${String(now.getMinutes()).padStart(2, '0')}%3A${String(now.getSeconds()).padStart(2, '0')}`;

        // 构造最终提交的参数
        const finalParams = new URLSearchParams({
            saveLast: '',
            surveyId: surveyId,
            optionId: '',
            joinItemId: '',
            optionIds: '',
            inputStr: encodeURIComponent('无其他建议\r\n'),
            nowDate: nowDate,
            tempUserId: tempUserId,
            itemId: itemId,
            answerType: '160030',
            firstItemId: firstItemId,
            preItemId: preItemId,
            nextItemId: nextItemId,
            lastItemId: lastItemId,
            shuru: encodeURIComponent('无其他建议\r\n')
        });

        // 根据当前域名设置目标URL
        const baseUrl = currentHost === '58.132.9.45' 
            ? 'http://58.132.9.45' 
            : 'http://yxw.bjchyedu.cn';

        // 发送请求
        fetch(`${baseUrl}/survey/actor/NewSaveAnswerAction.a?${finalParams.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => {
            if (response.ok) {
                alert('问卷已自动完成！');
            } else {
                alert('结业完成');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('发生错误，请查看控制台');
        });
    });
})();
