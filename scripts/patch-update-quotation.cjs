const fs = require("fs");
const p = "src/contexts/AppDataContext.tsx";
let s = fs.readFileSync(p, "utf8");
const start = "  const updateQuotation = useCallback((id: string, updates: Partial<Quotation>) => {";
const end = "  }, []);";
const i = s.indexOf(start);
if (i < 0) {
  console.error("start not found");
  process.exit(1);
}
const j = s.indexOf(end, i);
if (j < 0) {
  console.error("end not found");
  process.exit(1);
}
const newBlock = `  const updateQuotation = useCallback(
    async (id: string, updates: Partial<Quotation>): Promise<{ ok: boolean; error?: string }> => {
      if (!permissionService.canPerformAction(actorRole, "quotation:create")) {
        return { ok: false, error: \`Role \${actorRole} is not allowed to update quotations\` };
      }
      repositories.quotationRepository.replaceAll(state.quotations);
      try {
        const result = await commandBus.execute({
          type: UPDATE_QUOTATION_COMMAND,
          actorUserId: "prototype-user",
          actorRole,
          payload: { quotationId: id, updates },
        });
        if (!result.ok) {
          return { ok: false, error: result.message };
        }
        setState((prev) => ({
          ...prev,
          quotations: repositories.quotationRepository.getAll() as Quotation[],
          auditLogs: repositories.auditRepository.getAll() as AuditLogEntry[],
        }));
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Command failed";
        return { ok: false, error: message };
      }
    },
    [actorRole, commandBus, permissionService, repositories, state.quotations],
  );`;
s = s.slice(0, i) + newBlock + s.slice(j + end.length);
fs.writeFileSync(p, s);
console.log("patched", i, j);
