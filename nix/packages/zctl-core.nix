{ lib, stdenv, nodejs, pnpm_9, pnpmConfigHook, fetchPnpmDeps, esbuild, makeWrapper }:
let
  pnpmDeps = fetchPnpmDeps {
    pname = "zctl-core";
    version = "0.0.1";
    pnpm = pnpm_9;
    fetcherVersion = 3;
    src = lib.fileset.toSource {
      root = ../..;
      fileset = lib.fileset.unions [
        ../../pnpm-lock.yaml
        ../../pnpm-workspace.yaml
        ../../package.json
        ../../apps/core/package.json
        ../../packages/config/package.json
        ../../packages/protocol/package.json
        ../../packages/shared/package.json
      ];
    };
    hash = "sha256-q1KDigYCxzxgYTPJUfCrpM0V+nRRtVy8v/FcM9n2gFs=";
  };
in
stdenv.mkDerivation {
  pname = "zctl-core";
  version = "0.0.1";
  src = lib.fileset.toSource {
    root = ../..;
    fileset = lib.fileset.unions [
      ../../pnpm-lock.yaml
      ../../pnpm-workspace.yaml
      ../../tsconfig.base.json
      ../../package.json
      ../../apps/core
      ../../packages/config
      ../../packages/protocol
      ../../packages/shared
    ];
  };

  nativeBuildInputs = [
    nodejs
    pnpm_9
    pnpmConfigHook
    esbuild
    makeWrapper
  ];

  inherit pnpmDeps;

  buildPhase = ''
    runHook preBuild

    # Compile workspace packages so their dist/ is available for bundling
    pnpm -r --filter @zctl/config --filter @zctl/protocol --filter @zctl/shared build

    mkdir -p dist
    esbuild apps/core/src/index.ts \
      --bundle --platform=node --format=esm \
      --outfile=dist/index.js
    esbuild apps/core/src/migrate.ts \
      --bundle --platform=node --format=esm \
      --outfile=dist/migrate.js

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/zctl-core $out/bin

    cp dist/index.js dist/migrate.js $out/share/zctl-core/
    cp -r apps/core/drizzle $out/share/zctl-core/drizzle

    makeWrapper ${nodejs}/bin/node $out/bin/zctl-core \
      --add-flags "$out/share/zctl-core/index.js"
    makeWrapper ${nodejs}/bin/node $out/bin/zctl-core-migrate \
      --add-flags "$out/share/zctl-core/migrate.js" \
      --set MIGRATIONS_FOLDER "$out/share/zctl-core/drizzle"

    runHook postInstall
  '';

  meta = with lib; {
    description = "zctl core — HTTP/WebSocket control plane for remote machine orchestration";
    mainProgram = "zctl-core";
  };
}
