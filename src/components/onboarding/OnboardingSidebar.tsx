import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeCustomizer } from "@/components/theme/ThemeCustomizer";
import { useTranslation } from "@/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OnboardingSidebarProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingSidebar({ open, onComplete }: OnboardingSidebarProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] flex flex-col">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <SheetTitle className="text-xl">
              {t("onboarding.welcome")}
            </SheetTitle>
            <SheetDescription className="mt-2">
              {t("onboarding.subtitle")}
            </SheetDescription>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 my-6 -mx-6 px-6">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              {t("onboarding.selectTheme")}
            </p>
            <ThemeCustomizer />
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button onClick={onComplete} className="w-full" size="lg">
            {t("onboarding.complete")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
