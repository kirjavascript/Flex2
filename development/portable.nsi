; portable single-exe launcher: extracts the packaged app to %TEMP% and runs it
; expects -DPAYLOAD=<packaged dir> -DICON=<ico> -DOUTFILE=<exe> -DVERSION=<x.y.z>
; -DBUILDID=<id>. PAYLOAD/ICON/OUTFILE must be windows-style paths, since
; makensis runs under wine (see development/build.sh)

Name "Flex 2"
OutFile "${OUTFILE}"
Icon "${ICON}"
SilentInstall silent
RequestExecutionLevel user
Unicode true

VIProductVersion "${VERSION}.0"
VIAddVersionKey "CompanyName" "Flex 2"
VIAddVersionKey "FileDescription" "Flex 2"
VIAddVersionKey "ProductName" "Flex 2"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "kirjavascript"

; BUILDID keeps the cache dir unique per build, so a rebuild of the same
; version is never served from a stale extraction
!define DIRNAME "Flex2-${VERSION}-${BUILDID}"

Section
    StrCpy $R0 "$TEMP\${DIRNAME}"

    ; reap payloads left behind by older builds or killed instances
    Call CleanStale

    IfFileExists "$R0\Flex2.exe" run extract

extract:
    ; extract privately, then move into place, so a concurrent launch never
    ; sees a half-written payload
    System::Call 'kernel32::GetCurrentProcessId()i.r1'
    StrCpy $R1 "$TEMP\${DIRNAME}-$1"
    RMDir /r "$R1"
    SetOutPath "$R1"
    File /r "${PAYLOAD}\*"
    SetOutPath "$TEMP"
    ClearErrors
    Rename "$R1" "$R0"
    IfErrors rename_failed run

rename_failed:
    IfFileExists "$R0\Flex2.exe" use_shared use_own

use_shared:
    RMDir /r "$R1"
    Goto run

use_own:
    StrCpy $R0 "$R1"

run:
    ; scripts are read from the directory holding this exe, as with the AppImage
    System::Call 'kernel32::SetEnvironmentVariable(t "FLEX2_PORTABLE", t "$EXEDIR")i'
    ExecWait '"$R0\Flex2.exe"'
SectionEnd

; delete every $TEMP\Flex2-* payload except this build's, skipping any whose
; Flex2.exe is locked by a running instance
Function CleanStale
    FindFirst $0 $1 "$TEMP\Flex2-*"
loop:
    StrCmp $1 "" done
    StrCmp $1 "${DIRNAME}" next
    IfFileExists "$TEMP\$1\*.*" 0 next
    ClearErrors
    Delete "$TEMP\$1\Flex2.exe"
    IfErrors next
    RMDir /r "$TEMP\$1"
next:
    FindNext $0 $1
    Goto loop
done:
    FindClose $0
FunctionEnd
