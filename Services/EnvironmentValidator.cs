using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;

namespace AiWebsiteBuilder.Services
{
    /// <summary>
    /// Diagnostics and environment validation service
    /// </summary>
    public static class EnvironmentValidator
    {
        /// <summary>
        /// Run all startup diagnostics
        /// </summary>
        public static Dictionary<string, DiagnosticResult> RunAllDiagnostics()
        {
            var results = new Dictionary<string, DiagnosticResult>();

            results["webview2"] = CheckWebView2();
            results["nodejs"] = CheckNodeJS();
            results["npm"] = CheckNPM();
            results["convex"] = CheckConvexConfig();
            results["port_3000"] = CheckPort3000();

            return results;
        }

        /// <summary>
        /// Check if WebView2 runtime is available
        /// </summary>
        private static DiagnosticResult CheckWebView2()
        {
            try
            {
                var userPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    @"Microsoft\Edge\User Data");

                var isInstalled = Directory.Exists(userPath);

                return new DiagnosticResult
                {
                    Name = "WebView2 Runtime",
                    Status = isInstalled ? "OK" : "NOT_FOUND",
                    Message = isInstalled
                        ? "WebView2 runtime is installed"
                        : "WebView2 runtime not found. Install from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/",
                    Severity = isInstalled ? DiagnosticSeverity.Info : DiagnosticSeverity.Error
                };
            }
            catch (Exception ex)
            {
                return new DiagnosticResult
                {
                    Name = "WebView2 Runtime",
                    Status = "ERROR",
                    Message = $"Failed to check WebView2: {ex.Message}",
                    Severity = DiagnosticSeverity.Error
                };
            }
        }

        /// <summary>
        /// Check if Node.js is installed and in PATH
        /// </summary>
        private static DiagnosticResult CheckNodeJS()
        {
            try
            {
                string command = "node";
                string[] commonPaths = {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "node.exe")
                };

                foreach (var path in commonPaths)
                {
                    if (File.Exists(path)) { command = path; break; }
                }

                var result = RunCommand(command, "--version");

                if (result.Success)
                {
                    return new DiagnosticResult
                    {
                        Name = "Node.js",
                        Status = "OK",
                        Message = $"Node.js is installed: {result.Output.Trim()}",
                        Severity = DiagnosticSeverity.Info
                    };
                }
                else
                {
                    return new DiagnosticResult
                    {
                        Name = "Node.js",
                        Status = "NOT_FOUND",
                        Message = "Node.js not found in PATH. Install from: https://nodejs.org/",
                        Severity = DiagnosticSeverity.Error
                    };
                }
            }
            catch (Exception ex)
            {
                return new DiagnosticResult
                {
                    Name = "Node.js",
                    Status = "ERROR",
                    Message = ex.Message,
                    Severity = DiagnosticSeverity.Error
                };
            }
        }

        /// <summary>
        /// Check if npm is installed
        /// </summary>
        private static DiagnosticResult CheckNPM()
        {
            try
            {
                string command = "npm";
                string[] commonPaths = {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "npm.cmd"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "npm.cmd"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "nvm", "npm.cmd"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "AppData", "Roaming", "npm", "npm.cmd")
                };

                foreach (var path in commonPaths)
                {
                    if (File.Exists(path)) { command = path; break; }
                }

                var result = RunCommand(command, "--version");

                if (result.Success)
                {
                    return new DiagnosticResult
                    {
                        Name = "npm",
                        Status = "OK",
                        Message = $"npm is installed: {result.Output.Trim()}",
                        Severity = DiagnosticSeverity.Info
                    };
                }
                else
                {
                    return new DiagnosticResult
                    {
                        Name = "npm",
                        Status = "NOT_FOUND",
                        Message = "npm not found in PATH",
                        Severity = DiagnosticSeverity.Error
                    };
                }
            }
            catch (Exception ex)
            {
                return new DiagnosticResult
                {
                    Name = "npm",
                    Status = "ERROR",
                    Message = ex.Message,
                    Severity = DiagnosticSeverity.Error
                };
            }
        }

        /// <summary>
        /// Check Convex configuration
        /// </summary>
        private static DiagnosticResult CheckConvexConfig()
        {
            var url = Environment.GetEnvironmentVariable("NEXT_PUBLIC_CONVEX_URL");

            // Also check .env.local as a fallback
            if (string.IsNullOrEmpty(url))
            {
                try
                {
                    var projectRoot = LocateProjectRoot();
                    var envPath = Path.Combine(projectRoot, ".env.local");

                    if (File.Exists(envPath))
                    {
                        var lines = File.ReadAllLines(envPath);
                        foreach (var line in lines)
                        {
                            if (line.Contains("NEXT_PUBLIC_CONVEX_URL="))
                            {
                                url = line.Split('=', 2)[1].Trim();
                                break;
                            }
                        }
                    }
                }
                catch { }
            }

            if (string.IsNullOrEmpty(url) || url.Contains("your_convex_deployment_url"))
            {
                return new DiagnosticResult
                {
                    Name = "Convex Configuration",
                    Status = "ERROR",
                    Message = "NEXT_PUBLIC_CONVEX_URL not set or contains placeholder. Edit .env.local",
                    Severity = DiagnosticSeverity.Error
                };
            }

            return new DiagnosticResult
            {
                Name = "Convex Configuration",
                Status = "OK",
                Message = $"Convex URL: {url.Substring(0, Math.Min(20, url.Length))}...",
                Severity = DiagnosticSeverity.Info
            };
        }

        /// <summary>
        /// Find the repository root by walking up from the executable path
        /// </summary>
        private static string LocateProjectRoot()
        {
            var executablePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            var current = Path.GetDirectoryName(executablePath) ?? AppContext.BaseDirectory;
            current = Path.GetFullPath(current);

            for (int i = 0; i < 6; i++)
            {
                var envPath = Path.Combine(current, ".env.local");
                var csprojFiles = Directory.GetFiles(current, "*.csproj");
                if (File.Exists(envPath) || csprojFiles.Length > 0)
                {
                    return current;
                }

                var parent = Path.GetDirectoryName(current);
                if (string.IsNullOrEmpty(parent) || parent == current)
                {
                    break;
                }
                current = parent;
            }

            return AppContext.BaseDirectory;
        }

        /// <summary>
        /// Check if port 3000 is available
        /// </summary>
        private static DiagnosticResult CheckPort3000()
        {
            try
            {
                var connections = System.Net.NetworkInformation.IPGlobalProperties
                    .GetIPGlobalProperties()
                    .GetActiveTcpConnections();

                var portInUse = connections.Any(c => c.LocalEndPoint.Port == 3000);

                return new DiagnosticResult
                {
                    Name = "Port 3000",
                    Status = portInUse ? "IN_USE" : "AVAILABLE",
                    Message = portInUse
                        ? "Port 3000 is already in use. An application might be running on this port."
                        : "Port 3000 is available",
                    Severity = portInUse ? DiagnosticSeverity.Warning : DiagnosticSeverity.Info
                };
            }
            catch (Exception ex)
            {
                return new DiagnosticResult
                {
                    Name = "Port 3000",
                    Status = "ERROR",
                    Message = $"Failed to check port: {ex.Message}",
                    Severity = DiagnosticSeverity.Error
                };
            }
        }

        /// <summary>
        /// Run a command and capture output
        /// </summary>
        private static CommandResult RunCommand(string command, string arguments)
        {
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = command,
                    Arguments = arguments,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                using (var process = System.Diagnostics.Process.Start(psi))
                {
                    process?.WaitForExit(5000);

                    if (process?.ExitCode == 0)
                    {
                        var output = process.StandardOutput.ReadToEnd();
                        return new CommandResult { Success = true, Output = output };
                    }
                    else
                    {
                        var error = process?.StandardError.ReadToEnd() ?? "Unknown error";
                        return new CommandResult { Success = false, Output = error };
                    }
                }
            }
            catch (Exception ex)
            {
                return new CommandResult { Success = false, Output = ex.Message };
            }
        }
    }

    /// <summary>
    /// Diagnostic result data structure
    /// </summary>
    public class DiagnosticResult
    {
        public string Name { get; set; }
        public string Status { get; set; }
        public string Message { get; set; }
        public DiagnosticSeverity Severity { get; set; }
    }

    /// <summary>
    /// Diagnostic severity levels
    /// </summary>
    public enum DiagnosticSeverity
    {
        Info,
        Warning,
        Error
    }

    /// <summary>
    /// Command execution result
    /// </summary>
    internal class CommandResult
    {
        public bool Success { get; set; }
        public string Output { get; set; }
    }
}
