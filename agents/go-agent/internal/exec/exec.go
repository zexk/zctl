package exec

import (
	"bytes"
	"os/exec"
)

type Result struct {
	ExitCode int    `json:"exitCode"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
}

func Run(command string) *Result {
	cmd := exec.Command("sh", "-c", command)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	exitCode := 0
	if err := cmd.Run(); err != nil {
		if cmd.ProcessState != nil {
			exitCode = cmd.ProcessState.ExitCode()
		} else {
			exitCode = 1
		}
	}

	return &Result{
		ExitCode: exitCode,
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
	}
}
