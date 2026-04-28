Dim oShell, oFSO, dir
Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")
dir = oFSO.GetParentFolderName(WScript.ScriptFullName)
oShell.Run "cmd /c """ & dir & "\run.cmd""", 0, False
