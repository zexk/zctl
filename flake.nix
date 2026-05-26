{
  description = "zctl — lightweight self-hosted remote machine orchestration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      devshell,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ devshell.overlays.default ];
        };
      in
      {
        devShells.default = pkgs.devshell.mkShell {
          name = "zctl";
          packages = with pkgs; [
            # language toolchains
            gcc
            go
            nodejs_25
            pnpm

            # database client
            postgresql

            # language servers
            gopls
            nil
            typescript-language-server
            yaml-language-server
            vscode-langservers-extracted

            # linting / formatting
            golangci-lint
            gofumpt
            prettier
            eslint

            # debugging / networking
            jq
            dnsutils
            httpie
            htop
            iperf

            # demo recording
            asciinema
            asciinema-agg
            pv
          ];
        };
      }
    );
}
