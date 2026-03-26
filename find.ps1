$historyDir = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History"
$htmlFiles = Get-ChildItem -Path $historyDir -Recurse -Filter "*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 50

foreach ($file in $htmlFiles) {
    Try {
        $content = Get-Content -LiteralPath $file.FullName -Encoding UTF8 -Raw
        if ($content -match "Black Russia Simulator" -and $content -match "Главное") {
            Write-Output "==============="
            Write-Output $file.FullName
            Write-Output $content.Substring(0, 500)
            break
        }
    } Catch {}
}
