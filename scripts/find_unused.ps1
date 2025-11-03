# Find files that are not referenced elsewhere in the repo (dry-run)
# Excludes: docs/, .git/, node_modules/, backups/, android/build, android/gradle
# Outputs JSON to stdout with a list of candidate unused files.

param(
    [string]$Root = "C:\dev\flowjournal",
    # Optional extra exclude patterns (array of strings or single comma-separated string)
    [Parameter()]
    [string[]]
    $ExcludeExtra = @('memory','memory_bank')
)

Set-Location -Path $Root

$excludePatterns = @('\\.git\\','\\node_modules\\','\\backups\\','\\docs\\','\\android\\build\\','\\android\\gradle\\')

# Add any extra exclude patterns supplied by the caller. Patterns will be matched against the full path.
foreach($e in $ExcludeExtra){
    if([string]::IsNullOrWhiteSpace($e)){ continue }
    # normalize simple tokens into a path-like regex segment
    $tok = [regex]::Escape($e)
    # allow matching path segments containing the token
    $excludePatterns += "\\$tok\\"
}

$allFiles = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $full = $_.FullName
    foreach($p in $excludePatterns){ if($full -match $p){ return $false } }
    return $true
}

# Build a list of files to search in for references (include docs here so references from docs count)
$searchScope = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\.git\\' }

$searchPaths = $searchScope | Select-Object -ExpandProperty FullName

$unused = @()

Write-Host "Scanning $($allFiles.Count) candidate files for references (this may take a while)..."

foreach($f in $allFiles){
    # skip very large files by size ( > 5MB ) as likely binaries
    if($f.Length -gt 5MB){ continue }

    $name = $f.Name
    # relative path using forward slashes from repo root
    # TrimStart expects chars; cast to [char] to avoid string-length conversion errors
    # use ASCII code 92 for backslash to avoid escaping/length issues in script literals
    $rel = $f.FullName.Substring($Root.Length).TrimStart([char]92,[char]'/') -replace '\\','/'
    $relNoExt = [IO.Path]::ChangeExtension($rel, $null)
    $found = $false

    # Search by exact filename first
    try{
        $found = Select-String -Path $searchPaths -Pattern ([regex]::Escape($name)) -SimpleMatch -Quiet -ErrorAction SilentlyContinue
    } catch { $found = $false }

    if(-not $found){
        # search by relative path with and without extension
        try{
            $found = Select-String -Path $searchPaths -Pattern ([regex]::Escape($rel)) -SimpleMatch -Quiet -ErrorAction SilentlyContinue
        } catch { $found = $false }
    }
    if(-not $found){
        try{
            $found = Select-String -Path $searchPaths -Pattern ([regex]::Escape($relNoExt)) -SimpleMatch -Quiet -ErrorAction SilentlyContinue
        } catch { $found = $false }
    }

    if(-not $found){
        $unused += $f.FullName
    }
}

$out = @{ allCandidates = $allFiles.Count; unusedCount = $unused.Count; unused = $unused }

$out | ConvertTo-Json -Depth 4
