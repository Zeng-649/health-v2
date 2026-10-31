import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * 智骨科技 · 骨科智慧医疗演示网站本地服务
 *
 * 功能：
 *  1. 静态资源服务（MIME 正确、防路径穿越、404/500 友好返回）
 *  2. /api/chat 反向代理（转发 DeepSeek、透传状态码与响应体、CORS）
 *
 * 启动：JDK 17 及以上，直接运行  java server.java
 */
public class server {

    static final int PORT = 5500;
    static final String DS_API_URL = "https://api.deepseek.com/chat/completions";
    /** DeepSeek 密钥（与 js/config.js 保持一致，仅限本地演示使用） */
    static final String DS_API_KEY = "sk-c01c82881ab2402ca3f5253397ee9457";
    static final int CONNECT_TIMEOUT_MS = 15_000;
    static final int READ_TIMEOUT_MS = 90_000;
    static final Path ROOT = Paths.get(".").toAbsolutePath().normalize();

    static final Map<String, String> MIME = Map.ofEntries(
            Map.entry("html", "text/html; charset=utf-8"),
            Map.entry("htm", "text/html; charset=utf-8"),
            Map.entry("css", "text/css; charset=utf-8"),
            Map.entry("js", "application/javascript; charset=utf-8"),
            Map.entry("mjs", "application/javascript; charset=utf-8"),
            Map.entry("json", "application/json; charset=utf-8"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("gif", "image/gif"),
            Map.entry("svg", "image/svg+xml"),
            Map.entry("ico", "image/x-icon"),
            Map.entry("txt", "text/plain; charset=utf-8"),
            Map.entry("pdf", "application/pdf"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    );

    public static void main(String[] args) throws IOException {
        HttpServer http = HttpServer.create(new InetSocketAddress(PORT), 0);
        http.createContext("/api/chat", server::handleApiChat);
        http.createContext("/", server::handleStatic);
        http.setExecutor(Executors.newFixedThreadPool(8));
        http.start();
        System.out.println("==============================================");
        System.out.println("  智骨科技 · 骨科智慧医疗演示服务已启动");
        System.out.println("  请用浏览器访问  http://localhost:" + PORT);
        System.out.println("  停止服务：Ctrl + C");
        System.out.println("==============================================");
    }

    // ---------------- 静态资源 ----------------
    private static void handleStatic(HttpExchange ex) throws IOException {
        try {
            if (!"GET".equalsIgnoreCase(ex.getRequestMethod()) && !"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
                sendSimple(ex, 405, "该方法不被支持，请使用浏览器访问。");
                return;
            }
            String raw = ex.getRequestURI().getPath();
            if (raw.contains("..") || raw.contains("\\")) {
                sendSimple(ex, 403, "禁止访问该路径。");
                return;
            }
            if (raw.equals("/") || raw.isEmpty()) raw = "/index.html";

            Path target = ROOT.resolve(raw.substring(1)).normalize();
            if (!target.startsWith(ROOT)) {
                sendSimple(ex, 403, "禁止访问该路径。");
                return;
            }
            if (Files.isDirectory(target)) {
                target = target.resolve("index.html");
            }
            if (!Files.isRegularFile(target)) {
                sendSimple(ex, 404, "未找到资源：" + escapeHtml(raw) + "，请确认文件是否在演示目录中。");
                return;
            }
            String name = target.getFileName().toString();
            int dot = name.lastIndexOf('.');
            String type = dot >= 0 ? MIME.getOrDefault(name.substring(dot + 1).toLowerCase(), "application/octet-stream")
                    : "application/octet-stream";
            byte[] body = Files.readAllBytes(target);
            ex.getResponseHeaders().set("Content-Type", type);
            ex.getResponseHeaders().set("Cache-Control", "no-cache");
            ex.sendResponseHeaders(200, body.length);
            if (!"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
                try (OutputStream os = ex.getResponseBody()) {
                    os.write(body);
                }
            } else {
                ex.close();
            }
        } catch (Exception e) {
            try {
                sendSimple(ex, 500, "服务器内部错误：" + escapeHtml(String.valueOf(e.getMessage())));
            } catch (Exception ignored) {
                ex.close();
            }
        }
    }

    // ---------------- /api/chat 反向代理 ----------------
    private static void handleApiChat(HttpExchange ex) throws IOException {
        cors(ex);
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1);
            ex.close();
            return;
        }
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            sendJson(ex, 405, "{\"error\":{\"message\":\"/api/chat 仅支持 POST\"}}");
            return;
        }
        byte[] body;
        try (InputStream is = ex.getRequestBody()) {
            body = is.readAllBytes();
        }
        try {
            URL url = new URL(DS_API_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + DS_API_KEY);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body);
            }
            int status = conn.getResponseCode();
            InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            byte[] resp = stream != null ? stream.readAllBytes() : new byte[0];
            ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            ex.sendResponseHeaders(status, resp.length == 0 ? -1 : resp.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(resp);
            }
        } catch (Exception e) {
            sendJson(ex, 502, "{\"error\":{\"message\":\"代理请求 DeepSeek 失败："
                    + escapeJson(String.valueOf(e.getMessage())) + "\"}}");
        }
    }

    // ---------------- 工具 ----------------
    private static void cors(HttpExchange ex) {
        var h = ex.getResponseHeaders();
        h.set("Access-Control-Allow-Origin", "*");
        h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendSimple(HttpExchange ex, int code, String msg) throws IOException {
        byte[] body = ("<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"UTF-8\">"
                + "<title>智骨科技演示服务</title><style>body{font-family:'Microsoft YaHei',sans-serif;"
                + "background:#F4F7F5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}"
                + ".box{background:#fff;border-radius:12px;padding:40px 60px;box-shadow:0 2px 12px rgba(16,66,23,.12);"
                + "color:#263238;text-align:center}h1{color:#1B5E20;margin-bottom:10px}a{color:#2E7D32}</style></head>"
                + "<body><div class=\"box\"><h1>" + code + "</h1><p>" + msg + "</p>"
                + "<p><a href=\"/\">返回首页</a></p></div></body></html>").getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        ex.sendResponseHeaders(code, body.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(body);
        }
    }

    private static void sendJson(HttpExchange ex, int code, String json) throws IOException {
        byte[] body = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(code, body.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(body);
        }
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }
}