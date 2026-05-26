{ lib, stdenv, nodejs, pnpm_9, pnpmConfigHook, fetchPnpmDeps, esbuild, makeWrapper }:
let
  pnpmDeps = fetchPnpmDeps {
    pname = "zctl-cli";
    version = "0.0.1";
    pnpm = pnpm_9;
    fetcherVersion = 3;
    src = lib.fileset.toSource {
      root = ../..;
      fileset = lib.fileset.unions [
        ../../pnpm-lock.yaml
        ../../pnpm-workspace.yaml
        ../../package.json
        ../../apps/cli/package.json
        ../../packages/config/package.json
        ../../packages/shared/package.json
      ];
    };
    hash = "sha256-jCkthA5N+kt8uZ9tOEbDd55FXA6bEPuHqTDRzgNQ7fw=";
  };
in
stdenv.mkDerivation {
  pname = "zctl-cli";
  version = "0.0.1";
  src = lib.fileset.toSource {
    root = ../..;
    fileset = lib.fileset.unions [
      ../../pnpm-lock.yaml
      ../../pnpm-workspace.yaml
      ../../tsconfig.base.json
      ../../package.json
      ../../apps/cli
      ../../packages/config
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
    pnpm -r --filter @zctl/config --filter @zctl/shared build
    mkdir -p dist
    esbuild apps/cli/src/index.ts \
      --bundle --platform=node --format=cjs \
      --outfile=dist/zctl.js
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/zctl $out/bin
    cp dist/zctl.js $out/share/zctl/
    makeWrapper ${nodejs}/bin/node $out/bin/zctl \
      --add-flags "$out/share/zctl/zctl.js"
    runHook postInstall
  '';

  meta = with lib; {
    description = "zctl — CLI for remote machine orchestration";
    mainProgram = "zctl";
  };
}
