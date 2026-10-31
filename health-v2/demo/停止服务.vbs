' =============================================================
' 智骨科技 · 骨科智慧医疗演示网站 —— 停止服务
' 只停止本项目通过『一键打开.vbs』启动的进程（按 PID + /T 进程树）
' 不会结束其他任何 java.exe 进程
' =============================================================
Option Explicit

Dim fso, shell, dir, pidPath, pid, rtn

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

dir = fso.GetParentFolderName(WScript.ScriptFullName)
pidPath = fso.BuildPath(dir, ".health-server.pid")

If Not fso.FileExists(pidPath) Then
  MsgBox "未找到服务进程记录（.health-server.pid），服务可能未在运行。" & vbCrLf & vbCrLf & _
    "如仍需停止，请打开任务管理器，手动结束本项目对应的 Java 进程。", _
    vbInformation, "智骨科技 · 停止服务"
  WScript.Quit 0
End If

pid = Trim(ReadText(pidPath))

If pid = "" Or Not IsNumeric(pid) Then
  DeleteFile pidPath
  MsgBox "进程记录无效，已清理。服务可能未在运行。", vbInformation, "智骨科技 · 停止服务"
  WScript.Quit 0
End If

' 只按 PID 结束自己启动的进程树（cmd + java），绝不使用 taskkill /IM java.exe
rtn = shell.Run("cmd.exe /c taskkill /PID " & pid & " /F /T >nul 2>&1", 0, True)
DeleteFile pidPath

If rtn = 0 Then
  MsgBox "演示服务已停止，端口 5500 已释放。", vbInformation, "智骨科技 · 停止服务"
Else
  MsgBox "服务进程（PID " & pid & "）已不在运行，已清理进程记录。", vbInformation, "智骨科技 · 停止服务"
End If
WScript.Quit 0

' ================= 工具函数 =================

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

Sub DeleteFile(p)
  On Error Resume Next
  If fso.FileExists(p) Then fso.DeleteFile p, True
  On Error GoTo 0
End Sub