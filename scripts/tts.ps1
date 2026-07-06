param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

Add-Type -AssemblyName System.Speech

$texto = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

$vozPt = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'pt*' } | Select-Object -First 1
if ($vozPt) { $synth.SelectVoice($vozPt.VoiceInfo.Name) }

$synth.SetOutputToWaveFile($OutputPath)
$synth.Speak($texto)
$synth.Dispose()
