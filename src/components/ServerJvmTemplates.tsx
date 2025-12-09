import { useState, useMemo } from "react"
import { Server, Zap, Rocket, Cpu, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ServerJvmTemplate {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  getArgs: (ramMb: number) => string
  recommended?: (ramMb: number) => boolean
}

interface ServerJvmTemplatesProps {
  value: string
  onChange: (value: string) => void
  ramMb: number
}

// Aikar's flags - the gold standard for Paper/Spigot servers
const getAikarFlags = (ramMb: number): string => {
  const g1NewSize = ramMb >= 12288 ? 40 : 30
  const g1MaxNewSize = ramMb >= 12288 ? 50 : 40
  const g1HeapRegion = ramMb >= 12288 ? "16M" : "8M"
  const g1Reserve = ramMb >= 12288 ? 20 : 15
  const g1MixedGCCount = ramMb >= 12288 ? 4 : 8
  const initiatingHeap = ramMb >= 12288 ? 15 : 20

  return `-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=${g1NewSize} -XX:G1MaxNewSizePercent=${g1MaxNewSize} -XX:G1HeapRegionSize=${g1HeapRegion} -XX:G1ReservePercent=${g1Reserve} -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=${g1MixedGCCount} -XX:InitiatingHeapOccupancyPercent=${initiatingHeap} -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true`
}

// Server-specific JVM templates
const serverTemplates: ServerJvmTemplate[] = [
  {
    id: "aikar",
    name: "Aikar's Flags",
    icon: <Rocket className="h-4 w-4" />,
    description: "Flags optimises par Aikar - recommande pour Paper/Spigot/Purpur",
    recommended: (ram) => ram >= 4096,
    getArgs: getAikarFlags,
  },
  {
    id: "basic",
    name: "Basic G1GC",
    icon: <Server className="h-4 w-4" />,
    description: "Configuration de base pour petits serveurs (< 10 joueurs)",
    recommended: (ram) => ram < 4096,
    getArgs: () => {
      return `-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC`
    },
  },
  {
    id: "zgc",
    name: "ZGC (Java 17+)",
    icon: <Zap className="h-4 w-4" />,
    description: "Garbage Collector a faible latence pour serveurs haute performance",
    recommended: () => false,
    getArgs: () => {
      return `-XX:+UseZGC -XX:+ZGenerational -XX:+AlwaysPreTouch -XX:+DisableExplicitGC -XX:+PerfDisableSharedMem`
    },
  },
  {
    id: "graalvm",
    name: "GraalVM",
    icon: <Cpu className="h-4 w-4" />,
    description: "Optimise pour GraalVM avec compilation JIT avancee",
    recommended: () => false,
    getArgs: () => {
      return `-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:+EnableJVMCI -XX:+UseJVMCICompiler`
    },
  },
]

// Tips based on RAM
const getServerRamTips = (ramMb: number): string => {
  if (ramMb < 2048) {
    return "Moins de 2GB: suffisant pour un petit serveur vanilla avec peu de joueurs."
  }
  if (ramMb <= 4096) {
    return "2-4GB: ideal pour un serveur vanilla/Paper avec 5-15 joueurs."
  }
  if (ramMb <= 8192) {
    return "4-8GB: parfait pour un serveur avec plugins et 15-30 joueurs."
  }
  if (ramMb <= 12288) {
    return "8-12GB: recommande pour serveurs avec beaucoup de plugins et 30-50 joueurs."
  }
  return "Plus de 12GB: utilisez les flags Aikar 12GB+ pour eviter les pauses GC."
}

export function ServerJvmTemplates({ value, onChange, ramMb }: ServerJvmTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Find the recommended template
  const recommendedTemplate = useMemo(() => {
    return serverTemplates.find(t => t.recommended?.(ramMb))?.id || "aikar"
  }, [ramMb])

  const handleSelectTemplate = (template: ServerJvmTemplate) => {
    const args = template.getArgs(ramMb)
    onChange(args)
    setSelectedTemplate(template.id)
  }

  const ramTips = getServerRamTips(ramMb)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Arguments JVM du serveur</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Aide
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <p className="text-sm">{ramTips}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Template buttons */}
      <div className="grid grid-cols-2 gap-2">
        {serverTemplates.map((template) => {
          const isRecommended = template.id === recommendedTemplate
          const isSelected = selectedTemplate === template.id

          return (
            <TooltipProvider key={template.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      "justify-start gap-2 h-auto py-2",
                      isRecommended && !isSelected && "border-green-500/50 text-green-600"
                    )}
                  >
                    {template.icon}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {template.name}
                        {isRecommended && (
                          <span className="ml-1 text-xs text-green-500">*</span>
                        )}
                      </span>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-sm">{template.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>

      {/* Current RAM info */}
      <p className="text-xs text-muted-foreground">
        * Recommande pour {ramMb >= 1024 ? `${(ramMb / 1024).toFixed(1)}GB` : `${ramMb}MB`} de RAM
      </p>

      {/* Textarea for manual editing */}
      <Textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setSelectedTemplate(null)
        }}
        placeholder="Arguments JVM personnalises ou selectionnez un template ci-dessus"
        className="font-mono text-xs h-24 resize-none"
      />

      {/* Quick explanation */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Aikar's Flags:</strong> Le standard pour Paper/Spigot, optimise par la communaute</p>
        <p><strong>ZGC:</strong> Excellent pour les gros serveurs, necessite Java 17+</p>
        <p><strong>-Xms/-Xmx:</strong> Sont geres automatiquement par le launcher</p>
      </div>
    </div>
  )
}
