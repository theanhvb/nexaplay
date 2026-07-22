param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Message
)

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

if (-not (git status --porcelain)) {
  Write-Host "Không có thay đổi để publish."
  exit 0
}

Write-Host "Kiểm tra build trước khi publish..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build thất bại; chưa push và chưa deploy." }

git add .
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw "Git diff có lỗi định dạng." }

git commit -m $Message
if ($LASTEXITCODE -ne 0) { throw "Không thể tạo commit." }

git push origin main
if ($LASTEXITCODE -ne 0) { throw "Không thể push lên GitHub." }

Write-Host "Đã push. VPS sẽ tự deploy trong tối đa khoảng 2 phút."

