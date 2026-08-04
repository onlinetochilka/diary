Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-DocxText($path) {
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
        $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
        if ($entry) {
            $stream = $entry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $xmlContent = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            
            $xml = [xml]$xmlContent
            $nsManager = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
            $nsManager.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
            
            $paragraphs = $xml.SelectNodes('//w:p', $nsManager)
            foreach ($p in $paragraphs) {
                $texts = $p.SelectNodes('.//w:t', $nsManager)
                $paraText = ''
                foreach ($t in $texts) {
                    $paraText += $t.InnerText
                }
                if ($paraText) { Add-Content -Path 'd:\daily\docx_output.txt' -Value $paraText -Encoding UTF8 }
            }
        }
        $zip.Dispose()
    } catch {
        Add-Content -Path 'd:\daily\docx_output.txt' -Value "Error reading $path : $_" -Encoding UTF8
    }
}

Remove-Item -Path 'd:\daily\docx_output.txt' -ErrorAction SilentlyContinue

$files = Get-ChildItem -Path 'd:\daily' -Filter '*.docx'
foreach ($file in $files) {
    Add-Content -Path 'd:\daily\docx_output.txt' -Value "--- $($file.Name) ---" -Encoding UTF8
    Get-DocxText $file.FullName
}
