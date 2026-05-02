import { companyInfo } from "./ExportHeader";

const ExportFooter = () => {
  return (
    <div className="mt-8 pt-4 border-t-2 border-border text-center text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">{companyInfo.name}</p>
      <p>{companyInfo.address}</p>
      <p>GSTIN: {companyInfo.gstin} | Email: {companyInfo.email}</p>
      <p>
        Contact: {companyInfo.contacts.map(c => `${c.name} (${c.role}): ${c.phone}`).join(' | ')}
      </p>
    </div>
  );
};

export default ExportFooter;
