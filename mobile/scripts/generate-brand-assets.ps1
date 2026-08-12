param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets')
)

Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$paper = [System.Drawing.ColorTranslator]::FromHtml('#F6F5F0')
$moss = [System.Drawing.ColorTranslator]::FromHtml('#2F6F59')
$mossDark = [System.Drawing.ColorTranslator]::FromHtml('#1F503E')
$clay = [System.Drawing.ColorTranslator]::FromHtml('#C96843')
$transparent = [System.Drawing.Color]::Transparent

function New-Canvas([int]$Size, [System.Drawing.Color]$Background) {
    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear($Background)
    return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-FocusFlowMark(
    [System.Drawing.Graphics]$Graphics,
    [float]$Center,
    [float]$Scale,
    [System.Drawing.Color]$Primary,
    [System.Drawing.Color]$Accent
) {
    $outerPen = [System.Drawing.Pen]::new($Primary, 72 * $Scale)
    $outerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $outerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $innerPen = [System.Drawing.Pen]::new($Primary, 54 * $Scale)
    $innerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $innerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accentBrush = [System.Drawing.SolidBrush]::new($Accent)
    try {
        $outer = [System.Drawing.RectangleF]::new($Center - (278 * $Scale), $Center - (278 * $Scale), 556 * $Scale, 556 * $Scale)
        $inner = [System.Drawing.RectangleF]::new($Center - (172 * $Scale), $Center - (172 * $Scale), 344 * $Scale, 344 * $Scale)
        $Graphics.DrawArc($outerPen, $outer, 212, 272)
        $Graphics.DrawArc($innerPen, $inner, 28, 238)
        $dot = 92 * $Scale
        $Graphics.FillEllipse($accentBrush, $Center - ($dot / 2), $Center - ($dot / 2), $dot, $dot)
    }
    finally {
        $outerPen.Dispose()
        $innerPen.Dispose()
        $accentBrush.Dispose()
    }
}

function Save-Asset([string]$Name, [int]$Size, [System.Drawing.Color]$Background, [float]$MarkScale, [System.Drawing.Color]$Primary, [System.Drawing.Color]$Accent) {
    $canvas = New-Canvas $Size $Background
    try {
        if ($MarkScale -gt 0) {
            Draw-FocusFlowMark $canvas.Graphics ($Size / 2) $MarkScale $Primary $Accent
        }
        $path = Join-Path $resolvedOutput $Name
        $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output "Generated $path"
    }
    finally {
        $canvas.Graphics.Dispose()
        $canvas.Bitmap.Dispose()
    }
}

# The adaptive foreground stays inside Android's central safe zone.
Save-Asset 'icon.png' 1024 $paper 1.18 $mossDark $clay
Save-Asset 'android-icon-foreground.png' 1024 $transparent 0.86 $mossDark $clay
Save-Asset 'android-icon-background.png' 1024 $paper 0.0 $transparent $transparent
Save-Asset 'android-icon-monochrome.png' 1024 $transparent 0.86 ([System.Drawing.Color]::Black) ([System.Drawing.Color]::Black)
Save-Asset 'splash-icon.png' 512 $transparent 0.68 $mossDark $clay
Save-Asset 'favicon.png' 64 $paper 0.070 $mossDark $clay
