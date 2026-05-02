import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, X } from "lucide-react";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  defaultFileName?: string;
}

export function ImageViewerModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  defaultFileName = "image" 
}: ImageViewerModalProps) {
  const [fileName, setFileName] = useState(defaultFileName);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${fileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AppSheetContent layout="bare" size="xl" className="max-w-3xl gap-0 overflow-hidden p-0">
        <div className="relative">
          {/* Close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Image */}
          <img 
            src={imageUrl} 
            alt="Preview" 
            className="w-full h-auto max-h-[70vh] object-contain bg-black/90" 
          />
        </div>
        
        {/* Download controls */}
        <div className="flex items-center gap-3 p-4 bg-background border-t">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">File Name</Label>
            <Input 
              value={fileName} 
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              className="h-9"
            />
          </div>
          <Button onClick={handleDownload} className="mt-5">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </AppSheetContent>
    </Sheet>
  );
}
