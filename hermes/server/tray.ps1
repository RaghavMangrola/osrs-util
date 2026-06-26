# Hermes system-tray icon (Windows).
#
# Shows a notification-area icon and translates clicks into one-word actions
# written to stdout (`open`, `restart`, `quit`), one per line. The Node parent
# (tray.js) reads those lines and does the actual work. This script owns ONLY
# the icon UI — no server logic lives here.
#
#   left-click   -> open  (go straight to the site)
#   right-click  -> context menu: Open Hermes / Restart server / Quit
#
# Must run STA (WinForms requirement); tray.js launches it with -STA.

param(
    [string]$IconPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Emit one action line and flush so the Node parent sees it immediately
# (stdout is block-buffered when piped).
function Send-Action([string]$action) {
    [Console]::Out.WriteLine($action)
    [Console]::Out.Flush()
}

$icon = if ($IconPath -and (Test-Path $IconPath)) {
    New-Object System.Drawing.Icon $IconPath
} else {
    [System.Drawing.SystemIcons]::Application
}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = $icon
$notify.Text = 'Hermes'
$notify.Visible = $true

# Right-click menu. (NotifyIcon shows a ContextMenuStrip on right-click only,
# so left-click stays free for the "open" shortcut below.)
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$itemOpen = $menu.Items.Add('Open Hermes')
$itemRestart = $menu.Items.Add('Restart server')
$itemQuit = $menu.Items.Add('Quit')
$notify.ContextMenuStrip = $menu

$itemOpen.add_Click({ Send-Action 'open' })
$itemRestart.add_Click({ Send-Action 'restart' })
$itemQuit.add_Click({
    Send-Action 'quit'
    $notify.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})

# Left-click opens the site directly. Right-clicks are handled by the menu, so
# ignore every button except the left one here.
$notify.add_MouseClick({
    param($eventSender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        Send-Action 'open'
    }
})

# Run the WinForms message loop until Application.Exit() (Quit). If the Node
# parent is killed, this process is terminated with it.
try {
    [System.Windows.Forms.Application]::Run()
} finally {
    $notify.Visible = $false
    $notify.Dispose()
}
