import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// PWA Service Worker 注册（使用 workbox prompt 模式）
let swRegistration: ServiceWorkerRegistration | null = null;

function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const swUrl = '/feiman-manim/sw.js';

  if (swUrl) {
    navigator.serviceWorker.register(swUrl, {
      scope: '/feiman-manim/',
    }).then((reg) => {
      swRegistration = reg;

      // 新 SW 安装完成，等待激活
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 有新版本可用，等待用户确认
            console.log('[PWA] 新版本已就绪，等待激活');
          }
        });
      });

      // 当前没有 controller，说明是首次安装
      if (!navigator.serviceWorker.controller) {
        console.log('[PWA] Service Worker 已注册（首次安装）');
      }
    }).catch((err) => {
      console.error('[PWA] Service Worker 注册失败:', err);
    });
  }

  // SW 控制器变更时刷新页面（应用新版本）
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA] 控制器变更，刷新页面');
    window.location.reload();
  });
}

registerSW();

// 检查更新按钮逻辑
(window as any).__checkForUpdate = async () => {
  console.log('[PWA] 正在检查更新...');

  if (!swRegistration) {
    window.location.reload();
    return;
  }

  try {
    // 强制检查新版本
    await swRegistration.update();

    if (swRegistration.waiting) {
      // 有新版本等待激活 → 通知它跳过等待
      (swRegistration.waiting as ServiceWorker).postMessage({ type: 'SKIP_WAITING' });
      // controllerchange 事件会触发刷新
      return;
    }

    // 没有等待中的更新，可能已经是最新或正在安装中
    // 等 3 秒再检查一次（给安装时间）
    await new Promise(r => setTimeout(r, 3000));
    if (swRegistration.waiting) {
      (swRegistration.waiting as ServiceWorker).postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    console.log('[PWA] 已是最新版本');
    window.location.reload();
  } catch (err) {
    console.error('[PWA] 检查更新失败:', err);
    window.location.reload();
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);