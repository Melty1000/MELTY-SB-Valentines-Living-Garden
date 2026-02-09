# Living Garden: TypeScript to JavaScript Converter
# Run from APPLICATION folder

$srcDir = ".\src"
$jsDir = ".\js"

# Create directory structure
$dirs = @(
    "$jsDir",
    "$jsDir\core",
    "$jsDir\commands",
    "$jsDir\connection",
    "$jsDir\effects",
    "$jsDir\garden",
    "$jsDir\garden\flowers",
    "$jsDir\garden\vine",
    "$jsDir\utils",
    "$jsDir\debug",
    "$jsDir\debug\panel"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Get all TypeScript files
$tsFiles = Get-ChildItem -Path $srcDir -Recurse -Filter "*.ts" | Where-Object { $_.Name -ne "vite-env.d.ts" }

foreach ($file in $tsFiles) {
    $relativePath = $file.FullName.Substring((Get-Item $srcDir).FullName.Length + 1)
    $jsPath = Join-Path $jsDir ($relativePath -replace "\.ts$", ".js")
    
    $content = Get-Content $file.FullName -Raw
    
    # Remove type annotations
    # Interface and type definitions
    $content = $content -replace "(?m)^export\s+interface\s+\w+\s*\{[^}]*\}\s*", ""
    $content = $content -replace "(?m)^interface\s+\w+\s*\{[^}]*\}\s*", ""
    $content = $content -replace "(?m)^export\s+type\s+.+?;\s*", ""
    $content = $content -replace "(?m)^type\s+.+?;\s*", ""
    
    # Import type statements
    $content = $content -replace "import\s+type\s+\{[^}]+\}\s+from\s+'[^']+';?\s*\n?", ""
    $content = $content -replace ",\s*type\s+\w+", ""
    
    # Generic type parameters on functions/classes
    $content = $content -replace "<[A-Z]\w*(?:\s*=\s*[^>]+)?(?:,\s*[A-Z]\w*(?:\s*=\s*[^>]+)?)*>", ""
    
    # Variable type annotations
    $content = $content -replace ":\s*\w+(?:<[^>]+>)?(?:\[\])?\s*(?==)", " "
    $content = $content -replace ":\s*\w+(?:<[^>]+>)?(?:\[\])?\s*;", ";"
    
    # Function return types
    $content = $content -replace "\):\s*Promise<[^>]+>", ")"
    $content = $content -replace "\):\s*\w+(?:<[^>]+>)?(?:\[\])?", ")"
    
    # Parameter types
    $content = $content -replace "(\w+):\s*\w+(?:<[^>]+>)?(?:\[\])?(?:\s*\|[^,)]+)?(?=\s*[,)])", '$1'
    
    # Cast expressions (as any, as Type)
    $content = $content -replace "\s+as\s+\w+(?:<[^>]+>)?", ""
    $content = $content -replace "\(window\s*\)", "window"
    
    # Private/public modifiers in class properties
    $content = $content -replace "(?m)^\s*private\s+", "  "
    $content = $content -replace "(?m)^\s*public\s+", "  "
    
    # Fix import paths (.ts extension should not be there, but ensure .js)
    $content = $content -replace "from\s+'(\.[^']+)'", "from '`$1.js'"
    $content = $content -replace "\.ts\.js", ".js"
    $content = $content -replace "\.js\.js", ".js"
    
    # Remove Vite HMR code
    $content = $content -replace "(?s)if\s*\(import\.meta\.hot\)\s*\{[^}]+\}", ""
    
    # Clean up multiple blank lines
    $content = $content -replace "(\r?\n){3,}", "`n`n"
    
    # Ensure parent directory exists
    $parentDir = Split-Path $jsPath -Parent
    if (!(Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    
    Set-Content -Path $jsPath -Value $content -NoNewline
    Write-Host "Converted: $relativePath -> $($jsPath -replace '.*\\js\\', 'js\')"
}

Write-Host "`nConversion complete! $($tsFiles.Count) files processed."
