using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;

namespace AiWebsiteBuilder.Services
{
    /// <summary>
    /// WebMessage Bridge for bidirectional .NET ↔ Browser communication
    /// Similar to Blazor's JavaScript interop but using PostMessage
    /// </summary>
    public class WebMessageBridge
    {
        private readonly CoreWebView2 _webView;
        private int _messageId = 0;
        private Dictionary<int, TaskCompletionSource<JsonElement>> _pendingRequests = new();
        private Dictionary<string, Func<JsonElement, Task<object>>> _handlers = new();

        public WebMessageBridge(CoreWebView2 webView)
        {
            _webView = webView;
            _webView.WebMessageReceived += OnWebMessageReceived;
        }

        /// <summary>
        /// Send a request to the browser and wait for response
        /// </summary>
        public async Task<T> RequestAsync<T>(string method, object data = null)
        {
            var id = ++_messageId;
            var tcs = new TaskCompletionSource<JsonElement>();

            _pendingRequests[id] = tcs;

            try
            {
                var message = new
                {
                    type = "request",
                    id,
                    method,
                    data,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                var json = JsonSerializer.Serialize(message);
                await _webView.ExecuteScriptAsync($"window.postMessage({json}, '*');");

                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(30));
                var completedTask = await Task.WhenAny(tcs.Task, timeoutTask);

                if (completedTask == timeoutTask)
                {
                    throw new TimeoutException($"Browser request timeout: {method}");
                }

                var result = await tcs.Task;
                return JsonSerializer.Deserialize<T>(result.GetRawText());
            }
            finally
            {
                _pendingRequests.Remove(id);
            }
        }

        /// <summary>
        /// Broadcast a notification to the browser
        /// </summary>
        public async Task NotifyAsync(string eventType, object data = null)
        {
            try
            {
                var message = new
                {
                    type = "notification",
                    eventType,
                    data,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                var json = JsonSerializer.Serialize(message);
                await _webView.ExecuteScriptAsync($"window.postMessage({json}, '*');");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to send notification: {ex.Message}");
            }
        }

        /// <summary>
        /// Register a handler for browser requests
        /// </summary>
        public void OnRequest<T>(string method, Func<T, Task<object>> handler)
        {
            _handlers[method] = async (data) =>
            {
                try
                {
                    var deserialized = JsonSerializer.Deserialize<T>(data.GetRawText());
                    return await handler(deserialized);
                }
                catch (Exception ex)
                {
                    throw new Exception($"Handler error for {method}: {ex.Message}");
                }
            };
        }

        /// <summary>
        /// Handle incoming WebMessages
        /// </summary>
        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                using var doc = JsonDocument.Parse(e.WebMessageAsJson);
                var root = doc.RootElement;

                var type = root.GetProperty("type").GetString();

                if (type == "response")
                {
                    HandleResponse(root);
                }
                else if (type == "request")
                {
                    _ = HandleRequest(root);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error processing WebMessage: {ex}");
            }
        }

        /// <summary>
        /// Handle response to our request
        /// </summary>
        private void HandleResponse(JsonElement message)
        {
            var id = message.GetProperty("id").GetInt32();

            if (_pendingRequests.TryGetValue(id, out var tcs))
            {
                if (message.TryGetProperty("error", out var errorProp))
                {
                    var errorMsg = errorProp.GetString();
                    if (errorMsg != null)
                    {
                        tcs.TrySetException(new Exception(errorMsg));
                    }
                    else
                    {
                        tcs.TrySetResult(new JsonElement());
                    }
                }
                else if (message.TryGetProperty("data", out var data))
                {
                    tcs.TrySetResult(data);
                }
                else
                {
                    tcs.TrySetResult(new JsonElement());
                }
            }
        }

        /// <summary>
        /// Handle incoming request from browser
        /// </summary>
        private async Task HandleRequest(JsonElement message)
        {
            try
            {
                var id = message.GetProperty("id").GetInt32();
                var method = message.GetProperty("method").GetString();
                var data = message.TryGetProperty("data", out var d) ? d : new JsonElement();

                if (!_handlers.TryGetValue(method, out var handler))
                {
                    await SendResponse(id, null, $"No handler for method: {method}");
                    return;
                }

                var result = await handler(data);
                await SendResponse(id, result);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error handling request: {ex.Message}");
            }
        }

        /// <summary>
        /// Send response to browser request
        /// </summary>
        private async Task SendResponse(int id, object? data, string? error = null)
        {
            try
            {
                var response = new
                {
                    type = "response",
                    id,
                    data,
                    error,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                var json = JsonSerializer.Serialize(response);
                await _webView.ExecuteScriptAsync($"window.postMessage({json}, '*');");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to send response: {ex.Message}");
            }
        }

        /// <summary>
        /// Get diagnostics
        /// </summary>
        public object GetDiagnostics()
        {
            return new
            {
                pendingRequests = _pendingRequests.Count,
                handlers = _handlers.Keys,
                messagesSent = _messageId
            };
        }
    }

    /// <summary>
    /// WebMessage data structures
    /// </summary>
    public class WebMessage
    {
        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("method")]
        public string Method { get; set; }

        [JsonPropertyName("eventType")]
        public string EventType { get; set; }

        [JsonPropertyName("data")]
        public JsonElement Data { get; set; }

        [JsonPropertyName("timestamp")]
        public long Timestamp { get; set; }
    }
}
