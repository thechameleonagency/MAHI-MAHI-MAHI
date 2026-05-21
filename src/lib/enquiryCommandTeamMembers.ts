import type { SettingsTeamMember } from "@/types/project";

/** Runtime team roster for enquiry command normalization (set from AppDataContext). */
let teamMembers: SettingsTeamMember[] = [];

export function setEnquiryCommandTeamMembers(members: SettingsTeamMember[]): void {
  teamMembers = members;
}

export function getEnquiryCommandTeamMembers(): SettingsTeamMember[] {
  return teamMembers;
}
