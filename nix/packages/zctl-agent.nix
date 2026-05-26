{ lib, buildGoModule }:
buildGoModule {
  pname = "zctl-agent";
  version = "0.0.1";
  src = ../../agents/go-agent;
  subPackages = [ "cmd/agent" ];
  vendorHash = "sha256-0Qxw+MUYVgzgWB8vi3HBYtVXSq/btfh4ZfV/m1chNrA=";

  postInstall = ''
    mv $out/bin/agent $out/bin/zctl-agent
  '';

  meta = with lib; {
    description = "zctl agent — registers a machine with the zctl control plane and executes remote commands";
    mainProgram = "zctl-agent";
  };
}
