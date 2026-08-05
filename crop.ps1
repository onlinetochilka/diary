Add-Type -AssemblyName System.Drawing
$img_path = 'C:\Users\yandj\.gemini\antigravity\brain\d820d8c5-7d12-4eb3-a527-f45ffe99133b\.user_uploaded\media_1785922740783.png'
$out_dir = 'd:\daily\public\avatars'

# Image 1 (9 pencils) is 1024x558
# 1024 / 3 = 341.33
# 558 / 3 = 186 -> Doesn't look like a standard square grid
# Let's crop manually or use square sizes

$bmp = [System.Drawing.Bitmap]::FromFile($img_path)

# Let's find out the actual size and crop correctly
# Actually, the original images were likely generated as grids. 1024x558 means it's wide and not tall enough for 3x3 square.
# Ah, looking at the screenshot, the user provided a 9 grid image, and the other one.
# It seems the images are maybe 3x3 circles.
# I will just write a script to crop them carefully using squares, centering them.

$square_size = [Math]::Floor($bmp.Height / 3)
$w_offset = [Math]::Floor(($bmp.Width - ($square_size * 3)) / 2)

$count = 1
for ($y = 0; $y -lt 3; $y++) {
    for ($x = 0; $x -lt 3; $x++) {
        $rect = New-Object System.Drawing.Rectangle ($w_offset + $x * $square_size), ($y * $square_size), $square_size, $square_size
        $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
        $cropped.Save("$out_dir\pencil_pack1_${count}.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $cropped.Dispose()
        $count++
    }
}
$bmp.Dispose()
