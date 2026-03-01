
Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\Users\yuriq\OneDrive\Área de Trabalho\PROJETINHOS\Escala-que-Converte\src\assets\centauro_header.png"
$destPath = "c:\Users\yuriq\OneDrive\Área de Trabalho\PROJETINHOS\Escala-que-Converte\src\assets\centauro_header_transparent.png"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source file not found: $sourcePath"
    exit 1
}

$img = [System.Drawing.Bitmap]::FromFile($sourcePath)
$bgColor = $img.GetPixel(0, 0)
$tolerance = 60 # Adjusted tolerance for compression artifacts

Write-Host "Background Color: $($bgColor.R), $($bgColor.G), $($bgColor.B)"

# Create a new bitmap to avoid file lock on overwrite (though we write to new file)
$newImg = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
$g = [System.Drawing.Graphics]::FromImage($newImg)
$g.DrawImage($img, 0, 0, $img.Width, $img.Height)
$g.Dispose()
$img.Dispose() # Release original file

for ($x = 0; $x -lt $newImg.Width; $x++) {
    for ($y = 0; $y -lt $newImg.Height; $y++) {
        $pixel = $newImg.GetPixel($x, $y)
        
        # Simple distance check or individual channel check
        $diff = [Math]::Abs($pixel.R - $bgColor.R) + [Math]::Abs($pixel.G - $bgColor.G) + [Math]::Abs($pixel.B - $bgColor.B)
        
        if ($diff -lt $tolerance) {
            $newImg.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
    }
}

$newImg.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg.Dispose()

Write-Host "Done. Saved to $destPath"
