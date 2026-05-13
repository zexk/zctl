package machine

import (
	"os"
	"runtime"
)

type Info struct {
	Hostname string
	OS       string
	Arch     string
}

func Collect(configuredHostname string) Info {
	hostname := configuredHostname
	if hostname == "" {
		if h, err := os.Hostname(); err == nil {
			hostname = h
		}
	}

	return Info{
		Hostname: hostname,
		OS:       runtime.GOOS,
		Arch:     runtime.GOARCH,
	}
}
