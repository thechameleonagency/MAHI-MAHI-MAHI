import { createContext, useContext, useMemo, type ReactNode } from "react";
import { CommandBus } from "@/application/commands/CommandBus";
import { PermissionService } from "@/application/services/PermissionService";
import { AuditService } from "@/application/services/AuditService";
import { createPrototypeRepositoryContext } from "@/infrastructure/repositories/localStorage/createPrototypeRepositoryContext";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { runMigrations } from "@/infrastructure/migrations/migrationManager";
import { registerEnquiryCommands } from "@/application/commands/enquiry/registerEnquiryCommands";
import { getEnquiryCommandTeamMembers } from "@/lib/enquiryCommandTeamMembers";
import { registerQuotationCommands } from "@/application/commands/quotation/registerQuotationCommands";
import { registerProjectCommands } from "@/application/commands/project/registerProjectCommands";
import { registerInventoryCommands } from "@/application/commands/inventory/registerInventoryCommands";

type FoundationContextType = {
  commandBus: CommandBus;
  permissionService: PermissionService;
  auditService: AuditService;
  repositories: AppRepositoryContext;
};

const FoundationContext = createContext<FoundationContextType | undefined>(undefined);

export const FoundationProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<FoundationContextType>(() => {
    runMigrations();

    const repositories = createPrototypeRepositoryContext();
    const commandBus = new CommandBus();
    const permissionService = new PermissionService();
    const auditService = new AuditService({ auditRepository: repositories.auditRepository });
    registerEnquiryCommands(commandBus, repositories, permissionService, auditService, {
      getTeamMembers: getEnquiryCommandTeamMembers,
    });
    registerQuotationCommands(commandBus, repositories, permissionService, auditService);
    registerProjectCommands(commandBus, repositories, permissionService, auditService);
    registerInventoryCommands(commandBus, repositories, permissionService, auditService);

    return {
      commandBus,
      permissionService,
      auditService,
      repositories,
    };
  }, []);

  return <FoundationContext.Provider value={value}>{children}</FoundationContext.Provider>;
};

export const useFoundation = (): FoundationContextType => {
  const context = useContext(FoundationContext);
  if (!context) {
    throw new Error("useFoundation must be used within FoundationProvider");
  }
  return context;
};
