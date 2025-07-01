![backend](https://github.com/tsl0922/cmdr/workflows/backend/badge.svg)
![frontend](https://github.com/tsl0922/cmdr/workflows/frontend/badge.svg)
[![GitHub Releases](https://img.shields.io/github/downloads/tsl0922/cmdr/total)](https://github.com/tsl0922/cmdr/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/tsl0922/cmdr)](https://hub.docker.com/r/tsl0922/cmdr)
[![Packaging status](https://repology.org/badge/tiny-repos/cmdr.svg)](https://repology.org/project/cmdr/versions)
![GitHub](https://img.shields.io/github/license/tsl0922/cmdr)

# cmdr - Share your terminal over the web

cmdr is a simple command-line tool for sharing terminal over the web.

![screenshot](https://github.com/tsl0922/cmdr/raw/main/screenshot.gif)

# Features

- Built on top of [libuv](https://libuv.org) and [WebGL2](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) for speed
- Fully-featured terminal with [CJK](https://en.wikipedia.org/wiki/CJK_characters) and IME support
- [ZMODEM](https://en.wikipedia.org/wiki/ZMODEM) ([lrzsz](https://ohse.de/uwe/software/lrzsz.html)) / [trzsz](https://trzsz.github.io) file transfer support
- [Sixel](https://en.wikipedia.org/wiki/Sixel) image output support ([img2sixel](https://saitoha.github.io/libsixel) / [lsix](https://github.com/hackerb9/lsix))
- SSL support based on [OpenSSL](https://www.openssl.org) / [Mbed TLS](https://github.com/Mbed-TLS/mbedtls)
- Run any custom command with options
- Basic authentication support and many other custom options
- Cross platform: macOS, Linux, FreeBSD/OpenBSD, [OpenWrt](https://openwrt.org), Windows

> ❤ Special thanks to [JetBrains](https://www.jetbrains.com/?from=cmdr) for sponsoring the opensource license to this project.

# Installation

## Install on macOS

- Install with [Homebrew](http://brew.sh): `brew install cmdr`
- Install with [MacPorts](https://www.macports.org): `sudo port install cmdr`

## Install on Linux

- Binary version (recommended): download from the [releases](https://github.com/tsl0922/cmdr/releases) page
- Install with [Homebrew](https://docs.brew.sh/Homebrew-on-Linux) : `brew install cmdr`
- Install the snap: `sudo snap install cmdr --classic`
- Build from source (debian/ubuntu):
    ```bash
    sudo apt-get update
    sudo apt-get install -y build-essential cmake git libjson-c-dev libwebsockets-dev
    git clone https://github.com/tsl0922/cmdr.git
    cd cmdr && mkdir build && cd build
    cmake ..
    make && sudo make install
    ```
    You may also need to compile/install [libwebsockets](https://libwebsockets.org) from source if the `libwebsockets-dev` package is outdated.
- Install on OpenWrt: `opkg install cmdr`
- Install on Gentoo: clone the [repo](https://bitbucket.org/mgpagano/cmdr/src/master) and follow the directions [here](https://wiki.gentoo.org/wiki/Custom_repository#Creating_a_local_repository).

## Install on Windows

- Binary version (recommended): download from the [releases](https://github.com/tsl0922/cmdr/releases) page
- Install with [WinGet](https://github.com/microsoft/winget-cli): `winget install tsl0922.cmdr`
- Install with [Scoop](https://scoop.sh/#/apps?q=cmdr&s=2&d=1&o=true): `scoop install cmdr`
- [Compile on Windows](https://github.com/tsl0922/cmdr/wiki/Compile-on-Windows)

# Usage

## Command-line Options

```
USAGE:
    cmdr [options] <command> [<arguments...>]

OPTIONS:
    -p, --port              Port to listen (default: 6969, use `0` for random port)
    -i, --interface         Network interface to bind (eg: eth0), or UNIX domain socket path (eg: /var/run/cmdr.sock)
    -U, --socket-owner      User owner of the UNIX domain socket file, when enabled (eg: user:group)
    -c, --credential        Credential for basic authentication (format: username:password)
    -H, --auth-header       HTTP Header name for auth proxy, this will configure cmdr to let a HTTP reverse proxy handle authentication
    -u, --uid               User id to run with
    -g, --gid               Group id to run with
    -s, --signal            Signal to send to the command when exit it (default: 1, SIGHUP)
    -w, --cwd               Working directory to be set for the child program
    -a, --url-arg           Allow client to send command line arguments in URL (eg: http://localhost:6969?arg=foo&arg=bar)
    -W, --writable          Allow clients to write to the TTY (readonly by default)
    -t, --client-option     Send option to client (format: key=value), repeat to add more options
    -T, --terminal-type     Terminal type to report, default: xterm-256color
    -O, --check-origin      Do not allow websocket connection from different origin
    -m, --max-clients       Maximum clients to support (default: 0, no limit)
    -o, --once              Accept only one client and exit on disconnection
    -q, --exit-no-conn      Exit on all clients disconnection
    -B, --browser           Open terminal with the default system browser
    -I, --index             Custom index.html path
    -b, --base-path         Expected base path for requests coming from a reverse proxy (eg: /mounted/here, max length: 128)
    -P, --ping-interval     Websocket ping interval(sec) (default: 5)
    -6, --ipv6              Enable IPv6 support
    -S, --ssl               Enable SSL
    -C, --ssl-cert          SSL certificate file path
    -K, --ssl-key           SSL key file path
    -A, --ssl-ca            SSL CA file path for client certificate verification
    -d, --debug             Set log level (default: 7)
    -v, --version           Print the version and exit
    -h, --help              Print this text and exit
```

Read the example usage on the [wiki](https://github.com/tsl0922/cmdr/wiki/Example-Usage).

## Browser Support

Modern browsers, See [Browser Support](https://github.com/xtermjs/xterm.js#browser-support).

## Alternatives

* [Wetty](https://github.com/krishnasrinivas/wetty): [Node](https://nodejs.org) based web terminal (SSH/login)
* [GoTTY](https://github.com/yudai/gotty): [Go](https://golang.org) based web terminal
