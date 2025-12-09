import { useState, useEffect } from "react"
import { AlertTriangle, User } from "lucide-react"
import { useTranslation } from "@/i18n"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  onConfirm: () => void
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  username,
  onConfirm,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation()
  const [confirmText, setConfirmText] = useState("")
  const confirmPhrase = username

  useEffect(() => {
    if (!open) {
      setConfirmText("")
    }
  }, [open])

  const isConfirmValid = confirmText === confirmPhrase

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("dialogs.deleteAccount.title")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("dialogs.deleteAccount.deleteMessage", { username })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{username}</p>
              <p className="text-xs text-muted-foreground">{t("dialogs.deleteAccount.willBeDisconnected")}</p>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              {t("dialogs.deleteAccount.typeToConfirm")}
            </p>
            <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded mt-2 select-all">
              {confirmPhrase}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-input">{t("dialogs.deleteAccount.confirmation")}</Label>
            <Input
              id="confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("dialogs.deleteAccount.typeAccountName")}
              className={confirmText && !isConfirmValid ? "border-destructive" : ""}
            />
            {confirmText && !isConfirmValid && (
              <p className="text-xs text-destructive">
                {t("dialogs.deleteAccount.noMatch")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid}
          >
            {t("dialogs.deleteAccount.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
