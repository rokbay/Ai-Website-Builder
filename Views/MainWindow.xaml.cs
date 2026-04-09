using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using AiWebsiteBuilder.Services;

namespace AiWebsiteBuilder.Views
{
    public partial class MainWindow : Window
    {
        private Process? _nextJsProcess;
        private WebMessageBridge? _webMessageBridge;
        private const string LOCALHOST = "http://localhost:3000";
        private const int LAUNCH_DELAY = 3000; // Wait 3 seconds for Next.js to start

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
            Closing += MainWindow_Closing;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            UpdateStatus("Running environment diagnostics...");
            await RunStartupDiagnostics();

            UpdateStatus("Initializing WebView2...");
            await InitializeWebView();
        }

        private async Task RunStartupDiagnostics()
        {
            try
            {
                var diagnostics = EnvironmentValidator.RunAllDiagnostics();
                var hasErrors = false;
                var diagnosticMessages = new System.Text.StringBuilder();

                diagnosticMessages.AppendLine("=== Environment Diagnostics ===\n");

                foreach (var kvp in diagnostics)
                {
                    var result = kvp.Value;
                    var icon = result.Severity switch
                    {
                        DiagnosticSeverity.Error => "❌",
                        DiagnosticSeverity.Warning => "⚠️",
                        _ => "✅"
                    };

                    diagnosticMessages.AppendLine($"{icon} {result.Name}: {result.Status}");
                    diagnosticMessages.AppendLine($"   {result.Message}\n");

                    if (result.Severity == DiagnosticSeverity.Error)
                        hasErrors = true;
                }

                var message = diagnosticMessages.ToString();
                System.Diagnostics.Debug.WriteLine(message);
                UpdateStatus("Diagnostics complete");

                if (hasErrors)
                {
                    var result = MessageBox.Show(
                        message + "\nSome dependencies are missing. Continue anyway?",
                        "Environment Warning",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Warning);

                    if (result == MessageBoxResult.No)
                    {
                        Application.Current.Shutdown();
                    }
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Diagnostics error: {ex.Message}");
            }
        }

        private async Task InitializeWebView()
        {
            try
            {
                // Initialize WebView2 with localhost support
                var userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "AiWebsiteBuilder");

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await WebView.EnsureCoreWebView2Async(env);

                // Configure WebView2 for localhost development
                WebView.CoreWebView2.Settings.IsWebMessageEnabled = true;
                WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
                WebView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                // Initialize WebMessage bridge (Blazor-style IPC)
                _webMessageBridge = new WebMessageBridge(WebView.CoreWebView2);
                
                // Register request handlers from browser
                _webMessageBridge.OnRequest<dynamic>("getDiagnostics", async (data) =>
                {
                    return EnvironmentValidator.RunAllDiagnostics();
                });

                _webMessageBridge.OnRequest<dynamic>("getServerStatus", async (data) =>
                {
                    return new
                    {
                        isRunning = _nextJsProcess != null && !_nextJsProcess.HasExited,
                        url = LOCALHOST,
                        timestamp = DateTime.UtcNow
                    };
                });

                // Enable UI controls during initialization
                RefreshButton.IsEnabled = true;
                DevToolsButton.IsEnabled = true;

                UpdateStatus("Launching Next.js server...");
                await StartNextJsServer();

                UpdateStatus("Waiting for server to be ready...");
                await WaitForServerReady();

                UpdateStatus("Loading application...");
                WebView.CoreWebView2.Navigate(LOCALHOST);

                // Setup notification when navigation completes
                WebView.NavigationCompleted += async (s, e) =>
                {
                    if (e.IsSuccess)
                    {
                        LoadingOverlay.Visibility = Visibility.Collapsed;
                        UpdateStatus("Ready - Connected via WebMessage bridge");

                        await _webMessageBridge?.NotifyAsync("server:ready", new { status = "healthy" });

                        // Check server health
                        await CheckServerHealth();
                    }
                    else
                    {
                        UpdateStatus($"Navigation failed: {e.WebErrorStatus}");
                        await _webMessageBridge?.NotifyAsync("server:error", new { reason = e.WebErrorStatus.ToString() });

                        MessageBox.Show($"Failed to load application:\n{e.WebErrorStatus}",
                            "Connection Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                };

                WebView.NavigationStarting += (s, e) =>
                {
                    UpdateStatus($"Connecting to {e.Uri}...");
                };
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error: {ex.Message}");
                MessageBox.Show($"Failed to initialize WebView2:\n{ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async Task CheckServerHealth()
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.Timeout = TimeSpan.FromSeconds(3);

                var response = await client.GetAsync($"{LOCALHOST}/api/health");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    UpdateStatus("Server health: OK");
                    await _webMessageBridge?.NotifyAsync("server:health", new { status = "ok" });
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Health check failed: {ex.Message}");
                await _webMessageBridge?.NotifyAsync("server:warning", new { reason = ex.Message });
            }
        }

        private async Task WaitForServerReady()
        {
            const int MAX_RETRIES = 10; // Reduced from 30 to 10 attempts
            const int RETRY_DELAY = 1000; // 1 second between checks

            using var client = new System.Net.Http.HttpClient();
            client.Timeout = TimeSpan.FromSeconds(3);

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++)
            {
                try
                {
                    UpdateStatus($"Checking server readiness... (attempt {attempt}/{MAX_RETRIES})");

                    // First, try to connect to the main page
                    var response = await client.GetAsync(LOCALHOST);
                    if (response.IsSuccessStatusCode)
                    {
                        // Verify with health endpoint
                        try
                        {
                            var healthResponse = await client.GetAsync($"{LOCALHOST}/api/health");
                            if (healthResponse.IsSuccessStatusCode)
                            {
                                UpdateStatus("Server is healthy - all endpoints accessible");
                                return;
                            }
                        }
                        catch
                        {
                            // Health endpoint might not be available yet, but main page is
                        }

                        // Test the main API endpoints as fallback
                        var apiTest = await client.GetAsync($"{LOCALHOST}/api/enhance-prompt");
                        if (apiTest.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed ||
                            apiTest.StatusCode == System.Net.HttpStatusCode.OK)
                        {
                            UpdateStatus("Server is responding - API endpoints are accessible");
                            return;
                        }
                    }
                }
                catch (System.Net.Http.HttpRequestException ex)
                {
                    // Connection failed, server not ready yet
                    if (attempt < MAX_RETRIES)
                    {
                        UpdateStatus($"Connection failed: {ex.Message} - retrying in 1s...");
                        await Task.Delay(RETRY_DELAY);
                        continue;
                    }
                    else
                    {
                        UpdateStatus($"Server failed to start after {MAX_RETRIES} attempts");

                        var result = MessageBox.Show(
                            $"Could not connect to Next.js server at {LOCALHOST}\n\n" +
                            $"Error: {ex.Message}\n\n" +
                            "This might be due to:\n" +
                            "• Node.js not installed or not in PATH\n" +
                            "• Firewall blocking localhost connections\n" +
                            "• Port 3000 already in use by another application\n\n" +
                            "Try running the application with Node.js directly:\n" +
                            "npm run dev\n\n" +
                            "Continue anyway?",
                            "Server Connection Failed",
                            MessageBoxButton.YesNo,
                            MessageBoxImage.Warning);

                        if (result == MessageBoxResult.Yes)
                        {
                            UpdateStatus("Continuing without server verification...");
                            return;
                        }
                        else
                        {
                            Application.Current.Shutdown();
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    UpdateStatus($"Unexpected error: {ex.Message}");
                    await Task.Delay(RETRY_DELAY);
                }
            }
        }

        private async Task StartNextJsServer()
        {
            try
            {
                // Check if Next.js is already running on port 3000
                if (IsPortInUse(3000))
                {
                    var result = MessageBox.Show(
                        "Port 3000 is already in use.\n\n" +
                        "This might mean:\n" +
                        "• Another Next.js server is running\n" +
                        "• Another application is using this port\n\n" +
                        "Use the existing server?",
                        "Port Already in Use",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (result == MessageBoxResult.Yes)
                    {
                        UpdateStatus("Using existing server on port 3000");
                        return; // Use the existing server
                    }
                    else
                    {
                        UpdateStatus("Please stop the other application and try again");
                        Application.Current.Shutdown();
                        return;
                    }
                }

                UpdateStatus("Starting Next.js development server...");

                // Find project root from current executable location
                var executablePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                var binPath = Path.GetDirectoryName(executablePath);
                var projectRoot = Path.GetFullPath(Path.Combine(binPath ?? ".", "..", "..", "..", ".."));

                // Resolve npm path robustly
                string npmCommand = ResolveNpmPath();

                var startInfo = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c \"{npmCommand}\" run dev",
                    WorkingDirectory = projectRoot,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                // Load and inject .env.local variables
                LoadEnvFile(projectRoot, startInfo);

                _nextJsProcess = new Process { StartInfo = startInfo };

                _nextJsProcess.OutputDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        // Look for key indicators that the server is starting
                        if (e.Data.Contains("ready") || e.Data.Contains("started") || e.Data.Contains("listening"))
                        {
                            UpdateStatus($"Next.js: Server starting - {e.Data.Substring(0, Math.Min(100, e.Data.Length))}");
                        }
                        else if (e.Data.Contains("error") || e.Data.Contains("Error") || e.Data.Contains("failed"))
                        {
                            UpdateStatus($"Next.js Warning: {e.Data.Substring(0, Math.Min(100, e.Data.Length))}");
                        }
                    }
                };

                _nextJsProcess.ErrorDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        UpdateStatus($"Next.js Error: {e.Data.Substring(0, Math.Min(100, e.Data.Length))}");
                    }
                };

                _nextJsProcess.Start();
                _nextJsProcess.BeginOutputReadLine();
                _nextJsProcess.BeginErrorReadLine();

                // Give the process a moment to start
                await Task.Delay(1000);
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error starting Next.js: {ex.Message}");
                throw;
            }
        }

        private string ResolveNpmPath()
        {
            // 1. Try system PATH
            if (CanRunCommand("npm --version")) return "npm";

            // 2. Try common installation paths
            string[] commonPaths = {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "npm.cmd"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "npm.cmd"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "nvm", "npm.cmd"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "AppData", "Roaming", "npm", "npm.cmd")
            };

            foreach (var path in commonPaths)
            {
                if (File.Exists(path)) return path;
            }

            // 3. Last resort - check env path again or assume global
            return "npm";
        }

        private bool CanRunCommand(string command)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {command}",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true
                };
                using var proc = Process.Start(psi);
                return proc?.WaitForExit(2000) ?? false;
            }
            catch { return false; }
        }

        private void LoadEnvFile(string projectRoot, ProcessStartInfo startInfo)
        {
            string envPath = Path.Combine(projectRoot, ".env.local");
            if (!File.Exists(envPath)) return;

            try
            {
                var lines = File.ReadAllLines(envPath);
                foreach (var line in lines)
                {
                    var trimmed = line.Trim();
                    if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#")) continue;

                    var parts = trimmed.Split('=', 2);
                    if (parts.Length == 2)
                    {
                        var key = parts[0].Trim();
                        var value = parts[1].Trim();
                        // Support values with or without quotes
                        if (value.StartsWith("\"") && value.EndsWith("\""))
                            value = value.Substring(1, value.Length - 2);

                        startInfo.EnvironmentVariables[key] = value;
                    }
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Warning: Failed to parse .env.local: {ex.Message}");
            }
        }

        private bool IsPortInUse(int port)
        {
            try
            {
                var tcpConnectionInformation = System.Net.NetworkInformation.IPGlobalProperties
                    .GetIPGlobalProperties()
                    .GetActiveTcpConnections();

                foreach (var connection in tcpConnectionInformation)
                {
                    if (connection.LocalEndPoint.Port == port)
                        return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }

        private void ConfigButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var executablePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                var binPath = Path.GetDirectoryName(executablePath);
                var projectRoot = Path.GetFullPath(Path.Combine(binPath ?? ".", "..", "..", "..", ".."));
                var envPath = Path.Combine(projectRoot, ".env.local");

                if (File.Exists(envPath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "notepad.exe",
                        Arguments = envPath,
                        UseShellExecute = true
                    });
                }
                else
                {
                    MessageBox.Show("Config file (.env.local) not found in project root.", "Config Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Could not open config: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            WebView?.CoreWebView2?.Reload();
            UpdateStatus("Refreshing...");
        }

        private async void DevToolsButton_Click(object sender, RoutedEventArgs e)
        {
            WebView?.CoreWebView2?.OpenDevToolsWindow();

            // Also test API connectivity when dev tools are opened
            await TestApiConnectivity();
        }

        private async Task TestApiConnectivity()
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.Timeout = TimeSpan.FromSeconds(3);

                // Test the main API endpoints
                var endpoints = new[] { "/api/enhance-prompt", "/api/ai-chat", "/api/gen-ai-code" };
                var results = new System.Collections.Generic.List<string>();

                foreach (var endpoint in endpoints)
                {
                    try
                    {
                        var response = await client.GetAsync($"{LOCALHOST}{endpoint}");
                        results.Add($"{endpoint}: {(int)response.StatusCode} {response.StatusCode}");
                    }
                    catch (Exception ex)
                    {
                        results.Add($"{endpoint}: Error - {ex.Message}");
                    }
                }

                var resultText = string.Join("\n", results);
                MessageBox.Show($"API Connectivity Test:\n\n{resultText}",
                    "API Status", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to test API connectivity:\n{ex.Message}",
                    "API Test Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private void UpdateStatus(string message)
        {
            Dispatcher.Invoke(() =>
            {
                var upperMessage = message.ToUpper();
                StatusText.Text = upperMessage;
                LoadingText.Text = upperMessage;
            });
        }

        private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            // Clean up Next.js process
            if (_nextJsProcess != null && !_nextJsProcess.HasExited)
            {
                try
                {
                    _nextJsProcess.Kill();
                }
                catch { }
            }
        }
    }
}
