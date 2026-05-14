const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  const isDev = !app.isPackaged;
  const serverPath = isDev 
    ? path.resolve(__dirname, 'server.ts')
    : path.resolve(__dirname, 'server.ts'); // In prod, we'll use ts-node or bundle it

  // Spawning the server process so it runs in the background of the app
  serverProcess = fork(serverPath, [], {
    env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production', PORT: '3000' },
    silent: false
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "MoonBuddy - Your Cosmic Study Companion",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Small delay to ensure server has started
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 1000);

  mainWindow.on('closed', function () {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', function () {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
