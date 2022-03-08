param (
    [Parameter(Mandatory,Position = 0)]
    [String]
    $FileList,

    [Parameter(Mandatory=$false)]
    [Switch]
    $RenameToFilename
)

$Files = Get-Content $FileList

foreach ($File in $Files) {
    $Dir = [System.IO.Path]::GetDirectoryName($File)
    $Dir = $Dir + '\' + [System.IO.Path]::GetFileNameWithoutExtension($File)

    $Idx = 2
    while (Test-Path -LiteralPath $Dir) {
        $Dir = $Dir + " " + $Idx
        $Idx++
    }

    New-Item -Path $Dir -ItemType Directory -Force
    $Dir = $Dir + '\\'

    $Rename = "false"
    if($RenameToFilename){
        $Rename = "true"
    }

    node.exe save.js `"$File`" `"$Dir`" `"$Rename`"

}

Add-Type -AssemblyName Microsoft.VisualBasic
[Microsoft.VisualBasic.Interaction]::MsgBox("Image Extraction Complete.", 'OKOnly,SystemModal,Information', 'Extraction Complete')
