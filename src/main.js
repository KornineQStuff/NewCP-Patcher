const { app, BrowserWindow, autoUpdater, Menu, ipcMain, session } = require("electron");
const discord_integration = require('./integrations/discord');
const path = require("path");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) app.quit();

// Check for updates except for macOS
if (process.platform != "darwin") require("update-electron-app")({ repo: "KornineQStuff/NewCP-Patcher" });

const ALLOWED_ORIGINS = [
  "https://newcp.net",
  "https://play.newcp.net",
  "https://appeal.newcp.net",
];

const pluginPaths = {
  win32: path.join(path.dirname(__dirname), "lib/pepflashplayer.dll"),
  darwin: path.join(path.dirname(__dirname), "lib/PepperFlashPlayer.plugin"),
  linux: path.join(path.dirname(__dirname), "lib/libpepflashplayer.so"),
};


if (process.platform === "linux") app.commandLine.appendSwitch("no-sandbox");
const pluginName = pluginPaths[process.platform];
console.log("pluginName", pluginName);

app.commandLine.appendSwitch("ppapi-flash-path", pluginName);
app.commandLine.appendSwitch("ppapi-flash-version", "31.0.0.122");
app.commandLine.appendSwitch("ignore-certificate-errors");

let mainWindow;
const createWindow = () => {
  // Create the browser window.
  let splashWindow = new BrowserWindow({
    width: 600,
    height: 320,
    frame: false,
    transparent: true,
    show: false,
  });

  const newMenuTemplate = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Fullscreen',
          click: () => {
            mainWindow.webContents.executeJavaScript(`
            document.querySelector("#D_F_GameSection").requestFullscreen()
            `);
          },
        },
      ],
    },
  ];

    // Create a menu from the template
  const newMenu = Menu.buildFromTemplate(newMenuTemplate);

  // Set the menu to be the application menu
  Menu.setApplicationMenu(newMenu);

  splashWindow.setResizable(false);
  splashWindow.loadURL(
    "file://" + path.join(path.dirname(__dirname), "src/index.html"),
  );
  splashWindow.on("closed", () => (splashWindow = null));
  splashWindow.webContents.on("did-finish-load", () => {
    splashWindow.show();
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    show: false,
    title: 'NewCP Patcher',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      plugins: true,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (splashWindow) {
      splashWindow.close();
      mainWindow.show();
    }
    discord_integration.initDiscordRichPresence();
  });

  mainWindow.webContents.on("will-navigate", (event, urlString) => {
    if (!ALLOWED_ORIGINS.includes(new URL(urlString).origin)) {
      event.preventDefault();
    }
  });
  app.on('before-quit', (e) => {
    mainWindow.destroy()
  })
  mainWindow.on("closed", () => (mainWindow = null));

  mainWindow.webContents.session.clearHostResolverCache();

  new Promise((resolve) =>
    setTimeout(() => {
      mainWindow.loadURL("https://play.newcp.net/");
      resolve();
    }, 5000)
  );
};

const launchMain = () => {
  // Disallow multiple clients running
  if (!app.requestSingleInstanceLock()) return app.quit();
  app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.setAsDefaultProtocolClient("newcp");

  app.whenReady().then(() => {
    createWindow();
    
    app.on("activate", () => {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

const blockList = [
  'googleadservices.com',
  'doubleclick.net',
  'adsystem',
  'adservice.google.com',
  'adclick.g.doubleclick.net',
  'g.doubleclick.net',
  'pagead2.googlesyndication.com',
  'securepubads.g.doubleclick.net',
  'static.doubleclick.net'
];

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    if (blockList.some(domain => url.includes(domain))) {
      console.log(`Blocked: ${url}`);
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });
});

// Ad-blocker function using the preload script and IPC
setInterval(() => {
  mainWindow.webContents.send('remove-ads');
}, 1000); // Run every second

launchMain();
