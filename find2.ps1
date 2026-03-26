$historyDir = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History"
$htmlFiles = Get-ChildItem -Path $historyDir -Recurse -Filter "*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 30

foreach ($file in $htmlFiles) {
    Try {
        $content = Get-Content -LiteralPath $file.FullName -Encoding UTF8 -Raw
        if ($content -match "Black Russia Simulator") {
            if ($content -match "telegram.org") {
                if ($content.Length -gt 2000) {
                    Write-Output "==============="
                    Write-Output $file.FullName
                    Write-Output "FOUND!"
                }
            }
        }
    } Catch {}
}
