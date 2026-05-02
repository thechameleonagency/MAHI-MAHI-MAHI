import { Badge } from "@/components/ui/badge";

interface ExportHeaderProps {
  exportedBy: { name: string; role: string };
  title: string;
  subtitle?: string;
}

// Company info - MAHI SOLAR ENERGY
export const companyInfo = {
  name: "MAHI SOLAR ENERGY",
  address: "Govindpura, Jaipur, Rajasthan 302012",
  gstin: "08GPEPK1479A1ZZ",
  email: "mahisolarenergy77@gmail.com",
  contacts: [
    { name: "Mahendra Kumawat", role: "Chief Manager", phone: "9928413501" },
    { name: "Mahendra Singh", role: "Manager", phone: "8005950063" }
  ]
};

const ExportHeader = ({ exportedBy, title, subtitle }: ExportHeaderProps) => {
  return (
    <div className="border-b-2 border-border pb-4 mb-6 print:mb-4">
      {/* Company Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-foreground">{companyInfo.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">{companyInfo.address}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span>GSTIN: {companyInfo.gstin}</span>
            <span>Email: {companyInfo.email}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
            {companyInfo.contacts.map((contact, idx) => (
              <span key={idx}>{contact.name} ({contact.role}): {contact.phone}</span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            Exported on: {new Date().toLocaleDateString('en-IN', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="text-xs text-muted-foreground">By: {exportedBy.name}</span>
            <Badge variant="outline" className="text-xs">{exportedBy.role}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportHeader;
