{ lib, buildGoModule }:
buildGoModule {
  pname = "zctl-agent";
  version = "0.0.1";
  src = ../../agents/go-agent;
  subPackages = [ "cmd/agent" ];
  vendorHash = null;

  postInstall = ''
    mv $out/bin/agent $out/bin/zctl-agent
  '';

  meta = with lib; {
    description = "zctl agent — registers a machine with the zctl control plane and executes remote commands";
    mainProgram = "zctl-agent";
  };
}
