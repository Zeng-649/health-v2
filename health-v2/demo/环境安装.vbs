' =============================================================
' 智骨科技 · 骨科智慧医疗演示网站 —— 环境安装（一键）
' 双击本脚本：检测 Java 运行环境；未安装时可自动安装
' Microsoft OpenJDK 17（通过 winget，需联网），并给出后续指引
' =============================================================
Option Explicit

Dim fso, shell, dir, tmp, hasJava, ver, ans, exec, waited, found

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
tmp = fso.BuildPath(dir, ".java-check.tmp")

' ---------- 1. 检测 java ----------
hasJava = False
On Error Resume Next
shell.Run "cmd.exe /c where java > """ & tmp & """ 2>&1", 0, True
If fso.FileExists(tmp) Then
  hasJava = (Len(ReadText(tmp)) > 0)
  fso.DeleteFile tmp, True
End If
On Error GoTo 0

If hasJava Then
  ' ---------- 2. 已安装：读取并显示版本 ----------
  ver = ""
  On Error Resume Next
  shell.Run "cmd.exe /c java -version > """ & tmp & """ 2>&1", 0, True
  If fso.FileExists(tmp) Then
    ver = ReadText(tmp)
    fso.DeleteFile tmp, True
  End If
  On Error GoTo 0
  If InStr(ver, "version ""1.") > 0 And InStr(ver, """17") = 0 And InStr(ver, """1.7") = 0 Then
    ' 简单识别老版本（1.8 等）
    MsgBox "检测到 Java 已安装，但版本可能低于 17：" & vbCrLf & vbCrLf & ver & vbCrLf & vbCrLf & _
      "本项目需要 JDK 17 及以上。请安装新版 JDK 后重试。", vbExclamation, "智骨科技 · 环境检查"
  Else
    MsgBox "Java 运行环境已就绪：" & vbCrLf & vbCrLf & ver & vbCrLf & vbCrLf & _
      "现在可以双击「一键打开.vbs」启动演示网站。", vbInformation, "智骨科技 · 环境检查"
  End If
  WScript.Quit 0
End If

' ---------- 3. 未安装：询问是否自动安装 ----------
ans = MsgBox("未检测到 Java 运行环境（本项目需要 JDK 17 及以上）。" & vbCrLf & vbCrLf & _
  "是否现在自动安装 Microsoft OpenJDK 17？" & vbCrLf & _
  "（通过系统自带的 winget 包管理器，需要联网，约 1~5 分钟）" & vbCrLf & vbCrLf & _
  "选择「否」将打开官方下载页面，可手动下载安装。", _
  vbYesNo + vbQuestion, "智骨科技 · 环境安装")

If ans = vbNo Then
  shell.Run """https://learn.microsoft.com/zh-cn/java/openjdk/download""", 1, False
  MsgBox "已打开 Microsoft OpenJDK 官方下载页。" & vbCrLf & vbCrLf & _
    "手动安装步骤：" & vbCrLf & _
    "1. 下载 Windows x64 的 JDK 17 安装包（MSI）；" & vbCrLf & _
    "2. 双击安装（默认会自动配置 PATH）；" & vbCrLf & _
    "3. 安装完成后重新双击「一键打开.vbs」。", vbInformation, "智骨科技 · 环境安装"
  WScript.Quit 0
End If

' ---------- 4. 检查 winget 是否可用 ----------
On Error Resume Next
shell.Run "cmd.exe /c where winget > """ & tmp & """ 2>&1", 0, True
Dim hasWinget
hasWinget = False
If fso.FileExists(tmp) Then
  hasWinget = (Len(ReadText(tmp)) > 0)
  fso.DeleteFile tmp, True
End If
On Error GoTo 0

If Not hasWinget Then
  shell.Run """https://learn.microsoft.com/zh-cn/java/openjdk/download""", 1, False
  MsgBox "本机没有 winget 包管理器，无法自动安装。" & vbCrLf & vbCrLf & _
    "已打开官方下载页，请手动下载安装 JDK 17（MSI，默认自动配置 PATH），" & vbCrLf & _
    "完成后重新双击「一键打开.vbs」。", vbInformation, "智骨科技 · 环境安装"
  WScript.Quit 1
End If

' ---------- 5. winget 静默安装（最长等待 10 分钟） ----------
Set exec = shell.Exec("cmd.exe /c winget install --id Microsoft.OpenJDK.17 -e --accept-source-agreements --accept-package-agreements --silent")
waited = 0
Do While exec.Status = 0 And waited < 600
  WScript.Sleep 1000
  waited = waited + 1
Loop

' ---------- 6. 安装后验证（当前会话 PATH 可能未刷新，同时探测安装目录） ----------
found = ""
Dim candidates, base, folder, subf
Set candidates = fso.GetFolder("C:\Program Files\Microsoft").SubFolders
For Each subf In candidates
  If InStr(1, subf.Name, "jdk-17", vbTextCompare) > 0 Or InStr(1, subf.Name, "jdk-2", vbTextCompare) > 0 Then
    If fso.FileExists(fso.BuildPath(fso.BuildPath(subf.Path, "bin"), "java.exe")) Then
      found = fso.BuildPath(fso.BuildPath(subf.Path, "bin"), "java.exe")
      Exit For
    End If
  End If
Next
If found = "" Then
  base = "C:\Program Files\Zulu"
  If fso.FolderExists(base) Then
    Set candidates = fso.GetFolder(base).SubFolders
    For Each subf In candidates
      If fso.FileExists(fso.BuildPath(fso.BuildPath(fso.BuildPath(subf.Path, "bin"), "java.exe"))) Then
        found = fso.BuildPath(fso.BuildPath(subf.Path, "bin"), "java.exe")
        Exit For
      End If
    Next
  End If
End If

If found <> "" Then
  MsgBox "Microsoft OpenJDK 安装成功！" & vbCrLf & vbCrLf & _
    "安装位置：" & found & vbCrLf & vbCrLf & _
    "由于系统环境变量尚未刷新，请先注销并重新登录（或重启电脑），" & vbCrLf & _
    "然后双击「一键打开.vbs」即可启动演示网站。", vbInformation, "智骨科技 · 环境安装"
  WScript.Quit 0
Else
  shell.Run """https://learn.microsoft.com/zh-cn/java/openjdk/download""", 1, False
  MsgBox "自动安装未确认成功（可能网络较慢或安装器被拦截）。" & vbCrLf & vbCrLf & _
    "已打开官方下载页，请手动下载安装 JDK 17（MSI），" & vbCrLf & _
    "完成后重新双击「一键打开.vbs」。", vbExclamation, "智骨科技 · 环境安装"
  WScript.Quit 1
End If

' ================= 工具函数 =================

Function ReadText(p)
  On Error Resume Next
  ReadText = ""
  If fso.FileExists(p) Then
    Dim f
    Set f = fso.OpenTextFile(p, 1, False, 0)
    ReadText = f.ReadAll
    f.Close
  End If
  If Err.Number <> 0 Then ReadText = ""
  On Error GoTo 0
End Function