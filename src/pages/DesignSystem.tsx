import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Palette, 
  Type, 
  Square, 
  Layout, 
  Layers,
  Sun,
  Moon,
  Copy,
  Check,
  FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { PageShell } from "@/components/layout/PageShell";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function DesignSystem({ embedded = false }: { embedded?: boolean }) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const colorTokens = {
    light: [
      { name: "Canvas", var: "--canvas", hsl: "220 18% 97%", hex: "#F3F4F6" },
      { name: "Background", var: "--background", hsl: "220 18% 97%", hex: "#F3F4F6" },
      { name: "Foreground", var: "--foreground", hsl: "222 20% 18%", hex: "#242B38" },
      { name: "Card", var: "--card", hsl: "0 0% 100%", hex: "#FFFFFF" },
      { name: "Primary", var: "--primary", hsl: "221 70% 44%", hex: "#1E6FD4" },
      { name: "Primary Foreground", var: "--primary-foreground", hsl: "0 0% 100%", hex: "#FFFFFF" },
      { name: "Secondary", var: "--secondary", hsl: "220 16% 94%", hex: "#ECEEF2" },
      { name: "Muted", var: "--muted", hsl: "220 16% 94%", hex: "#ECEEF2" },
      { name: "Muted Foreground", var: "--muted-foreground", hsl: "220 10% 44%", hex: "#6B7484" },
      { name: "Accent (neutral)", var: "--accent", hsl: "220 20% 93%", hex: "#E6E9EF" },
      { name: "Tint (soft)", var: "--tint", hsl: "255 30% 96%", hex: "#F4F1FA" },
      { name: "Success", var: "--success", hsl: "142 76% 36%", hex: "#178C47" },
      { name: "Warning", var: "--warning", hsl: "38 92% 48%", hex: "#E6A200" },
      { name: "Destructive", var: "--destructive", hsl: "0 72% 48%", hex: "#D72638" },
      { name: "Border", var: "--border", hsl: "220 14% 88%", hex: "#D9DEE6" },
      { name: "Ring", var: "--ring", hsl: "221 60% 50%", hex: "#2A7AE8" },
    ],
    dark: [
      { name: "Canvas", var: "--canvas", hsl: "222 20% 9%", hex: "#11161E" },
      { name: "Background", var: "--background", hsl: "222 20% 10%", hex: "#121820" },
      { name: "Foreground", var: "--foreground", hsl: "210 40% 98%", hex: "#F8FAFC" },
      { name: "Card", var: "--card", hsl: "222 20% 14%", hex: "#1A2230" },
      { name: "Primary", var: "--primary", hsl: "218 80% 58%", hex: "#3B8FF6" },
      { name: "Muted", var: "--muted", hsl: "217 20% 20%", hex: "#2A3140" },
      { name: "Muted Foreground", var: "--muted-foreground", hsl: "215 20% 65%", hex: "#94A3B8" },
      { name: "Accent", var: "--accent", hsl: "217 25% 22%", hex: "#2C3548" },
      { name: "Tint", var: "--tint", hsl: "260 20% 18%", hex: "#2A2436" },
      { name: "Border", var: "--border", hsl: "217 20% 24%", hex: "#2E3A4A" },
    ],
  };

  const typographyScale = [
    { name: "Display XL", class: "text-4xl", size: "36px", weight: "700" },
    { name: "Display", class: "text-3xl", size: "30px", weight: "600" },
    { name: "Heading 1", class: "text-2xl", size: "24px", weight: "600" },
    { name: "Heading 2", class: "text-xl", size: "20px", weight: "600" },
    { name: "Heading 3", class: "text-lg", size: "18px", weight: "500" },
    { name: "Body Large", class: "text-base", size: "16px", weight: "400" },
    { name: "Body", class: "text-sm", size: "14px", weight: "400" },
    { name: "Caption", class: "text-xs", size: "12px", weight: "400" },
  ];

  const spacingScale = [
    { name: "0", value: "0px" },
    { name: "0.5", value: "2px" },
    { name: "1", value: "4px" },
    { name: "2", value: "8px" },
    { name: "3", value: "12px" },
    { name: "4", value: "16px" },
    { name: "5", value: "20px" },
    { name: "6", value: "24px" },
    { name: "8", value: "32px" },
    { name: "10", value: "40px" },
    { name: "12", value: "48px" },
    { name: "16", value: "64px" },
  ];

  const radiusScale = [
    { name: "none", value: "0px", class: "rounded-none" },
    { name: "sm", value: "4px", class: "rounded-sm" },
    { name: "md", value: "8px", class: "rounded-md" },
    { name: "lg", value: "12px", class: "rounded-lg" },
    { name: "xl", value: "16px", class: "rounded-xl" },
    { name: "full", value: "9999px", class: "rounded-full" },
  ];

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(name);
    setTimeout(() => setCopiedColor(null), 2000);
    toast({ title: "Copied!", description: `${name} copied to clipboard` });
  };

  const exportToPDF = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    toast({ title: "Generating PDF...", description: "Please wait while we create your design system document." });

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Title Page
      pdf.setFontSize(28);
      pdf.setTextColor(30, 99, 210); // Primary (blue) — CTA and brand emphasis
      pdf.text("Mahi Solar", pageWidth / 2, 60, { align: 'center' });
      
      pdf.setFontSize(20);
      pdf.setTextColor(42, 51, 66);
      pdf.text("Design System", pageWidth / 2, 75, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(115, 123, 140);
      pdf.text("Version 1.0 | " + new Date().toLocaleDateString(), pageWidth / 2, 90, { align: 'center' });

      // Brand Identity
      pdf.addPage();
      yPos = margin;
      
      pdf.setFontSize(18);
      pdf.setTextColor(30, 99, 210);
      pdf.text("1. Brand Identity", margin, yPos);
      yPos += 15;

      pdf.setFontSize(11);
      pdf.setTextColor(42, 51, 66);
      pdf.text("Primary Font: Lexend (weights: 300-700)", margin, yPos);
      yPos += 8;
      pdf.text("Primary (CTA / links): Blue (#1E6FD4 / HSL 221 70% 44%)", margin, yPos);
      yPos += 8;
      pdf.text("Industry: Solar Energy / Renewable Energy", margin, yPos);

      // Color Palette
      yPos += 20;
      pdf.setFontSize(18);
      pdf.setTextColor(30, 99, 210);
      pdf.text("2. Color Palette", margin, yPos);
      yPos += 12;

      pdf.setFontSize(10);
      pdf.setTextColor(42, 51, 66);

      // Light Mode Colors
      pdf.setFontSize(12);
      pdf.text("Light Mode", margin, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      colorTokens.light.slice(0, 10).forEach((color, idx) => {
        pdf.text(`${color.name}: ${color.hsl} (${color.hex})`, margin + 5, yPos);
        yPos += 6;
      });

      // Typography
      pdf.addPage();
      yPos = margin;
      
      pdf.setFontSize(18);
      pdf.setTextColor(30, 99, 210);
      pdf.text("3. Typography Scale", margin, yPos);
      yPos += 15;

      pdf.setFontSize(9);
      pdf.setTextColor(42, 51, 66);
      typographyScale.forEach((type) => {
        pdf.text(`${type.name}: ${type.size} / weight ${type.weight} (${type.class})`, margin, yPos);
        yPos += 7;
      });

      // Spacing
      yPos += 15;
      pdf.setFontSize(18);
      pdf.setTextColor(30, 99, 210);
      pdf.text("4. Spacing Scale", margin, yPos);
      yPos += 12;

      pdf.setFontSize(9);
      pdf.setTextColor(42, 51, 66);
      spacingScale.forEach((space) => {
        pdf.text(`${space.name}: ${space.value}`, margin, yPos);
        yPos += 5;
      });

      // Border Radius
      pdf.addPage();
      yPos = margin;
      
      pdf.setFontSize(18);
      pdf.setTextColor(30, 99, 210);
      pdf.text("5. Border Radius", margin, yPos);
      yPos += 12;

      pdf.setFontSize(9);
      pdf.setTextColor(42, 51, 66);
      radiusScale.forEach((radius) => {
        pdf.text(`${radius.name}: ${radius.value} (${radius.class})`, margin, yPos);
        yPos += 6;
      });

      // Components
      yPos += 15;
      pdf.setFontSize(18);
      pdf.setTextColor(30, 99, 210);
      pdf.text("6. Core Components", margin, yPos);
      yPos += 12;

      pdf.setFontSize(10);
      pdf.setTextColor(42, 51, 66);
      
      const components = [
        "Button: 6 variants (default, destructive, outline, secondary, ghost, link)",
        "Badge: 4 variants (default, secondary, destructive, outline)",
        "Card: CardHeader, CardContent, CardFooter",
        "Input: Height 40px, border-radius md",
        "Avatar: Sizes sm (32px), default (40px), lg (48px)",
        "Tabs: TabsList, TabsTrigger, TabsContent",
        "Dialog: DialogContent, DialogHeader, DialogFooter",
        "Table: TableHeader, TableBody, TableRow, TableCell",
      ];

      components.forEach((comp) => {
        pdf.text(`• ${comp}`, margin, yPos);
        yPos += 7;
      });

      // Save
      pdf.save("mahi-solar-design-system.pdf");
      
      toast({ 
        title: "PDF Exported!", 
        description: "Design system document has been downloaded." 
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ 
        title: "Export Failed", 
        description: "Could not generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const inner = (
    <div ref={contentRef} className="mx-auto w-full max-w-6xl space-y-8">
      {!embedded ? (
        <StickyPageHeader
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Design system" }]}
          subRow={
            <InlineKpiStrip
              className="w-full flex-wrap justify-start"
              items={[
                { label: "Color tokens", value: colorTokens.light.length + colorTokens.dark.length },
                { label: "Type steps", value: typographyScale.length },
                { label: "Spacing steps", value: spacingScale.length },
              ]}
            />
          }
        >
          <Button size="sm" onClick={exportToPDF} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <>…</>
            ) : (
              <>
                <Download className="h-4 w-4" />
                PDF
              </>
            )}
          </Button>
        </StickyPageHeader>
      ) : (
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Design system</h2>
            <p className="text-xs text-muted-foreground">Tokens and UI reference (prototype).</p>
          </div>
          <Button size="sm" onClick={exportToPDF} disabled={isExporting} className="gap-2 shrink-0">
            {isExporting ? <>…</> : (<><Download className="h-4 w-4" />Export PDF</>)}
          </Button>
        </div>
      )}

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="colors" className="gap-2">
              <Palette className="h-4 w-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="typography" className="gap-2">
              <Type className="h-4 w-4" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="spacing" className="gap-2">
              <Layout className="h-4 w-4" />
              Spacing
            </TabsTrigger>
            <TabsTrigger value="components" className="gap-2">
              <Layers className="h-4 w-4" />
              Components
            </TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="mt-6 space-y-6">
            {/* Light Mode */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-warning" />
                  <CardTitle>Light Mode</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {colorTokens.light.map((color) => (
                    <div
                      key={color.var}
                      className="group cursor-pointer"
                      onClick={() => copyToClipboard(color.hsl, color.name)}
                    >
                      <div
                        className="h-16 rounded-lg border border-border mb-2 flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: color.hex }}
                      >
                        {copiedColor === color.name ? (
                          <Check className="h-5 w-5 text-white drop-shadow-md" />
                        ) : (
                          <Copy className="h-4 w-4 text-white/0 group-hover:text-white/80 drop-shadow-md transition-colors" />
                        )}
                      </div>
                      <p className="text-xs font-medium">{color.name}</p>
                      <p className="text-2xs text-muted-foreground">{color.hex}</p>
                      <p className="text-2xs text-muted-foreground font-mono">{color.var}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dark Mode */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-primary" />
                  <CardTitle>Dark Mode</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {colorTokens.dark.map((color) => (
                    <div
                      key={color.var}
                      className="group cursor-pointer"
                      onClick={() => copyToClipboard(color.hsl, color.name)}
                    >
                      <div
                        className="h-16 rounded-lg border border-border mb-2 flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: color.hex }}
                      >
                        {copiedColor === color.name ? (
                          <Check className="h-5 w-5 text-white drop-shadow-md" />
                        ) : (
                          <Copy className="h-4 w-4 text-white/0 group-hover:text-white/80 drop-shadow-md transition-colors" />
                        )}
                      </div>
                      <p className="text-xs font-medium">{color.name}</p>
                      <p className="text-2xs text-muted-foreground">{color.hex}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Typography Scale</CardTitle>
                <CardDescription>Font: Lexend (weights 300-700)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {typographyScale.map((type) => (
                  <div key={type.name} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <p className={`${type.class} font-medium`}>
                        {type.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {type.size} / weight {type.weight}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {type.class}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spacing Tab */}
          <TabsContent value="spacing" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Spacing Scale</CardTitle>
                <CardDescription>Base unit: 4px (Tailwind default)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {spacingScale.map((space) => (
                    <div key={space.name} className="flex items-center gap-4">
                      <Badge variant="outline" className="w-12 justify-center font-mono">
                        {space.name}
                      </Badge>
                      <div
                        className="h-6 bg-chart-info rounded"
                        style={{ width: space.value }}
                      />
                      <span className="text-sm text-muted-foreground">{space.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Border Radius</CardTitle>
                <CardDescription>--radius: 0.5rem (8px)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {radiusScale.map((radius) => (
                    <div key={radius.name} className="text-center">
                      <div
                        className={`h-16 w-16 mx-auto bg-chart-info mb-2 ${radius.class}`}
                      />
                      <p className="text-xs font-medium">{radius.name}</p>
                      <p className="text-2xs text-muted-foreground">{radius.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="mt-6 space-y-6">
            {/* Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>6 variants, 4 sizes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <Separator />
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><FileText className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card>
              <CardHeader>
                <CardTitle>Badges</CardTitle>
                <CardDescription>4 variants + semantic status colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-success text-success-foreground">Success</Badge>
                  <Badge className="bg-warning text-warning-foreground">Warning</Badge>
                  <Badge className="bg-primary/10 text-primary border border-primary/20">Primary Soft</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Inputs & Form Elements */}
            <Card>
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Input</Label>
                    <Input placeholder="Enter text..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Disabled Input</Label>
                    <Input placeholder="Disabled" disabled />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <Checkbox id="check1" />
                    <Label htmlFor="check1">Checkbox</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="switch1" />
                    <Label htmlFor="switch1">Switch</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avatars & Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Avatars & Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>MD</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>LG</AvatarFallback>
                  </Avatar>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} />
                </div>
              </CardContent>
            </Card>

            {/* Cards */}
            <Card>
              <CardHeader>
                <CardTitle>Card Component</CardTitle>
                <CardDescription>Standard card with header, content, and optional footer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-muted/50">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Nested Card</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <p className="text-xs text-muted-foreground">Card content goes here</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60 bg-tint">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-foreground">Tint surface</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <p className="text-xs text-muted-foreground">Secondary panels use tint / muted, not more blue</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );

  if (embedded) return inner;
  return <PageShell>{inner}</PageShell>;
}

export default DesignSystem;
