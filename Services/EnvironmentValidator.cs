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
                var result = RunCommand("node", "--version");

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
                var result = RunCommand("npm", "--version");

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

            if (string.IsNullOrEmpty(url))
            {
                return new DiagnosticResult
                {
                    Name = "Convex Configuration",
                    Status = "WARNING",
                    Message = "NEXT_PUBLIC_CONVEX_URL environment variable not set",
                    Severity = DiagnosticSeverity.Warning
                };
            }

            return new DiagnosticResult
            {
                Name = "Convex Configuration",
                Status = "OK",
                Message = $"Convex URL is configured",
                Severity = DiagnosticSeverity.Info
            };
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
