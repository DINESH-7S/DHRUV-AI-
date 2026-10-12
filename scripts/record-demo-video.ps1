param(
  [string]$Output = "artifacts/DHRUV-project-walkthrough-2m30.mp4"
)

$ErrorActionPreference = "Stop"
$ffmpeg = "C:\ffmpeg\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe"
$shots = @(
  ".tmp-scratch/shots/home-top.png",
  ".tmp-scratch/shots/home-live.png",
  ".tmp-scratch/shots/ds-maitri.png",
  ".tmp-scratch/shots/exp-list.png",
  ".tmp-scratch/shots/isea43.png",
  ".tmp-scratch/shots/station-maitri.png",
  ".tmp-scratch/shots/home-media-desktop.png",
  ".tmp-scratch/shots/video-desktop.png",
  ".tmp-scratch/shots/events-desktop.png",
  ".tmp-scratch/shots/news.png",
  ".tmp-scratch/shots/ask-saved.png",
  ".tmp-scratch/shots/card-en.png",
  ".tmp-scratch/shots/cert.png",
  ".tmp-scratch/shots/verify-cert.png",
  ".tmp-scratch/shots/insights.png",
  ".tmp-scratch/shots/pack.png"
)

foreach ($shot in $shots) {
  if (-not (Test-Path $shot)) { throw "Missing captured project screen: $shot" }
}
if (-not (Test-Path $ffmpeg)) { throw "ffmpeg was not found at $ffmpeg" }

$outDir = Split-Path -Parent $Output
if ($outDir) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

# Sixteen authentic product screens, 10.3125 seconds each, with 1-second fades:
# 16 * 10.3125 - 15 * 1 = exactly 150 seconds.
$slideDuration = 10.3125
$fadeDuration = 1
$args = @("-y")
foreach ($shot in $shots) { $args += @("-loop", "1", "-t", "$slideDuration", "-i", $shot) }

$filters = @()
for ($i = 0; $i -lt $shots.Count; $i++) {
  $filters += "[$i`:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x06121e,setsar=1,format=yuv420p[v$i]"
}
$current = "v0"
for ($i = 1; $i -lt $shots.Count; $i++) {
  $offset = [math]::Round($i * ($slideDuration - $fadeDuration), 4)
  $next = "x$i"
  $filters += "[$current][v$i]xfade=transition=fade:duration=${fadeDuration}:offset=$offset[$next]"
  $current = $next
}

$args += @(
  "-filter_complex", ($filters -join ";"),
  "-map", "[$current]",
  "-r", "30",
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "20",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  "-an",
  $Output
)

& $ffmpeg @args
if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed with exit code $LASTEXITCODE" }

$duration = & $ffmpeg -v error -show_entries format=duration -of default=nw=1:nk=1 -i $Output 2>$null
Write-Host "Created $Output ($duration seconds)"
