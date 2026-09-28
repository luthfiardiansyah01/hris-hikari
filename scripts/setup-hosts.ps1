# Setup domain internal hris.hikari.local
# Jalankan sebagai Administrator di PowerShell

param(
    [string]$ServerIP = ""
)

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$domain    = "hris.hikari.local"

# Minta IP server jika tidak diberikan
if (-not $ServerIP) {
    $ServerIP = Read-Host "Masukkan IP server HRIS (contoh: 192.168.1.10)"
}

# Cek apakah sudah ada entri
$existing = Get-Content $hostsPath | Where-Object { $_ -match $domain }

if ($existing) {
    Write-Host "Domain '$domain' sudah terdaftar:" -ForegroundColor Yellow
    Write-Host $existing
    $overwrite = Read-Host "Timpa? (y/n)"
    if ($overwrite -ne "y") { exit 0 }

    # Hapus baris lama
    $content = Get-Content $hostsPath | Where-Object { $_ -notmatch $domain }
    Set-Content $hostsPath $content -Encoding UTF8
}

# Tambah entri baru
Add-Content $hostsPath "`n$ServerIP`t$domain" -Encoding UTF8

Write-Host ""
Write-Host "Berhasil! Sekarang bisa akses HRIS di:" -ForegroundColor Green
Write-Host "http://$domain" -ForegroundColor Cyan
Write-Host ""
Write-Host "Flush DNS cache..." -ForegroundColor Gray
ipconfig /flushdns | Out-Null
Write-Host "Selesai." -ForegroundColor Green
