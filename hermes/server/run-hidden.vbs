' Launches run.cmd with no visible console window. Point a Windows Task
' Scheduler task (trigger: At log on) at this file so the Hermes server starts
' automatically and stays available at http://localhost:4317.
Dim oShell, oFSO, dir
Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")
dir = oFSO.GetParentFolderName(WScript.ScriptFullName)
oShell.Run "cmd /c """ & dir & "\run.cmd""", 0, False
