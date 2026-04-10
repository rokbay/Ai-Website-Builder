using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace AiWebsiteBuilder.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private string? _apiKey;

        public GeminiService()
        {
            _httpClient = new HttpClient();
            _apiKey = ResolveApiKey();
        }

        public void Initialize(string apiKey)
        {
            _apiKey = apiKey;
        }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

        private static string? ResolveApiKey()
        {
            var apiKey = Environment.GetEnvironmentVariable("NEXT_PUBLIC_GEMINI_API_KEY");
            if (!string.IsNullOrWhiteSpace(apiKey)) return apiKey.Trim();

            var envFile = FindEnvFile();
            if (envFile == null) return null;

            foreach (var line in File.ReadAllLines(envFile))
            {
                if (line.StartsWith("NEXT_PUBLIC_GEMINI_API_KEY=", StringComparison.OrdinalIgnoreCase))
                {
                    return line.Substring("NEXT_PUBLIC_GEMINI_API_KEY=".Length).Trim();
                }
            }

            return null;
        }

        private static string? FindEnvFile()
        {
            var dir = Directory.GetCurrentDirectory();
            for (var i = 0; i < 6; i++)
            {
                var candidate = Path.Combine(dir, ".env.local");
                if (File.Exists(candidate)) return candidate;
                dir = Directory.GetParent(dir)?.FullName ?? string.Empty;
                if (string.IsNullOrWhiteSpace(dir)) break;
            }
            return null;
        }

        public async Task StreamCodeAsync(string prompt, string model, double temperature, int maxOutputTokens, double topP, int topK, Func<string, Task> onChunk, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                throw new InvalidOperationException("Gemini API key not configured. Set NEXT_PUBLIC_GEMINI_API_KEY in environment or .env.local.");
            }

            var requestUrl = $"https://generativelanguage.googleapis.com/v1beta2/models/{Uri.EscapeDataString(model)}:chat";

            var requestBody = new
            {
                temperature,
                topP,
                topK,
                maxOutputTokens,
                candidateCount = 1,
                messages = new[]
                {
                    new
                    {
                        author = "user",
                        content = new[]
                        {
                            new { type = "text", text = prompt }
                        }
                    }
                },
                // Attempt streaming response if supported by Gemini
                responseType = "STREAMING"
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new StreamReader(stream, Encoding.UTF8);

            while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
            {
                var rawLine = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(rawLine)) continue;

                var line = rawLine.Trim();
                if (line.StartsWith("data: ", StringComparison.OrdinalIgnoreCase))
                {
                    line = line.Substring("data: ".Length);
                }

                if (string.Equals(line, "[DONE]", StringComparison.OrdinalIgnoreCase))
                {
                    break;
                }

                try
                {
                    using var document = JsonDocument.Parse(line);
                    var chunk = ExtractTextChunk(document.RootElement);
                    if (!string.IsNullOrEmpty(chunk))
                    {
                        await onChunk(chunk);
                    }
                }
                catch
                {
                    // If the line is not JSON, stream it directly.
                    await onChunk(line + Environment.NewLine);
                }
            }
        }

        private static string ExtractTextChunk(JsonElement element)
        {
            if (element.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
            {
                var candidate = candidates[0];
                if (candidate.TryGetProperty("content", out var content))
                {
                    return ExtractTextChunk(content);
                }
            }

            if (element.TryGetProperty("delta", out var delta) && delta.ValueKind == JsonValueKind.Object)
            {
                if (delta.TryGetProperty("content", out var content))
                {
                    return ExtractTextChunk(content);
                }
            }

            if (element.TryGetProperty("text", out var textElement) && textElement.ValueKind == JsonValueKind.String)
            {
                return textElement.GetString() ?? string.Empty;
            }

            if (element.TryGetProperty("content", out var contentElement))
            {
                if (contentElement.ValueKind == JsonValueKind.Array)
                {
                    var sb = new StringBuilder();
                    foreach (var item in contentElement.EnumerateArray())
                    {
                        sb.Append(ExtractTextChunk(item));
                    }
                    return sb.ToString();
                }
                if (contentElement.ValueKind == JsonValueKind.Object)
                {
                    return ExtractTextChunk(contentElement);
                }
            }

            return string.Empty;
        }
    }
}
