$histDir = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History"
$files = Get-ChildItem -Path $histDir -Recurse -Filter "*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 30

foreach ($f in $files) {
    $content = Get-Content -LiteralPath $f.FullName -Encoding UTF8 -Raw
    if ($content.Contains("rouletteModal")) {
        Write-Output "ROULETTE IN $($f.FullName)"
        $lines = $content -split "`n"
        for ($i=0; $i -lt $lines.Length; $i++) {
            if ($lines[$i].Contains("rouletteModal")) {
                Write-Output $lines[($i-5)..($i+15)] -join "`n"
                break
            }
        }
        break
    }
}
