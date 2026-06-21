const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const isDev = !app.isPackaged;
  
  let backendDir;
  if (isDev) {
    backendDir = path.join(__dirname, 'snowball_backend');
  } else {
    backendDir = path.join(process.resourcesPath, 'snowball_backend');
  }

  console.log('Starting backend from:', backendDir);

  // Use exec with full path on Windows
  const command = `cd /d "${backendDir}" && node ./bin/www`;
  
  backendProcess = exec(command, {
    env: { 
      ...process.env, 
      PORT: '5000'
    }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data.toString()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data.toString()}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'snowball_frontend', 'out', 'index.html'));
  }
}

app.whenReady().then(() => {
  startBackend();
  
  setTimeout(() => {
    createWindow();
  }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});