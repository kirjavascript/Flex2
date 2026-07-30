#!/bin/zsh
set -e

# copy latest version of electron remote
cp -r node_modules/@electron/remote ./static
node -e "require('./development/build')()"
npx electron-packager ./static Flex2 --platform=win32 --arch=x64 \
    --asar --overwrite --package-manager yarn \
    --win32metadata.CompanyName="Flex 2" \
    --win32metadata.FileDescription="Flex 2" \
    --win32metadata.ProductName="Flex 2" \
    --appCopyright="kirjavascript" \
    --icon=./development/icon.ico
npx electron-packager ./static Flex2 --platform=win32 --arch=ia32 \
    --asar --overwrite --package-manager yarn \
    --win32metadata.CompanyName="Flex 2" \
    --win32metadata.FileDescription="Flex 2" \
    --win32metadata.ProductName="Flex 2" \
    --appCopyright="kirjavascript" \
    --icon=./development/icon.ico
npx electron-packager ./static Flex2 --platform=linux --arch=x64 --asar --overwrite --package-manager yarn
npx electron-packager ./static Flex2 --platform=darwin --arch=x64 --asar --overwrite --package-manager yarn


cp -r scripts Flex2-win32-ia32
cd Flex2-win32-ia32
zip -r ../flex2-win32-ia32.zip *
cd ..
rm -r Flex2-win32-ia32

cp -r scripts Flex2-win32-x64
cd Flex2-win32-x64
zip -r ../flex2-win32-x64.zip *
cd ..
rm -r Flex2-win32-x64

cp -r scripts Flex2-linux-x64
cd Flex2-linux-x64
chmod a+x Flex2
tar cfvz ../flex2-linux-x64.tar.gz *
cd ..
rm -r Flex2-linux-x64

cp -r scripts Flex2-darwin-x64
cd Flex2-darwin-x64
chmod a+x Flex2.app/Contents/MacOS/Flex2
tar cfvz ../flex2-osx-x64.tar.gz *
cd ..
rm -r Flex2-darwin-x64

TARBALL="${1:-flex2-linux-x64.tar.gz}"
APPIMAGETOOL="$(command -v appimagetool 2>/dev/null || true)"
if [ -z "$APPIMAGETOOL" ]; then
    echo "appimagetool not found, downloading..."
    APPIMAGETOOL="development/appimagetool"
    curl -Lo "$APPIMAGETOOL" https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
    chmod +x "$APPIMAGETOOL"
fi

rm -rf Flex2.AppDir
mkdir -p Flex2.AppDir
tar xzf "$TARBALL" -C Flex2.AppDir

ln -sf Flex2 Flex2.AppDir/AppRun

if command -v convert &>/dev/null; then
    convert development/icon.ico Flex2.AppDir/flex2.png
elif command -v magick &>/dev/null; then
    magick development/icon.ico Flex2.AppDir/flex2.png
else
    echo "Warning: ImageMagick not found, using placeholder icon"
    # 1x1 red PNG as fallback
    printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > Flex2.AppDir/flex2.png
fi

cat > Flex2.AppDir/flex2.desktop <<EOF
[Desktop Entry]
Name=Flex 2
Exec=Flex2
Icon=flex2
Type=Application
Categories=Development;
EOF

rm -rf flex2-linux-x64.AppImage
ARCH=x86_64 "$APPIMAGETOOL" Flex2.AppDir flex2-linux-x64.AppImage
rm -rf Flex2.AppDir

echo "Built flex2-linux-x64.AppImage"
