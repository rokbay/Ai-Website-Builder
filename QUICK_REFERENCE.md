## 🚀 Quickest Start (3 Options)

### Option 1: .NET CLR Launcher (Recommended)
```
1. Install .NET 8 SDK
   → https://dotnet.microsoft.com/download

2. Open this folder in VS Code
   → Ctrl+K, Ctrl+O → select this folder

3. Press F5 to launch
   → Done! App opens in ~5 seconds
```

### Option 2: Direct Node.js (If Available)
```
1. Find your Node.js path
   → In VS Code terminal: where node

2. Run our helper script
   → .\run-with-nodejs.bat "C:\Path\To\Node.js"

3. Open http://localhost:3000
   → Done! Direct browser access
```

### Option 3: Manual Node.js
```
1. Add Node.js to PATH
2. npm install
3. npm run dev
4. Open http://localhost:3000
```

## 📋 Requirements Checklist

- ✅ .NET 8 SDK installed (`dotnet --version`)
- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm working (`npm --version`)
- ✅ WebView2 Runtime (usually pre-installed)

## 🎮 Controls in the App

| Control | Action |
|---------|--------|
| Type in textarea | Describe your project |
| "Enhance Prompt" button | AI improves your description |
| "Launch Workspace" button | Creates & opens your project |
| Click template | Quick-start with a template |
| 🔄 Refresh button | Reload the web page |
| 🛠️ Dev Tools button | Open browser DevTools (F12) + Test API connectivity |

## 🔄 Common Tasks

### Launch the App
```bash
# Option 1: VS Code F5
Press: Ctrl + F5 or  F5 after selecting .NET config

# Option 2: Windows Script
double-click: build-and-launch.bat

# Option 3: Manual
dotnet build -c Debug AiWebsiteBuilder.csproj
./bin/Debug/net8.0-windows/AiWebsiteBuilder.exe
```

### Work on React Components
```bash
# Components auto-refresh when you save
Edit: components/custom/LaunchPanel.jsx
→ File saves → React auto-reloads → See changes
(click the 🔄 Refresh button if needed)
```

### Debug C# Code
```
Set breakpoint in: Views/MainWindow.xaml.cs
Press: F5 (Debug button)
Click: step over/into/out icons
```

### Debug JavaScript
```
Click: 🛠️ Dev Tools button in app header
Or press: F12
Use: Console, Sources, Elements tabs as normal
```

### Rebuild Everything
```bash
# Deep clean and rebuild
dotnet clean AiWebsiteBuilder.csproj
npm install
dotnet build -c Debug AiWebsiteBuilder.csproj
# Press F5 to run
```

## 🐛 Troubleshooting

### **Problem**: ".NET SDK not found"
**Solution**: Install from https://dotnet.microsoft.com/download

### **Problem**: "WebView2 not found"
**Solution**: Download from https://developer.microsoft.com/microsoft-edge/webview2/

### **Problem**: "npm not found"
**Solution**: Reinstall Node.js from https://nodejs.org/

### **Problem**: "Port 3000 already in use"
**Solution**: App auto-detects this. If issues:
```powershell
# PowerShell: Kill process on port 3000
$proc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }
```

### **Problem**: "Dev tools button does nothing"
**Solution**: Try pressing F12 directly in the window

## 📁 Important Files

| File | Purpose |
|------|---------|
| `Views/MainWindow.xaml.cs` | Launcher logic (C#) |
| `components/custom/LaunchPanel.jsx` | Launch panel UI (React) |
| `.env.local` | API keys and config |
| `next.config.mjs` | Next.js settings |
| `package.json` | npm dependencies |

## 🎯 Flow Diagram

```
Start App (F5)
    ↓
.NET Builds
    ↓
WPF Window Opens
    ↓
Checks Port 3000
    ↓
Starts Next.js
    ↓
WebView2 Loads React
    ↓
Ready! 🎉
```

## 💡 Pro Tips

1. **Keep DevTools open** - Press F12 to see JavaScript errors
2. **Check status bar** - See what the launcher is doing
3. **Use Refresh button** - Faster than stopping/restarting
4. **Edit & Save** - React auto-hot-reloads most changes
5. **Full stack debug** - Use C# debugger for backend logic

## 🔗 Related Documentation

- **Full Setup Guide**: `DOTNET_SETUP.md`
- **Implementation Details**: `DOTNET_IMPLEMENTATION.md`
- **Main README**: `README.md`

## ⚡ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F5` | Start debugging |
| `Ctrl+F5` | Start without debugging |
| `F10` | Step over (debug) |
| `F11` | Step into (debug) |
| `Shift+F11` | Step out (debug) |
| `F12` | Open DevTools in browser |
| `Ctrl+Shift+J` | Console in DevTools |
| `Ctrl+Shift+E` | Explorer in DevTools |

## 🆘 Get Help

1. Check the **status bar** at bottom of WPF window
2. Open **DevTools** (F12) and check Console tab
3. Look at **Output panel** in VS Code
4. Read `DOTNET_SETUP.md` → Troubleshooting section

## ✨ You're All Set!

Everything is configured and ready to go:
- ✅ C# launcher with CLR debugging
- ✅ React Launch Panel for projects
- ✅ Workspace editor
- ✅ AI integration
- ✅ Everything in one window

**Just press F5 and start building!**

---

*Last Updated: April 2026*  
*AI Website Builder - .NET Hybrid Architecture*
