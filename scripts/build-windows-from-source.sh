#!/bin/bash

set -eo pipefail

echo "Building cmdr.exe for Windows by compiling dependencies from source..."

# Set up environment variables
export MINGW_PREFIX="/usr/x86_64-w64-mingw32"
export PKG_CONFIG_PATH="$MINGW_PREFIX/lib/pkgconfig"
export CMAKE_TOOLCHAIN_FILE="../mingw-toolchain.cmake"

# Function to build libuv
build_libuv() {
    if [ ! -d "libuv" ]; then
        echo "Downloading and building libuv..."
        git clone https://github.com/libuv/libuv.git
        cd libuv
        mkdir build && cd build
        cmake -DCMAKE_TOOLCHAIN_FILE=../../mingw-toolchain.cmake \
              -DCMAKE_BUILD_TYPE=Release \
              -DCMAKE_INSTALL_PREFIX=$MINGW_PREFIX \
              -DBUILD_TESTING=OFF \
              ..
        make -j$(nproc)
        make install
        cd ../..
    fi
}

# Function to build json-c
build_json_c() {
    if [ ! -d "json-c" ]; then
        echo "Downloading and building json-c..."
        git clone https://github.com/json-c/json-c.git
        cd json-c
        mkdir build && cd build
        cmake -DCMAKE_TOOLCHAIN_FILE=../../mingw-toolchain.cmake \
              -DCMAKE_BUILD_TYPE=Release \
              -DCMAKE_INSTALL_PREFIX=$MINGW_PREFIX \
              -DBUILD_TESTING=OFF \
              ..
        make -j$(nproc)
        make install
        cd ../..
    fi
}

# Function to build libwebsockets
build_libwebsockets() {
    if [ ! -d "libwebsockets" ]; then
        echo "Downloading and building libwebsockets..."
        git clone https://github.com/warmcat/libwebsockets.git
        cd libwebsockets
        mkdir build && cd build
        cmake -DCMAKE_TOOLCHAIN_FILE=../../mingw-toolchain.cmake \
              -DCMAKE_BUILD_TYPE=Release \
              -DCMAKE_INSTALL_PREFIX=$MINGW_PREFIX \
              -DLWS_WITH_LIBUV=ON \
              -DLWS_WITH_MBEDTLS=ON \
              -DLWS_WITHOUT_TESTAPPS=ON \
              -DLWS_WITH_STATIC=ON \
              -DLWS_WITH_SHARED=OFF \
              ..
        make -j$(nproc)
        make install
        cd ../..
    fi
}

# Create deps directory
mkdir -p deps && cd deps

# Build dependencies
build_libuv
build_json_c
build_libwebsockets

cd ..

# Now build cmdr
echo "Building cmdr..."
rm -rf build-windows && mkdir -p build-windows && cd build-windows

cmake -DCMAKE_TOOLCHAIN_FILE=../mingw-toolchain.cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_PREFIX_PATH=$MINGW_PREFIX \
    -DCMAKE_FIND_LIBRARY_SUFFIXES=".a" \
    -DCMAKE_C_FLAGS="-Os -ffunction-sections -fdata-sections -fno-unwind-tables -fno-asynchronous-unwind-tables -flto" \
    -DCMAKE_EXE_LINKER_FLAGS="-static -no-pie -Wl,-s -Wl,-Bsymbolic -Wl,--gc-sections" \
    ..

make -j$(nproc)

echo "Build completed!"
if [ -f "cmdr.exe" ]; then
    echo "cmdr.exe built successfully:"
    ls -la cmdr.exe
    file cmdr.exe
else
    echo "Error: cmdr.exe not found"
    exit 1
fi
