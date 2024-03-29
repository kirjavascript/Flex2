#!/bin/zsh
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
chmod a+x Flex2
tar cfvz ../flex2-osx-x64.tar.gz *
cd ..
rm -r Flex2-darwin-x64
