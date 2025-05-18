# Electron WebViewer 下载进度条实现指南

## 问题描述

在 Electron 应用中使用 WebViewer 组件时，下载文件的进度条显示是一个常见的难点。主要存在以下几个问题：

1. WebViewer 是独立的进程，普通的下载事件监听方式可能无效
2. 重复触发文件选择对话框
3. 下载进度无法正确显示
4. 下载完成后状态更新不及时

## 解决方案

### 1. 主进程中的实现

在主进程（通常是 `main.js`）中，需要正确设置下载事件监听：

```javascript
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    // 防止重复监听
    if (contents.session.listenerCount('will-download') > 0) {
      return;
    }

    contents.session.on('will-download', (event, item, webContents) => {
      // 获取文件名
      const fileName = item.getFilename();
      
      // 让用户选择保存位置
      const filePath = dialog.showSaveDialogSync({
        defaultPath: fileName
      });

      if (filePath) {
        // 设置保存路径
        item.setSavePath(filePath);

        // 监听下载进度
        item.on('updated', (event, state) => {
          if (state === 'progressing' && !item.isPaused()) {
            const progress = (item.getReceivedBytes() / item.getTotalBytes()) * 100;
            // 发送进度信息到所有窗口
            BrowserWindow.getAllWindows().forEach(win => {
              if (!win.isDestroyed()) {
                win.webContents.send('download-progress', {
                  progress: progress,
                  state: 'progressing',
                  fileName: fileName
                });
              }
            });
          }
        });

        // 下载完成事件
        item.on('done', (event, state) => {
          BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
              win.webContents.send('download-progress', {
                progress: 100,
                state: state,
                fileName: fileName
              });
            }
          });
        });
      } else {
        // 用户取消选择时取消下载
        item.cancel();
      }
    });
  }
});
```

### 2. WebViewer 组件中的实现

在 WebViewer 自定义组件中，需要添加进度条 UI 和事件监听：

```javascript
// 添加进度条 HTML 结构
<div class="download-progress">
  <div class="download-info">
    <span class="download-name"></span>
    <span class="download-percent">0%</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill"></div>
  </div>
</div>

// 添加样式
.download-progress {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: rgba(26, 26, 26, 0.8);
  color: #ffffff;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  backdrop-filter: blur(4px);
  transition: opacity 0.3s ease;
  opacity: 0;
  pointer-events: none;
  z-index: 1000;
  max-width: 300px;
}

// 监听下载进度
ipcRenderer.on('download-progress', (event, data) => {
  // 更新进度显示
  downloadProgress.classList.add('visible');
  downloadName.textContent = data.fileName;
  
  const percent = Math.round(data.progress);
  progressFill.style.width = `${percent}%`;
  downloadPercent.textContent = `${percent}%`;

  // 处理下载状态
  if (data.state === 'completed') {
    setTimeout(() => {
      downloadProgress.classList.remove('visible');
      progressFill.style.width = '0';
    }, 3000);
  } else if (data.state === 'cancelled' || data.state === 'interrupted') {
    downloadProgress.classList.remove('visible');
    progressFill.style.width = '0';
    downloadName.textContent = `${data.fileName} - ${data.state === 'cancelled' ? '已取消' : '已中断'}`;
  }
});
```

## 关键点说明

1. **避免重复监听**：
   - 使用 `listenerCount` 检查是否已经添加了下载监听器
   - 防止重复触发文件选择对话框

2. **正确的事件流**：
   - 在主进程中监听 `web-contents-created` 事件
   - 使用 `session.on('will-download')` 处理下载
   - 不要使用 `event.preventDefault()`，这会阻止下载

3. **进度通知机制**：
   - 使用 IPC 通信将下载进度从主进程发送到渲染进程
   - 通知所有窗口以确保消息能被正确接收

4. **用户体验优化**：
   - 使用同步的文件选择对话框确保流程顺畅
   - 添加下载状态提示（完成、取消、中断）
   - 设置合适的进度条显示/隐藏动画

## 注意事项

1. 确保 WebViewer 的 webPreferences 正确配置：
   ```javascript
   webPreferences: {
     nodeIntegration: true,
     contextIsolation: false,
     webviewTag: true
   }
   ```

2. 下载进度条的 z-index 要足够高，确保能显示在 WebViewer 之上

3. 使用 `BrowserWindow.getAllWindows()` 确保所有窗口都能收到下载进度更新

4. 注意处理下载取消和中断的情况，给予用户适当的反馈

## 常见问题

1. **问题**：下载对话框重复出现
   **解决**：检查是否重复监听了下载事件，使用 `listenerCount` 进行防重复处理

2. **问题**：看不到下载进度
   **解决**：确保 IPC 通信正确，进度条 z-index 设置合适

3. **问题**：下载完成后进度条不消失
   **解决**：正确处理 `done` 事件，设置适当的延时隐藏

4. **问题**：WebViewer 遮挡进度条
   **解决**：使用 `fixed` 定位和适当的 z-index 确保进度条始终可见 