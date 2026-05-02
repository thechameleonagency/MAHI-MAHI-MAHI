from pathlib import Path
path = Path("src/pages/ProjectDetail.tsx")
text = path.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)
# Lines 1-based: progress report closes after ProgressReportTab />. Find line index of "          />" after onUpdateTimeline closing
# Insert after the line that contains only "          />" following ProgressReportTab block - look for unique pattern
needle = "          />\n        </TabsContent>\n        )}\n\n        {/* Overview Tab */}"
repl = "          />\n\n          <div className=\"mt-10 pt-8 border-t border-border space-y-6\">\n            <p className=\"text-sm font-medium text-muted-foreground uppercase tracking-wide\">\n              Operational snapshot\n            </p>\n"
# snapshot = lines from index of '            {/* Project Info */}' until Site Photos </Card> inclusive - 0-based
start = None
end = None
for i, ln in enumerate(lines):
    if ln.strip() == "{/* Project Info */}" and start is None:
        start = i
    if start is not None and "</Card>" in ln and "Site Photos" in "".join(lines[max(0,i-15):i]):
        # naive - find closing card after site photos block
        pass
