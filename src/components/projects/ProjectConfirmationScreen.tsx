import { Check, Building2, Handshake, Users, FileText, MapPin, User, Phone, IndianRupee, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Partner {
  partnerId: string;
  partnerName: string;
  investmentPercent: number;
}

interface ProjectConfirmationData {
  name: string;
  type: "EPC" | "INC";
  projectType: string;
  ownerType: "solo" | "partnership" | "outsourced";
  client: string;
  location: string;
  capacity: string;
  contractAmount: number;
  referredBy?: string;
  quotationId?: string;
  quotationNumber?: string;
  partners?: Partner[];
  partyName?: string;
  partyContact?: string;
  amountToParty?: number;
  commissionPercent?: number;
  commissionAmount?: number;
}

interface ProjectConfirmationScreenProps {
  data: ProjectConfirmationData;
  onConfirm: () => void;
  onEdit: () => void;
}

export default function ProjectConfirmationScreen({
  data,
  onConfirm,
  onEdit
}: ProjectConfirmationScreenProps) {
  const getOwnerTypeBadge = () => {
    switch (data.ownerType) {
      case "partnership":
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Handshake className="w-3 h-3 mr-1" />Partnership</Badge>;
      case "outsourced":
        return <Badge className="bg-primary/10 text-primary border-primary/20"><Users className="w-3 h-3 mr-1" />Outsourced</Badge>;
      default:
        return <Badge className="bg-primary/10 text-primary border-primary/20"><Building2 className="w-3 h-3 mr-1" />Solo</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Confirm Project Details</h2>
        <p className="text-muted-foreground mt-1">Please review all details before creating the project</p>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{data.name}</CardTitle>
            {getOwnerTypeBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Type</p>
              <div className="flex gap-2">
                <Badge variant="outline">{data.type}</Badge>
                <Badge variant="outline">{data.projectType}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" />Client
              </p>
              <p className="font-medium">{data.client}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" />Location
              </p>
              <p className="font-medium">{data.location}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Capacity</p>
              <p className="font-medium">{data.capacity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />Contract Value
              </p>
              <p className="font-semibold text-primary text-lg">₹{data.contractAmount.toLocaleString()}</p>
            </div>
            {data.referredBy && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Referred By</p>
                <p className="font-medium">{data.referredBy}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Linked Quotation */}
      {data.quotationId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Linked Quotation</p>
              <p className="font-semibold">{data.quotationNumber || data.quotationId}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partnership Details */}
      {data.ownerType === "partnership" && data.partners && data.partners.length > 0 && (
        <Card className="border-warning/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Handshake className="w-4 h-4 text-warning" />
              Partnership Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.partners.map((partner) => (
                <div key={partner.partnerId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-warning">
                        {partner.partnerName.charAt(0)}
                      </span>
                    </div>
                    <p className="font-medium">{partner.partnerName}</p>
                  </div>
                  <Badge variant="outline" className="text-warning">
                    {partner.investmentPercent}% Investment
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outsourced Party Details */}
      {data.ownerType === "outsourced" && data.partyName && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Outsourced Party Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Party Name</p>
                <p className="font-medium">{data.partyName}</p>
              </div>
              {data.partyContact && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />Contact
                  </p>
                  <p className="font-medium">{data.partyContact}</p>
                </div>
              )}
              {data.amountToParty && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Amount Payable</p>
                  <p className="font-semibold text-primary">₹{data.amountToParty.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Details */}
      {(data.commissionPercent || data.commissionAmount) && (
        <Card className="border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referral Commission</p>
                <p className="font-medium">{data.referredBy}</p>
              </div>
            </div>
            <div className="text-right">
              {data.commissionPercent && (
                <Badge variant="outline" className="text-primary mb-1">
                  {data.commissionPercent}%
                </Badge>
              )}
              {data.commissionAmount && (
                <p className="font-semibold text-primary">₹{data.commissionAmount.toLocaleString()}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onEdit}>
          Edit Details
        </Button>
        <Button className="flex-1 bg-primary text-primary-foreground" onClick={onConfirm}>
          <Check className="w-4 h-4 mr-2" />
          Confirm & Create
        </Button>
      </div>

      {/* Creation Note */}
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Calendar className="w-3 h-3" />
        Project will be created with today's date as start date
      </p>
    </div>
  );
}
