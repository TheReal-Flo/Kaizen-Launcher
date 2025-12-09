import { Minus, Square, X } from "lucide-react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { Button } from "@/components/ui/button"

export function TitleBar() {
  const handleMinimize = async () => {
    const appWindow = getCurrentWindow()
    await appWindow.minimize()
  }
  const handleMaximize = async () => {
    const appWindow = getCurrentWindow()
    await appWindow.toggleMaximize()
  }
  const handleClose = async () => {
    const appWindow = getCurrentWindow()
    await appWindow.close()
  }

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between bg-background border-b select-none"
    >
      {/* Logo and title */}
      <div className="flex items-center gap-2 px-3" data-tauri-drag-region>
        <img
          src="/minecraft-icon.svg"
          alt="Kaizen"
          className="w-4 h-4"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <span className="text-sm font-medium text-foreground/80">
          Kaizen Launcher
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Window controls */}
      <div className="flex">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none hover:bg-muted"
          onClick={handleMinimize}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none hover:bg-muted"
          onClick={handleMaximize}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
