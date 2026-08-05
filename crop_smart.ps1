Add-Type -AssemblyName System.Drawing

function Get-BoundingBox($bmp) {
    $minX = $bmp.Width
    $minY = $bmp.Height
    $maxX = 0
    $maxY = 0
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            # Not white and not transparent
            if ($pixel.A -gt 10 -and ($pixel.R -lt 250 -or $pixel.G -lt 250 -or $pixel.B -lt 250)) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    return @{ X = $minX; Y = $minY; Width = ($maxX - $minX + 1); Height = ($maxY - $minY + 1) }
}

function Crop-ImageGrid($path, $prefix) {
    $out_dir = 'd:\daily\public\avatars'
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    
    $box = Get-BoundingBox $bmp
    
    $w = [Math]::Floor($box.Width / 3)
    $h = [Math]::Floor($box.Height / 3)
    
    # We want a square crop for each item. So take max of w and h.
    $size = [Math]::Max($w, $h)
    
    $count = 1
    for ($y = 0; $y -lt 3; $y++) {
        for ($x = 0; $x -lt 3; $x++) {
            $cx = $box.X + $x * $w + $w / 2
            $cy = $box.Y + $y * $h + $h / 2
            
            $rx = [Math]::Max(0, [Math]::Floor($cx - $size / 2))
            $ry = [Math]::Max(0, [Math]::Floor($cy - $size / 2))
            $rw = $size
            $rh = $size
            
            if ($rx + $rw -gt $bmp.Width) { $rw = $bmp.Width - $rx }
            if ($ry + $rh -gt $bmp.Height) { $rh = $bmp.Height - $ry }
            
            $rect = New-Object System.Drawing.Rectangle $rx, $ry, $rw, $rh
            $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
            $cropped.Save("$out_dir\${prefix}_${count}.png", [System.Drawing.Imaging.ImageFormat]::Png)
            $cropped.Dispose()
            $count++
        }
    }
    $bmp.Dispose()
}

$img1_path = 'C:\Users\yandj\.gemini\antigravity\brain\d820d8c5-7d12-4eb3-a527-f45ffe99133b\.user_uploaded\media_1785922740783.png'
$img2_path = 'C:\Users\yandj\.gemini\antigravity\brain\d820d8c5-7d12-4eb3-a527-f45ffe99133b\.user_uploaded\media_1785922740810.jpg'

Crop-ImageGrid $img1_path 'pencil_pack1'
Crop-ImageGrid $img2_path 'pencil_pack2'
