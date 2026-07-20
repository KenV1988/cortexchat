' Launches the cortexchat server with no visible console window.
' Used by the "cortexchat" scheduled task created by enable-autostart.bat.
Set sh = CreateObject("WScript.Shell")
appdata = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%")
sh.Run """" & appdata & "\cortexchat\start-cortexchat.bat"" nobrowser", 0, False
