FROM ubuntu:20.04

ARG TARGETARCH

# Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

# Application
COPY ./dist/${TARGETARCH}/cmdr /usr/bin/cmdr

EXPOSE 6969
WORKDIR /root

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["cmdr", "-W", "bash"]
