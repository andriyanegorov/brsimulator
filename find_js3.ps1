$histDir = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History"
$files = Get-ChildItem -Path $histDir -Recurse -Filter "*.js" | Sort-Object LastWriteTime -Descending | Select-Object -First 30

foreach ($f in $files) {
    Try {
        $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
        if ($content.Contains("startOpenBtn.textContent")) {
            Write-Output "==============="
            Write-Output $f.FullName
            Write-Output $content.Substring(16000, 100)
        }
    } Catch {}
}
