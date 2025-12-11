import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
import { Loader2, Upload, Link, RotateCcw, Save, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SkinViewer } from "@/components/skin/SkinViewer"
import { cn } from "@/lib/utils"

interface MinecraftSkin {
    id: string
    state: string
    url: string
    variant: string
}

interface MinecraftCape {
    id: string
    state: string
    url: string
    alias: string
}

interface MinecraftProfile {
    id: string
    name: string
    skins: MinecraftSkin[]
    capes: MinecraftCape[]
}

export default function SkinManager() {
    const [profile, setProfile] = useState<MinecraftProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    // Form state
    const [mode, setMode] = useState<'upload' | 'url'>('upload')
    const [variant, setVariant] = useState<'classic' | 'slim'>('classic')
    const [url, setUrl] = useState("")
    const [filePath, setFilePath] = useState<string | null>(null)

    // Preview state
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewCape, setPreviewCape] = useState<string | null>(null)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const prof = await invoke<MinecraftProfile>("get_minecraft_profile")
            setProfile(prof)

            const activeSkin = prof.skins.find(s => s.state === 'ACTIVE')
            if (activeSkin) {
                setPreviewUrl(activeSkin.url)
                setVariant(activeSkin.variant === 'CLASSIC' ? 'classic' : 'slim')
            }

            const activeCape = prof.capes.find(c => c.state === 'ACTIVE')
            if (activeCape) {
                setPreviewCape(activeCape.url)
            } else {
                setPreviewCape(null)
            }
        } catch (err) {
            console.error(err)
            toast.error("Failed to load profile")
        } finally {
            setLoading(false)
        }
    }

    const handleSelectFile = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Image',
                    extensions: ['png']
                }]
            })

            if (selected) {
                setFilePath(selected as string)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleSave = async () => {
        if (!profile) return
        setProcessing(true)

        try {
            if (mode === 'upload') {
                if (!filePath) {
                    toast.error("Please select a file")
                    return
                }
                await invoke("upload_skin", { filePath, variant })
                toast.success("Skin uploaded successfully")
            } else {
                if (!url) {
                    toast.error("Please enter a URL")
                    return
                }
                await invoke("change_skin_url", { url, variant })
                toast.success("Skin updated successfully")
            }

            // Refresh profile to get new skin URL (might take a moment to propagate)
            setTimeout(loadProfile, 1000)
        } catch (err: any) {
            toast.error(err.message || "Failed to update skin")
        } finally {
            setProcessing(false)
        }
    }

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset your skin?")) return
        setProcessing(true)
        try {
            await invoke("reset_skin")
            toast.success("Skin reset successfully")
            setTimeout(loadProfile, 1000)
        } catch (err: any) {
            toast.error(err.message || "Failed to reset skin")
        } finally {
            setProcessing(false)
        }
    }

    const handleEquipCape = async (capeId: string) => {
        setProcessing(true)
        try {
            await invoke("change_active_cape", { capeId })
            toast.success("Cape equipped successfully")
            loadProfile()
        } catch (err: any) {
            toast.error(err.message || "Failed to equip cape")
        } finally {
            setProcessing(false)
        }
    }



    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    if (!profile) return <div className="p-8 text-center">Please login first.</div>

    return (
        <div className="container max-w-4xl mx-auto space-y-8 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Skin Manager</h1>
                    <p className="text-muted-foreground">Manage your Minecraft skin for {profile.name}</p>
                </div>
                <Button variant="outline" onClick={handleReset} disabled={processing}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Default
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Preview Section */}
                <Card className="md:row-span-2">
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center bg-secondary/20 min-h-[400px] items-center p-0 overflow-hidden relative">
                        {previewUrl ? (
                            <SkinViewer
                                skinUrl={previewUrl}
                                model={variant}
                                capeUrl={previewCape || undefined}
                            />
                        ) : (
                            <div className="text-muted-foreground">No skin loaded</div>
                        )}
                        {/* Note: I need to update SkinViewer to accept capeUrl if I want to show it in 3D */}
                    </CardContent>
                    <CardFooter className="justify-center text-sm text-muted-foreground pt-4">
                        {variant === 'classic' ? 'Classic (Steve)' : 'Slim (Alex)'} Model
                    </CardFooter>
                </Card>

                {/* Skins List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Skins</CardTitle>
                        <CardDescription>Your current skins</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            {profile.skins.map((skin) => (
                                <div
                                    key={skin.id}
                                    className={cn(
                                        "relative border rounded-lg p-2 cursor-pointer transition-all hover:bg-secondary/50",
                                        skin.state === 'ACTIVE' ? "ring-2 ring-primary border-primary bg-secondary/20" : "border-border"
                                    )}
                                    onClick={() => {
                                        setPreviewUrl(skin.url)
                                        setVariant(skin.variant === 'CLASSIC' ? 'classic' : 'slim')
                                    }}
                                >
                                    <div className="aspect-square bg-secondary/20 rounded-md overflow-hidden mb-2">
                                        <img src={skin.url} alt="Skin" className="w-full h-full object-contain pixelated" style={{ imageRendering: 'pixelated' }} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium capitalize">{skin.variant.toLowerCase()}</span>
                                        {skin.state === 'ACTIVE' && <Check className="h-3 w-3 text-primary" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Capes List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Capes</CardTitle>
                        <CardDescription>Select a cape to equip</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {profile.capes.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No capes available</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {profile.capes.map((cape) => (
                                    <div
                                        key={cape.id}
                                        className={cn(
                                            "relative border rounded-lg p-2 cursor-pointer transition-all hover:bg-secondary/50",
                                            cape.state === 'ACTIVE' ? "ring-2 ring-primary border-primary bg-secondary/20" : "border-border"
                                        )}
                                        onClick={() => handleEquipCape(cape.id)}
                                    >
                                        <div className="aspect-[2/3] bg-secondary/20 rounded-md overflow-hidden mb-2 flex items-center justify-center">
                                            {/* Cape preview is tricky without a 3D viewer or specific crop. 
                                                Usually capes are textures. We can try to show the texture. */}
                                            <img src={cape.url} alt={cape.alias} className="w-full h-full object-contain pixelated" style={{ imageRendering: 'pixelated' }} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium truncate" title={cape.alias}>{cape.alias}</span>
                                            {cape.state === 'ACTIVE' && <Check className="h-3 w-3 text-primary" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upload Controls */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Upload New Skin</CardTitle>
                        <CardDescription>Choose how you want to update your skin</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>Model Type</Label>
                            <RadioGroup value={variant} onValueChange={(v) => setVariant(v as any)} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="classic" id="classic" />
                                    <Label htmlFor="classic">Classic (Steve)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="slim" id="slim" />
                                    <Label htmlFor="slim">Slim (Alex)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-3">
                            <Label>Update Method</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={mode === 'upload' ? 'default' : 'outline'}
                                    onClick={() => setMode('upload')}
                                    className="flex-1"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload File
                                </Button>
                                <Button
                                    variant={mode === 'url' ? 'default' : 'outline'}
                                    onClick={() => setMode('url')}
                                    className="flex-1"
                                >
                                    <Link className="mr-2 h-4 w-4" />
                                    From URL
                                </Button>
                            </div>
                        </div>

                        {mode === 'upload' ? (
                            <div className="space-y-3">
                                <Label>Skin File</Label>
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={handleSelectFile} className="w-full">
                                        {filePath ? 'Change File' : 'Select Skin File'}
                                    </Button>
                                </div>
                                {filePath && <p className="text-xs text-muted-foreground truncate">{filePath}</p>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Label>Skin URL</Label>
                                <Input
                                    placeholder="https://..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSave} disabled={processing} className="w-full">
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Update Skin
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
