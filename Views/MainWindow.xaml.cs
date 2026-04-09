using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace AiWebsiteBuilder.Views
{
    public partial class MainWindow : Window
    {
        private Process? _nextJsProcess;
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
            UpdateStatus("Initializing WebView2...");
            await InitializeWebView();
        }

        private async Task InitializeWebView()
        {
            try
            {
                // Initialize WebView2
                var userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "AiWebsiteBuilder");

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await WebView.EnsureCoreWebView2Async(env);

                UpdateStatus("Launching Next.js server...");
                await StartNextJsServer();

                UpdateStatus("Waiting for server to be ready...");
                await WaitForServerReady();

                UpdateStatus("Loading application...");
                WebView.CoreWebView2.Navigate(LOCALHOST);

                // Hide loading overlay when ready
                WebView.NavigationCompleted += (s, e) =>
                {
                    if (e.IsSuccess)
                    {
                        LoadingOverlay.Visibility = Visibility.Collapsed;
                        UpdateStatus("Ready - Connected to localhost:3000");
                    }
                    else
                    {
                        UpdateStatus($"Navigation failed: {e.WebErrorStatus}");
                        MessageBox.Show($"Failed to load application:\n{e.WebErrorStatus}",
                            "Connection Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                };

                // Handle navigation errors
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

        private async Task WaitForServerReady()
        {
            const int MAX_RETRIES = 30; // 30 seconds max wait
            const int RETRY_DELAY = 1000; // 1 second between checks

            using var client = new System.Net.Http.HttpClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++)
            {
                try
                {
                    UpdateStatus($"Checking server readiness... (attempt {attempt}/{MAX_RETRIES})");

                    // Try to connect to the main page
                    var response = await client.GetAsync(LOCALHOST);
                    if (response.IsSuccessStatusCode)
                    {
                        UpdateStatus("Server is responding - testing API endpoints...");

                        // Test a key API endpoint to ensure it's working
                        try
                        {
                            var apiTest = await client.GetAsync($"{LOCALHOST}/api/enhance-prompt");
                            // Even if API returns 405 (Method Not Allowed), it means the server is routing correctly
                            if (apiTest.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed ||
                                apiTest.StatusCode == System.Net.HttpStatusCode.OK)
                            {
                                UpdateStatus("API endpoints are accessible");
                                return; // Server is ready!
                            }
                        }
                        catch
                        {
                            // API test failed, but main page works - might be expected for POST-only endpoints
                            UpdateStatus("Server ready (API endpoints may require POST requests)");
                            return;
                        }
                    }
                }
                catch (System.Net.Http.HttpRequestException)
                {
                    // Connection failed, server not ready yet
                    if (attempt < MAX_RETRIES)
                    {
                        await Task.Delay(RETRY_DELAY);
                        continue;
                    }
                    else
                    {
                        throw new Exception($"Server failed to start after {MAX_RETRIES} attempts. Check that Node.js and npm are installed.");
                    }
                }
                catch (Exception ex)
                {
                    throw new Exception($"Unexpected error while waiting for server: {ex.Message}");
                }
            }
        }

        private async Task StartNextJsServer()
        {
            try
            {
                // Check if Next.js is already running on port 3000
                if (!IsPortInUse(3000))
                {
                    UpdateStatus("Starting Next.js development server...");

                    // Find project root from current executable location
                    var executablePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                    var binPath = Path.GetDirectoryName(executablePath);
                    var projectRoot = Path.GetFullPath(Path.Combine(binPath ?? ".", "..", "..", "..", ".."));

                    _nextJsProcess = new Process
                    {
                        StartInfo = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c npm run dev",
                            WorkingDirectory = projectRoot,
                            UseShellExecute = false,
                            RedirectStandardOutput = true,
                            RedirectStandardError = true,
                            CreateNoWindow = true
                        }
                    };

                    _nextJsProcess.OutputDataReceived += (s, e) =>
                    {
                        if (!string.IsNullOrEmpty(e.Data))
                        {
                            // Look for key indicators that the server is starting
                            if (e.Data.Contains("ready") || e.Data.Contains("started") || e.Data.Contains("listening"))
                            {
                                UpdateStatus($"Next.js: Server starting - {e.Data}");
                            }
                            else if (e.Data.Contains("error") || e.Data.Contains("Error") || e.Data.Contains("failed"))
                            {
                                UpdateStatus($"Next.js Warning: {e.Data}");
                            }
                            else
                            {
                                UpdateStatus($"Next.js: {e.Data}");
                            }
                        }
                    };

                    _nextJsProcess.ErrorDataReceived += (s, e) =>
                    {
                        if (!string.IsNullOrEmpty(e.Data))
                        {
                            UpdateStatus($"Next.js Error: {e.Data}");
                        }
                    };

                    _nextJsProcess.Start();
                    _nextJsProcess.BeginOutputReadLine();
                    _nextJsProcess.BeginErrorReadLine();

                    // Give the process a moment to start
                    await Task.Delay(1000);
                }
                else
                {
                    UpdateStatus("Next.js server already running on port 3000");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error starting Next.js: {ex.Message}");
                throw;
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
                StatusText.Text = message;
                LoadingText.Text = message;
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
