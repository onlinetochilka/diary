Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('C:\Users\yandj\.gemini\antigravity\brain\d820d8c5-7d12-4eb3-a527-f45ffe99133b\.user_uploaded\media_1785922740810.jpg')
Write-Output $img.Width
Write-Output $img.Height
$img.Dispose()
