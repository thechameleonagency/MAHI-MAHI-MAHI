/** Realistic Indian solar EPC names — no placeholder patterns. */

export const INDIAN_FIRST_NAMES = [
  "Arjun", "Priya", "Rahul", "Ananya", "Vikram", "Kavya", "Suresh", "Meera",
  "Rohan", "Divya", "Karthik", "Lakshmi", "Naveen", "Pooja", "Sanjay", "Revathi",
  "Aditya", "Shreya", "Manoj", "Deepa", "Harish", "Swati", "Gopal", "Nisha",
  "Varun", "Aishwarya", "Prakash", "Sunita", "Ashok", "Geeta",
];

export const INDIAN_LAST_NAMES = [
  "Reddy", "Sharma", "Patel", "Nair", "Iyer", "Gupta", "Rao", "Menon",
  "Kumar", "Singh", "Desai", "Pillai", "Choudhary", "Verma", "Joshi", "Malhotra",
  "Krishnan", "Bhat", "Shetty", "Chakraborty", "Banerjee", "Kulkarni", "Murthy", "Saxena",
];

export const COMPANY_NAMES = [
  "Surya Shakti Industries", "Green Volt Enterprises", "Sunrise Power Solutions",
  "Venkateswara Solar Pvt Ltd", "EcoRay Energy Systems", "Bharat Solar Works",
  "Prism Renewable Services", "Navodaya Green Power", "Akshaya Sun Technologies",
  "Mahindra Heights Apartments RWAs", "Kakatiya Warehousing Co", "Deccan Textile Mills",
  "Hyderabad Pharma Labs", "Pune IT Park Facilities", "Bangalore Tech Campus",
  "Shree Ganesh Cold Storage", "Vijayawada Agro Processing", "Mysore Silk Exports",
  "Coimbatore Engineering Works", "Nizamabad Rice Mills", "Guntur Chilli Traders",
  "Whitefield Residency Association", "Kondapur Commercial Complex", "HITEC City Block C",
  "Magarpatta Business District", "Electronic City Phase 2", "Baner Hill View Society",
  "Kharadi IT SEZ", "Hinjewadi Phase 3", "Madhapur Retail Hub",
];

export const CITIES = [
  { city: "Hyderabad", state: "Telangana", pin: "500032" },
  { city: "Secunderabad", state: "Telangana", pin: "500003" },
  { city: "Bangalore", state: "Karnataka", pin: "560066" },
  { city: "Pune", state: "Maharashtra", pin: "411014" },
  { city: "Nizamabad", state: "Telangana", pin: "503001" },
  { city: "Warangal", state: "Telangana", pin: "506002" },
  { city: "Mysore", state: "Karnataka", pin: "570001" },
  { city: "Hubli", state: "Karnataka", pin: "580020" },
  { city: "Vijayawada", state: "Andhra Pradesh", pin: "520010" },
  { city: "Nashik", state: "Maharashtra", pin: "422005" },
];

export const PARTNER_NAMES = [
  "Radiant Channel Partners", "SolarEdge Associates", "GreenGrid Collaborations",
  "SunBridge EPC Network", "PowerLink Channel India", "Helios Fixed Margin Co",
];

export const VENDOR_NAMES = [
  "Adani Solar Distribution", "Waaree Module Supply", "Luminous Inverter Depot",
  "Tata Steel Structures", "Polycab Cables Hyderabad", "Havells Electrical Wholesale",
  "Jindal Mounting Systems", "Exide Battery Traders", "Schneider Switchgear Hub",
  "Kirloskar Diesel Genset", "Bharat Bijlee Transformers", "Finolex DC Cable Mart",
];

export const AGENT_NAMES = [
  "Ramesh Channel Partner", "Sunita Referral Network", "Farhan Solar Consultant",
  "Latha Green Connect", "Imran Energy Advisor", "Chitra Sun Referrals",
  "Mohammed Solar Guide", "Padma Lead Connect", "Venkat Referral Services",
  "Anjali Green Leads",
];

export const EMPLOYEE_ROLES = [
  "Site Supervisor", "Electrician", "Structure Fitter", "Helper",
  "Sales Executive", "Project Coordinator", "Accounts Assistant",
  "Warehouse Manager", "Driver", "DISCOM Liaison",
];

export const TEAM_NAMES = [
  "Alpha Installation Crew", "Beta Wiring Team", "Gamma Structure Squad", "Delta Field Unit",
  "Epsilon Metro Team", "Zeta South Zone",
];

export const INC_GIVER_NAMES = [
  "Sunrise DISCOM Liaison", "GreenGrid INC Source", "PowerLink Referral Hub",
  "Helios Work Assignments", "EcoRay Channel INC",
];

export const VENDORSHIP_COMPANIES = [
  "Telangana DISCOM Vendor Code", "Karnataka BESCOM Registration", "MSEDCL Pune Vendor",
  "TSSPDCL Hyderabad Code", "APSPDCL Vijayawada Vendor",
];

let nameCounter = 0;

export function personName(index?: number): string {
  const i = index ?? nameCounter++;
  const first = INDIAN_FIRST_NAMES[i % INDIAN_FIRST_NAMES.length];
  const last = INDIAN_LAST_NAMES[(i * 7 + 3) % INDIAN_LAST_NAMES.length];
  return `${first} ${last}`;
}

export function companyName(index?: number): string {
  const i = index ?? nameCounter++;
  return COMPANY_NAMES[i % COMPANY_NAMES.length];
}

export function phoneNumber(index: number): string {
  const base = 9876500000 + (index % 900000);
  return `+91 ${String(base).slice(0, 5)} ${String(base).slice(5)}`;
}

export function emailFor(name: string, domain = "mail.in"): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  return `${slug}@${domain}`;
}

export function gstinFor(stateCode: string, index: number): string {
  const pan = `AABCM${String(1000 + index).slice(-4)}A`;
  return `${stateCode}${pan}1Z${String(index % 10)}`;
}

export function addressAt(index: number): { city: string; state: string; pin: string; line: string } {
  const loc = CITIES[index % CITIES.length];
  const num = 12 + (index % 180);
  return {
    ...loc,
    line: `${num}, ${["MG Road", "Hitech City", "Koregaon Park", "Indiranagar", "Gachibowli"][index % 5]}, ${loc.city}`,
  };
}

export function resetNameCounter(): void {
  nameCounter = 0;
}
