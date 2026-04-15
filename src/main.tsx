import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);

// 注册 PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/feiman-manim/sw.js');

    // 当检测到新版本时，通知用户
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新版本已安装，旧版本还在运行 → 有更新可用
          console.log('[PWA] 发现新版本');
          // 将注册对象暴露出去，供检查更新按钮使用
          (window as any).__swRegistration = registration;
        }
      });
    });

    // 将注册对象始终暴露
    (window as any).__swRegistration = registration;

    // 监听 Service Worker 控制器变化（新 SW 激活后自动刷新）
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('[PWA] 新版本已激活，正在刷新...');
      window.location.reload();
    });
  });
}

// 检查更新：强制更新 Service Worker 并重新加载（保留封面图等缓存）
(window as any).__checkForUpdate = async function () {
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }

  try {
    const registration: ServiceWorkerRegistration | undefined = (window as any).__swRegistration;

    if (registration) {
      // 1. 强制向服务器检查新版本
      await registration.update();

      // 2. 如果有新版本在等待激活，通知它跳过等待并激活
      if (registration.waiting) {
        console.log('[PWA] 激活新版本...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // controllerchange 事件会自动触发刷新
        return;
      }
    }

    // 3. 没有等待中的更新，直接刷新（会重新验证 precache 资源）
    console.log('[PWA] 未发现新版本，刷新页面...');
    window.location.reload();
  } catch (e) {
    console.error('[PWA] 检查更新失败:', e);
    window.location.reload();
  }
};