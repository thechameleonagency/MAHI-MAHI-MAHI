import { buildEmptyAppState } from "@/data/appSeedBuilder";

import type { AppState } from "@/contexts/AppDataContext";

import { resetSeedTimeRegistry } from "./seedTimeModel";

import { resetNameCounter } from "./seedNames";

import { applySeedHydrationPipeline } from "./seedHydration";

import { verifySeedState, type SeedVerificationResult } from "./seedVerification";

import type { SeedProfile } from "./seedLayerOrder";

import { buildL0SettingsTeam } from "./L0_settingsTeam";

import { buildL1Catalog } from "./L1_catalog";

import { buildL2Network } from "./L2_network";

import { buildL3Customers } from "./L3_customers";

import { buildL4Hr } from "./L4_hr";

import { buildL8Crm } from "./L8_crm";

import { buildL5ProjectsSites } from "./L5_projectsSites";

import { buildL6AttendanceTasks } from "./L6_attendanceTasks";

import { buildL7InventoryOps } from "./L7_inventoryOps";

import { buildL9Finance } from "./L9_finance";

import { buildL10Capital } from "./L10_capital";

import { buildL11AuditBooks } from "./L11_auditBooks";

import { buildOpsExecutionLineItems } from "./ops_executionLineItems";

import { buildOpsScheduling } from "./ops_scheduling";

import { buildOpsChangeRequests } from "./ops_changeRequests";

import { buildOpsTransportTasks } from "./ops_transportTasks";

import { buildOpsProcurementNeedLines } from "./ops_procurementNeedLines";

import { buildOpsBankReconciliation } from "./ops_bankReconciliation";
import { buildOpsVolumeSupplement } from "./ops_volumeSupplement";

import { applyAllNarratives } from "./narratives/index";

import { seedAuditCoverage } from "./seedAuditCoverage";



export type { SeedProfile } from "./seedLayerOrder";



export interface BuildBusinessSeedResult {

  state: AppState;

  verification: SeedVerificationResult;

}



/**

 * Assemble full business seed (L0→L11 + ops + narratives + audit coverage), hydration, verification.

 * Public API per SEEDING DATA.md.

 */

export function buildBusinessSeed(profile: SeedProfile = "full"): BuildBusinessSeedResult {

  resetSeedTimeRegistry();

  resetNameCounter();



  let state = buildEmptyAppState();

  state = buildL0SettingsTeam(state, profile);

  state = buildL1Catalog(state, profile);

  state = buildL2Network(state, profile);

  state = buildL3Customers(state, profile);

  state = buildL4Hr(state, profile);

  state = buildL8Crm(state, profile);

  state = buildL5ProjectsSites(state, profile);

  state = buildOpsExecutionLineItems(state, profile);

  state = buildOpsScheduling(state, profile);

  state = buildOpsChangeRequests(state, profile);

  state = buildL6AttendanceTasks(state, profile);

  state = buildOpsTransportTasks(state, profile);

  state = buildL7InventoryOps(state, profile);

  state = buildOpsProcurementNeedLines(state, profile);

  state = buildL9Finance(state, profile);

  state = buildL10Capital(state, profile);

  state = buildL11AuditBooks(state, profile);

  state = buildOpsBankReconciliation(state, profile);

  state = buildOpsVolumeSupplement(state, profile);

  state = applyAllNarratives(state);

  state = seedAuditCoverage(state, profile);

  state = applySeedHydrationPipeline(state);



  const verification = verifySeedState(state, profile);

  return { state, verification };

}


