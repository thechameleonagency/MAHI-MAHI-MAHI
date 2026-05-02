const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modified = 0;
walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('@/components/ui/dialog') || filePath.includes('dialog.tsx')) {
      return;
    }

    let newContent = content.replace(/@\/components\/ui\/dialog/g, '@/components/ui/sheet');
    newContent = newContent.replace(/Dialog/g, 'Sheet');
    
    // Add sm:max-w-xl overflow-y-auto to SheetContent with className
    newContent = newContent.replace(/<SheetContent([^>]*)className="([^"]*)"/g, (match, p1, p2) => {
      let classes = p2;
      if (!classes.includes('overflow-y-auto')) {
        classes += ' overflow-y-auto custom-scrollbar';
      }
      if (!classes.includes('max-w-')) {
        classes += ' sm:max-w-xl';
      } else {
         classes = classes.replace(/\bmax-w-(md|lg|xl|2xl|3xl|4xl|5xl|full)\b/g, 'sm:max-w-$1');
      }
      return `<SheetContent${p1}className="${classes}"`;
    });
    
    // Add className to SheetContent without className
    newContent = newContent.replace(/<SheetContent(?!\s*[^>]*className=)([^>]*)>/g, '<SheetContent$1 className="sm:max-w-xl overflow-y-auto custom-scrollbar">');

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      modified++;
      console.log('Updated:', filePath);
    }
  }
});
console.log('Total files updated:', modified);
