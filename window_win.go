//go:build windows

package main

import (
	"fmt"
	"syscall"
	"unsafe"
)

// Win32 calls for window style tweaks (hide from taskbar).
var (
	user32              = syscall.NewLazyDLL("user32.dll")
	procFindWindowW     = user32.NewProc("FindWindowW")
	procGetWindowLongW  = user32.NewProc("GetWindowLongW")
	procSetWindowLongW  = user32.NewProc("SetWindowLongW")
	procSetWindowPos    = user32.NewProc("SetWindowPos")
)

var (
	gwlExStyle int32 = -20
)

const (
	wsExToolWindow = 0x00000080
	wsExAppWindow  = 0x00040000

	swpNosize       = 0x0001
	swpNomove       = 0x0002
	swpNozorder     = 0x0004
	swpFrameChanged = 0x0020
)

func hideFromTaskbar(windowTitle string) error {
	titlePtr, err := syscall.UTF16PtrFromString(windowTitle)
	if err != nil {
		return err
	}
	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(titlePtr)))
	if hwnd == 0 {
		return fmt.Errorf("window not found")
	}
	style, _, _ := procGetWindowLongW.Call(hwnd, uintptr(gwlExStyle))
	newStyle := (style &^ wsExAppWindow) | wsExToolWindow
	procSetWindowLongW.Call(hwnd, uintptr(gwlExStyle), newStyle)
	procSetWindowPos.Call(
		hwnd,
		0,
		0,
		0,
		0,
		0,
		uintptr(swpNomove|swpNosize|swpNozorder|swpFrameChanged),
	)
	return nil
}
