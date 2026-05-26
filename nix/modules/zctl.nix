self:
{ config, lib, pkgs, ... }:
let
  core = config.services.zctl.core;
  agents = config.services.zctl.agents;
  cli = config.programs.zctl;

  # Unix socket peer-auth URL — no password needed, user must match PG role.
  localDbUrl = "postgres://${core.user}@/${core.database.name}?host=/run/postgresql";
  effectiveDbUrl = if core.database.createLocally then localDbUrl else core.database.url;
in
{
  options = {
    services.zctl.core = {
      enable = lib.mkEnableOption "zctl core server";

      package = lib.mkOption {
        type = lib.types.package;
        default = self.packages.${pkgs.system}.zctl-core;
        defaultText = lib.literalExpression "zctl.packages.\${pkgs.system}.zctl-core";
        description = "The zctl-core package to use.";
      };

      port = lib.mkOption {
        type = lib.types.port;
        default = 3000;
        description = "Port the server listens on.";
      };

      host = lib.mkOption {
        type = lib.types.str;
        default = "0.0.0.0";
        description = "Address the server binds to.";
      };

      database.createLocally = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = ''
          Create a local PostgreSQL database automatically.
          The database is accessed via Unix socket peer authentication — no password required.
        '';
      };

      database.name = lib.mkOption {
        type = lib.types.str;
        default = "zctl";
        description = "Database name. Only used when createLocally = true.";
      };

      database.url = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = ''
          PostgreSQL connection URL. Required when createLocally = false.
          Ignored when createLocally = true (the URL is derived from the local socket).
        '';
      };

      jwtExpiryAgent = lib.mkOption {
        type = lib.types.str;
        default = "24h";
        description = "JWT expiry duration for agent tokens.";
      };

      jwtExpiryOperator = lib.mkOption {
        type = lib.types.str;
        default = "90d";
        description = "JWT expiry duration for operator tokens.";
      };

      execTimeoutMs = lib.mkOption {
        type = lib.types.ints.positive;
        default = 10000;
        description = "Maximum execution time for remote commands, in milliseconds.";
      };

      environmentFile = lib.mkOption {
        type = lib.types.nullOr lib.types.path;
        default = null;
        description = ''
          Path to a file containing additional environment variables.
          JWT_SECRET (≥ 32 chars) must be present here or in the environment.
          Values here override module-derived settings.
          Compatible with agenix, sops-nix, and similar secret managers.
        '';
      };

      openFirewall = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Open the firewall for the configured port.";
      };

      user = lib.mkOption {
        type = lib.types.str;
        default = "zctl-core";
        description = "System user the service runs as. Also used as the PostgreSQL role when createLocally = true.";
      };

      group = lib.mkOption {
        type = lib.types.str;
        default = "zctl-core";
        description = "System group the service runs as.";
      };
    };

    services.zctl.agents = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule {
        options = {
          enable = lib.mkEnableOption "zctl agent";

          package = lib.mkOption {
            type = lib.types.package;
            default = self.packages.${pkgs.system}.zctl-agent;
            defaultText = lib.literalExpression "zctl.packages.\${pkgs.system}.zctl-agent";
            description = "The zctl-agent package to use.";
          };

          coreUrl = lib.mkOption {
            type = lib.types.str;
            default = "http://localhost:3000";
            description = "HTTP URL of the zctl core server.";
          };

          hostname = lib.mkOption {
            type = lib.types.str;
            default = config.networking.hostName;
            defaultText = lib.literalExpression "config.networking.hostName";
            description = "Name this machine registers under. Defaults to the system hostname.";
          };
        };
      });
      default = { };
      description = "zctl agent instances, one systemd unit per entry.";
      example = lib.literalExpression ''
        {
          prod = { coreUrl = "https://zctl.example.com"; enable = true; };
          staging = { coreUrl = "https://zctl-staging.example.com"; enable = true; };
        }
      '';
    };

    programs.zctl = {
      enable = lib.mkEnableOption "zctl CLI";

      package = lib.mkOption {
        type = lib.types.package;
        default = self.packages.${pkgs.system}.zctl-cli;
        defaultText = lib.literalExpression "zctl.packages.\${pkgs.system}.zctl-cli";
        description = "The zctl-cli package to use.";
      };
    };
  };

  config = lib.mkMerge [
    (lib.mkIf core.enable {
      assertions = [{
        assertion = core.database.createLocally || core.database.url != "";
        message = "services.zctl.core.database.url must be set when database.createLocally = false.";
      }];

      users.users.${core.user} = {
        isSystemUser = true;
        group = core.group;
      };
      users.groups.${core.group} = { };

      services.postgresql = lib.mkIf core.database.createLocally {
        enable = true;
        ensureDatabases = [ core.database.name ];
        ensureUsers = [{
          name = core.user;
          ensureDBOwnership = true;
        }];
      };

      systemd.services.zctl-core = {
        description = "zctl core server";
        after = [ "network.target" ] ++ lib.optional core.database.createLocally "postgresql.service";
        requires = lib.optional core.database.createLocally "postgresql.service";
        wantedBy = [ "multi-user.target" ];

        environment = {
          PORT = toString core.port;
          HOST = core.host;
          DATABASE_URL = effectiveDbUrl;
          JWT_EXPIRY_AGENT = core.jwtExpiryAgent;
          JWT_EXPIRY_OPERATOR = core.jwtExpiryOperator;
          EXEC_TIMEOUT_MS = toString core.execTimeoutMs;
        };

        serviceConfig = {
          ExecStartPre = "${core.package}/bin/zctl-core-migrate";
          ExecStart = "${core.package}/bin/zctl-core";
          User = core.user;
          Group = core.group;
          Restart = "on-failure";
          RestartSec = "5s";
          NoNewPrivileges = true;
          ProtectSystem = "strict";
          ProtectHome = true;
          PrivateTmp = true;
          PrivateDevices = true;
        } // lib.optionalAttrs (core.environmentFile != null) {
          EnvironmentFile = core.environmentFile;
        };
      };

      networking.firewall.allowedTCPPorts = lib.mkIf core.openFirewall [ core.port ];
    })

    (lib.mkMerge (lib.mapAttrsToList (name: cfg:
      lib.mkIf cfg.enable {
        systemd.services."zctl-agent-${name}" = {
          description = "zctl agent (${name})";
          after = [ "network-online.target" ];
          wants = [ "network-online.target" ];
          wantedBy = [ "multi-user.target" ];

          environment = {
            CORE_URL = cfg.coreUrl;
            HOSTNAME = cfg.hostname;
          };

          serviceConfig = {
            ExecStart = "${cfg.package}/bin/zctl-agent";
            # Agent runs sh -c <command> for every remote exec request, so it needs
            # broad access. Tighten User/Group to restrict which commands are meaningful.
            User = "root";
            Restart = "on-failure";
            RestartSec = "5s";
          };
        };
      }
    ) agents))

    (lib.mkIf cli.enable {
      environment.systemPackages = [ cli.package ];
    })
  ];
}
