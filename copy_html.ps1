$src = Join-Path $env:USERPROFILE "AppData\Roaming\Code\User\History\113bcab8\eMBM.html"
$dst = Join-Path (Get-Location) "index.html"
Copy-Item -Path $src -Destination $dst -Force
Write-Output "Copied $src to $dst"
