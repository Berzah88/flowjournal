Write-Output "Stopping java processes..."
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Output "Removing autolinking..."
$autolinking = 'C:\Users\Berzah\Documents\Code\Flow Journal\android\build\generated\autolinking'
if (Test-Path -LiteralPath $autolinking) {
    Remove-Item -LiteralPath $autolinking -Recurse -Force -ErrorAction SilentlyContinue
    Write-Output "removed autolinking"
} else {
    Write-Output "autolinking not found"
}

Write-Output "Removing android/app/build..."
$appbuild = 'C:\Users\Berzah\Documents\Code\Flow Journal\android\app\build'
if (Test-Path -LiteralPath $appbuild) {
    Remove-Item -LiteralPath $appbuild -Recurse -Force -ErrorAction SilentlyContinue
    Write-Output "removed android app build"
} else {
    Write-Output "android app build not found"
}

Write-Output "Removing android/build..."
$build = 'C:\Users\Berzah\Documents\Code\Flow Journal\android\build'
if (Test-Path -LiteralPath $build) {
    Remove-Item -LiteralPath $build -Recurse -Force -ErrorAction SilentlyContinue
    Write-Output "removed android build"
} else {
    Write-Output "android build not found"
}

Write-Output "Removing .cxx dirs under original node_modules..."
$dirs = Get-ChildItem -Path 'C:\Users\Berzah\Documents\Code\Flow Journal\node_modules' -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq '.cxx' }
if ($dirs) {
    foreach ($d in $dirs) {
        Remove-Item -LiteralPath $d.FullName -Recurse -Force -ErrorAction SilentlyContinue
        Write-Output "Removed: $($d.FullName)"
    }
} else {
    Write-Output ".cxx dirs not found"
}

Write-Output "cleanup-done"
