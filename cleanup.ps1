# cleanup.ps1 — Archive legacy Hugo files + duplicate prototypes from my_site
# Run from the repo root (where netlify.toml and v2/ live)
# Safe: uses `git mv` so history is preserved; final step is a commit you review before push

$ErrorActionPreference = "Stop"

Write-Host "==> Archiving legacy Hugo + duplicate prototype files" -ForegroundColor Cyan

# Ensure archive dirs exist
New-Item -ItemType Directory -Force -Path "_archive/hugo" | Out-Null
New-Item -ItemType Directory -Force -Path "_archive/prototype" | Out-Null

# --- Legacy Hugo (no longer built by Netlify) ---
$hugoItems = @(
  "config.yaml",
  "netlify.toml.bak",
  "content",
  "data",
  "i18n",
  "themes",
  "resources",
  "static",
  "public",
  "pages",
  "R",
  "tina",
  ".next",
  "assets",
  "next-env.d.ts",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
  ".hugo_build.lock"
)

foreach ($item in $hugoItems) {
  if (Test-Path $item) {
    Write-Host "  archiving $item" -ForegroundColor Yellow
    git mv $item "_archive/hugo/" 2>$null
  }
}

# --- Original prototype (superseded by v2/) ---
if (Test-Path "design_handoff_portfolio") {
  Write-Host "  archiving design_handoff_portfolio" -ForegroundColor Yellow
  git mv "design_handoff_portfolio" "_archive/prototype/"
}

# --- Untracked duplicate folder ---
if (Test-Path "Personal Portfolio") {
  Write-Host "  deleting 'Personal Portfolio' (untracked duplicate)" -ForegroundColor Yellow
  Remove-Item -Recurse -Force "Personal Portfolio"
}

# --- HANDOFF doc (keep but move into _archive for cleanliness) ---
if (Test-Path "HANDOFF_v2.md") {
  Write-Host "  moving HANDOFF_v2.md -> _archive/" -ForegroundColor Yellow
  git mv "HANDOFF_v2.md" "_archive/HANDOFF_v2.md"
}

Write-Host ""
Write-Host "==> Staged. Review with: git status" -ForegroundColor Green
Write-Host "==> Commit with:" -ForegroundColor Green
Write-Host '    git -c user.name="ChrisPachulski" -c user.email="cjpach@icloud.com" commit -m "chore: archive legacy Hugo + prototype into _archive/"' -ForegroundColor White
Write-Host "==> Then: git push origin master" -ForegroundColor Green
