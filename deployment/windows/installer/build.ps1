$ErrorActionPreference = 'Stop'
$Folder = Join-Path $PSScriptRoot 'build'
New-Item -ItemType Directory -Force $Folder | Out-Null
python -m pip install -r services/payamgostar/requirements.txt pyinstaller==6.16.0
if ($LASTEXITCODE -ne 0) { throw 'Dependency install failed' }
python -m unittest discover -s services/payamgostar/tests -v
if ($LASTEXITCODE -ne 0) { throw 'Server tests failed' }
python -m unittest discover -s deployment/windows/installer -p 'test_*.py' -v
if ($LASTEXITCODE -ne 0) { throw 'Installer entry tests failed' }
$SchemaSource = Join-Path (Get-Location).Path 'services/payamgostar/contracts'
python -m PyInstaller --noconfirm --clean --onefile --name SanaBridgeService --paths . --collect-all zeep --collect-all lxml --collect-all certifi --add-data "${SchemaSource};services/payamgostar/contracts" --distpath "$Folder/dist" --workpath "$Folder/work" --specpath "$Folder" deployment/windows/installer/service_entry.py
if ($LASTEXITCODE -ne 0) { throw 'Backend freeze failed' }
$Backend = Join-Path $Folder 'dist/SanaBridgeService.exe'
& $Backend --self-test
if ($LASTEXITCODE -ne 0) { throw 'Frozen backend self test failed' }
$Digest = (Get-FileHash $Backend -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -Path (Join-Path $Folder 'BuildInfo.cs') -Encoding UTF8 -Value ('namespace SanaSetup { static class BuildInfo { public const string BackendSha256 = "' + $Digest + '"; } }')
$Compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$Installer = Join-Path $Folder 'SANA-Setup.exe'
& $Compiler /nologo /target:winexe /platform:x64 /codepage:65001 /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "/resource:$Backend,backend.exe" "/resource:$PSScriptRoot/settings.example.json,settings.json" "/out:$Installer" "$PSScriptRoot/Setup.cs" "$Folder/BuildInfo.cs"
if ($LASTEXITCODE -ne 0) { throw 'GUI compile failed' }
$Check = Start-Process -FilePath $Installer -ArgumentList '--check-package' -PassThru -Wait
if ($Check.ExitCode -ne 0) { throw 'Bundled package self test failed' }
$Preview = Join-Path $Folder 'installer-preview.png'
$Image = Start-Process -FilePath $Installer -ArgumentList @('--preview', ('"' + $Preview + '"')) -PassThru -Wait
if ($Image.ExitCode -ne 0 -or !(Test-Path $Preview)) { throw 'RTL preview failed' }
@{
    installerSha256 = (Get-FileHash $Installer -Algorithm SHA256).Hash.ToLowerInvariant()
    backendSha256 = $Digest
    installerBytes = (Get-Item $Installer).Length
    signed = $false
    windowsSelfTest = 'passed'
    realCrmWrites = 0
} | ConvertTo-Json | Set-Content -Path (Join-Path $Folder 'verification.json') -Encoding UTF8
Write-Output ('INSTALLER_BUILD_PASS ' + (Get-Content (Join-Path $Folder 'verification.json') -Raw -Encoding UTF8))
