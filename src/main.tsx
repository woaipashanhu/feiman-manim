import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// 注册 PWA Service Worker
let swRegistration: ServiceWorkerRegistration | null = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      swRegistration = await navigator.serviceWorker.register('/feiman-manim/sw.js', {
        scope: '/feiman-manim/',
      });

      // 监听新版本安装
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration?.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[PWA] 新版本已激活');
          }
        });
      });

      console.log('[PWA] Service Worker 注册成功');
    } catch (err) {
      console.error('[PWA] Service Worker 注册失败:', err);
    }
  });
}

// 检查更新：强制更新 Service Worker，保留缓存（封面图等 runtimeCache 不受影响）
(window as any).__checkForUpdate = async () => {
  console.log('[PWA] 正在检查更新...');

  if (!swRegistration) {
    // 没有注册对象，直接刷新
    window.location.reload();
    return;
  }

  try {
    // 强制向服务器检查新版本
    await swRegistration.update();

    // 如果有新版本在等待激活，通知它跳过等待
    if (swRegistration.waiting) {
      console.log('[PWA] 激活新版本...');
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // 等待 controllerchange 事件触发刷新
      return;
    }

    // 没有等待中的更新，直接刷新
    console.log('[PWA] 已是最新版本');
    window.location.reload();
  } catch (err) {
    console.error('[PWA] 检查更新失败:', err);
    window.location.reload();
  }
};

// 监听 Service Worker 控制器变化，自动刷新页面
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  console.log('[PWA] 控制器已变更，刷新页面');
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);