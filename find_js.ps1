$histDir = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History"
$files = Get-ChildItem -Path $histDir -Recurse -Filter "*.js" | Sort-Object LastWriteTime -Descending | Select-Object -First 30

foreach ($f in $files) {
    Try {
        $content = Get-Content -LiteralPath $f.FullName -Encoding UTF8 -Raw
        if ($content.Contains("startOpenBtn.textContent = ``Открыть")) {
            Write-Output "===============" > JS_FOUND.txt
            Write-Output $f.FullName >> JS_FOUND.txt
            Write-Output "FOUND UNO!" >> JS_FOUND.txt
        }
    } Catch {}
}
