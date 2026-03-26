$historyDir = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History"
$htmlFiles = Get-ChildItem -Path $historyDir -Recurse -Filter "*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 30

foreach ($file in $htmlFiles) {
    Try {
        $content = Get-Content -LiteralPath $file.FullName -Encoding UTF8 -Raw
        if ($content -match "Black Russia Simulator") {
            if ($content.Contains([char]1043+[char]1083+[char]1072+[char]1074+[char]1085+[char]1086+[char]1077)) {
                Write-Output "===============" > "FOUND.txt"
                Write-Output $file.FullName >> "FOUND.txt"
                Write-Output $content.Substring(0, 500) >> "FOUND.txt"
            }
        }
    } Catch {}
}
