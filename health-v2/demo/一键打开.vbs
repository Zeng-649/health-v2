' =============================================================
' 智骨科技 · 骨科智慧医疗演示网站 —— 一键打开（推荐入口）
' 双击本脚本：后台隐藏窗口启动本地服务，就绪后自动打开默认浏览器
' 失败时给出中文提示与排查建议；只管理自己启动的进程（PID 文件）
' =============================================================
Option Explicit

Dim fso, shell, wmi, dir, url, pidPath, logPath, pid, ready, rtn

url = "http://localhost:5500/"
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
Set wmi = GetObject("winmgmts:\\.\root\cimv2")

' 脚本所在目录（自动正确处理中文与空格路径）
dir = fso.GetParentFolderName(WScript.ScriptFullName)
pidPath = fso.BuildPath(dir, ".health-server.pid")
logPath = fso.BuildPath(dir, "server-run.log")

' ---------- 1. 服务已在运行：直接打开浏览器 ----------
If Probe(url) Then
  shell.Run """" & url & """", 1, False
  WScript.Quit 0
End If

' ---------- 2. 上次启动的服务仍在初始化：等待就绪 ----------
pid = ReadText(pidPath)
If pid <> "" And IsNumeric(pid) Then
  If IsProcessAlive(CLng(pid)) Then
    ready = WaitReady(url, 40)
    If ready Then
      shell.Run """" & url & """", 1, False
      WScript.Quit 0
    End If
    SafeKill pid
    DeleteFile pidPath
    Fail "启动超时", "本地服务在 20 秒内未能就绪，已自动停止刚启动的进程。" & vbCrLf & vbCrLf & _
      "排查建议：" & vbCrLf & _
      "1. 运行 start.bat 查看启动过程中的报错；" & vbCrLf & _
      "2. 确认 5500 端口未被其他程序占用；" & vbCrLf & _
      "3. 详细日志见项目目录下 server-run.log。"
    WScript.Quit 1
  End If
  ' 进程已不存在：清理陈旧记录后继续正常启动
  DeleteFile pidPath
End If

' ---------- 3. 端口被其他程序占用检测 ----------
If PortBusy() Then
  Fail "端口被占用", "端口 5500 已被其他程序占用，演示服务无法启动。" & vbCrLf & vbCrLf & _
    "排查建议：" & vbCrLf & _
    "1. 双击『停止服务.vbs』尝试停止本项目之前启动的服务；" & vbCrLf & _
    "2. 在命令行执行 netstat -ano | findstr :5500 查看占用进程；" & vbCrLf & _
    "3. 在任务管理器中结束对应进程后重试。"
  WScript.Quit 1
End If

' ---------- 4. Java 环境检测 ----------
If shell.Run("cmd.exe /c where java >nul 2>&1", 0, True) <> 0 Then
  Fail "缺少 Java 环境", "未检测到 Java 运行环境，无法启动本地服务。" & vbCrLf & vbCrLf & _
    "排查建议：" & vbCrLf & _
    "1. 安装 JDK 17 或更高版本（如 Azul Zulu、Oracle JDK）；" & vbCrLf & _
    "2. 安装后将 JDK 的 bin 目录加入 PATH 环境变量；" & vbCrLf & _
    "3. 或直接双击 index.html，使用内置知识库离线演示（AI 为离线内容）。"
  WScript.Quit 1
End If

' ---------- 5. 隐藏窗口启动服务（WMI，可拿到 PID） ----------
Dim startup, procClass
Set startup = wmi.Get("Win32_ProcessStartup")
startup.ShowWindow = 0
Set procClass = wmi.Get("Win32_Process")
rtn = procClass.Create("cmd.exe /c java server.java > """ & logPath & """ 2>&1", dir, startup, pid)
If rtn <> 0 Or IsNull(pid) Or pid = 0 Then
  Fail "启动失败", "本地服务进程启动失败（错误码 " & rtn & "）。" & vbCrLf & vbCrLf & _
    "排查建议：运行 start.bat 查看具体报错信息。"
  WScript.Quit 1
End If
WriteText pidPath, CStr(pid)

' ---------- 6. 轮询等待就绪（500 毫秒 × 40 次 = 最长 20 秒） ----------
ready = WaitReady(url, 40)

If ready Then
  shell.Run """" & url & """", 1, False
  WScript.Quit 0
End If

' ---------- 7. 失败处理：只结束自己启动的 PID 并清理记录 ----------
If Not IsProcessAlive(CLng(pid)) Then
  Dim logText, reason
  logText = ReadText(logPath)
  If InStr(logText, "already in use") > 0 Or InStr(logText, "BindException") > 0 Then
    reason = "端口 5500 被其他程序占用。"
  ElseIf InStr(logText, "release version") > 0 Or InStr(logText, "Unsupported") > 0 _
      Or InStr(logText, "out of date") > 0 Or InStr(logText, "error:") > 0 _
      Or InStr(logText, "Could not find or load main class") > 0 Then
    reason = "Java 版本过低或源码报错（需要 JDK 17 及以上）。"
  Else
    reason = "服务进程启动后异常退出。"
  End If
  DeleteFile pidPath
  Fail "启动失败", reason & vbCrLf & vbCrLf & _
    "排查建议：" & vbCrLf & _
    "1. 运行 start.bat 查看详细报错；" & vbCrLf & _
    "2. 确认已安装 JDK 17 及以上版本；" & vbCrLf & _
    "3. 详细日志见项目目录下 server-run.log；" & vbCrLf & _
    "4. 或直接双击 index.html，使用内置知识库离线演示（AI 为离线内容）。"
Else
  SafeKill pid
  DeleteFile pidPath
  Fail "启动超时", "本地服务在 20 秒内未能就绪，已自动停止刚启动的进程。" & vbCrLf & vbCrLf & _
    "排查建议：" & vbCrLf & _
    "1. 运行 start.bat 查看启动过程；" & vbCrLf & _
    "2. 确认 5500 端口未被占用；" & vbCrLf & _
    "3. 详细日志见项目目录下 server-run.log。"
End If
WScript.Quit 1

' ================= 工具函数 =================

Function Probe(u)
  On Error Resume Next
  Dim http
  Set http = CreateObject("MSXML2.ServerXMLHTTP")
  http.setTimeouts 1000, 1000, 1000, 1000
  http.Open "GET", u, False
  http.Send
  If Err.Number <> 0 Then
    Probe = False
  Else
    Probe = (http.Status > 0 And http.Status < 600)
  End If
  On Error GoTo 0
End Function

Function WaitReady(u, times)
  Dim i
  For i = 1 To times
    WScript.Sleep 500
    If Probe(u) Then
      WaitReady = True
      Exit Function
    End If
  Next
  WaitReady = False
End Function

Function IsProcessAlive(p)
  On Error Resume Next
  Dim items
  Set items = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE ProcessId = " & p)
  IsProcessAlive = (items.Count > 0)
  If Err.Number <> 0 Then IsProcessAlive = False
  On Error GoTo 0
End Function

Function PortBusy()
  Dim tmp
  tmp = fso.BuildPath(dir, ".port-check.tmp")
  shell.Run "cmd.exe /c netstat -ano -p tcp | findstr "":5500"" | findstr /i ""LISTENING"" > """ & tmp & """ 2>nul", 0, True
  PortBusy = False
  If fso.FileExists(tmp) Then
    PortBusy = (fso.GetFile(tmp).Size > 0)
    DeleteFile tmp
  End If
End Function

Sub SafeKill(p)
  On Error Resume Next
  shell.Run "cmd.exe /c taskkill /PID " & p & " /F /T >nul 2>&1", 0, True
  On Error GoTo 0
End Sub

Sub Fail(t, m)
  MsgBox m, vbCritical, "智骨科技 · " & t
End Sub

Function ReadText(p)
  On Error Resume Next
  ReadText = ""
  If fso.FileExists(p) Then
    Dim f
    Set f = fso.OpenTextFile(p, 1, False, 0)
    ReadText = Trim(f.ReadAll)
    f.Close
  End If
  If Err.Number <> 0 Then ReadText = ""
  On Error GoTo 0
End Function

Sub WriteText(p, s)
  On Error Resume Next
  Dim f
  Set f = fso.CreateTextFile(p, True, False)
  f.Write s
  f.Close
  On Error GoTo 0
End Sub

Sub DeleteFile(p)
  On Error Resume Next
  If fso.FileExists(p) Then fso.DeleteFile p, True
  On Error GoTo 0
End Sub