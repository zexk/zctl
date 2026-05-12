package exec

import (
	"bytes"
	"os/exec"
)

type Result struct {
	ExitCode int
	Stdout   string
	Stderr   string
}

func Run(command string) (*Result, error) {
	cmd := exec.Command("sh", "-c", command)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if cmd.ProcessState != nil {
			exitCode = cmd.ProcessState.ExitCode()
		} else {
			return nil, err
		}
	}

	return &Result{
		ExitCode: exitCode,
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
	}, nil
}
