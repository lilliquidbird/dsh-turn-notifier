param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Body,
    [switch]$Force
)

# Show a Windows toast that works even when the DSH window is in the background.
# Exits quietly when DSH is already the foreground app: the in-app card covers that case.

$ErrorActionPreference = 'SilentlyContinue'

if (-not $Force) {
    try {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class TnForeground {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
"@
        $handle = [TnForeground]::GetForegroundWindow()
        $ownerPid = 0
        [void][TnForeground]::GetWindowThreadProcessId($handle, [ref]$ownerPid)
        $foreground = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if ($foreground -and $foreground.ProcessName -eq 'DeepSeek Harness') { exit 0 }
    } catch {
        # If the check fails, fall through and show the toast.
    }
}

# Register our own app id so Windows shows a readable name in the notification.
$appKey = 'HKCU:\Software\Classes\AppUserModelId\DeepSeek.DSH.Notifier'
if (-not (Test-Path $appKey)) {
    New-Item -Path $appKey -Force | Out-Null
    Set-ItemProperty -Path $appKey -Name DisplayName -Value 'DeepSeek Harness'
}

try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(
        [Windows.UI.Notifications.ToastTemplateType]::ToastText02
    )
    $texts = $template.GetElementsByTagName('text')
    $texts.Item(0).AppendChild($template.CreateTextNode($Title)) | Out-Null
    $texts.Item(1).AppendChild($template.CreateTextNode($Body)) | Out-Null

    # Silent: the page already plays the user's chosen chime.
    $audio = $template.CreateElement('audio')
    $audio.SetAttribute('silent', 'true')
    $template.DocumentElement.AppendChild($audio) | Out-Null

    $toast = New-Object Windows.UI.Notifications.ToastNotification $template

    # Prefer the host app's own identity, then our registered id, then PowerShell's.
    $appIds = @('electron.app.DeepSeek Harness', 'DeepSeek.DSH.Notifier', 'PowerShell')
    $shown = $false
    foreach ($appId in $appIds) {
        try {
            $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
            $notifier.Show($toast)
            $shown = $true
            break
        } catch {
            continue
        }
    }
    if ($shown) { exit 0 }
    exit 2
} catch {
    exit 1
}
