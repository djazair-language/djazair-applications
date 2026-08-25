Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Cam {
    [DllImport("avicap32.dll")]
    public static extern IntPtr capCreateCaptureWindowA(string lpszWindowName, int dwStyle, int X, int Y, int nWidth, int nHeight, IntPtr hwndParent, int nID);
    [DllImport("user32", EntryPoint="SendMessage")]
    public static extern int SendMessage(IntPtr hWnd, uint Msg, int wParam, int lParam);
}
"@
$hwnd = [Cam]::capCreateCaptureWindowA("Webcam", 0, 0, 0, 640, 480, [IntPtr]::Zero, 0)
[Cam]::SendMessage($hwnd, 1034, 0, 0) | Out-Null
Start-Sleep -Milliseconds 500
[Cam]::SendMessage($hwnd, 1084, 0, 0) | Out-Null
[Cam]::SendMessage($hwnd, 1054, 0, 0) | Out-Null
[Cam]::SendMessage($hwnd, 1035, 0, 0) | Out-Null

Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img -ne $null) {
    $ms = New-Object System.IO.MemoryStream
    $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    Write-Host "GOT IMAGE"
    $img.Dispose(); $ms.Dispose()
} else {
    Write-Host "NO IMAGE"
}
