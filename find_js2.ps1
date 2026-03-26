$histDir = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History"
$files = Get-ChildItem -Path $histDir -Recurse -Filter "*.js" | Sort-Object LastWriteTime -Descending | Select-Object -First 100

foreach ($f in $files) {
    Try {
        $content = Get-Content -LiteralPath $f.FullName -Encoding UTF8 -Raw
        if ($content.Contains([char]1043+[char]1083+[char]1072+[char]1074+[char]1085+[char]1072)) { # "Глава" or similar? No, let's search for something simple
             if ($content.Contains([char]1054+[char]1090+[char]1082+[char]1088+[char]1099+[char]1090+[char]1100)) { # "Открыть"
                Write-Output "===============" >> JS_FOUND.txt
                Write-Output $f.FullName >> JS_FOUND.txt
                Write-Output "FOUND!" >> JS_FOUND.txt
             }
        }
    } Catch {}
}
