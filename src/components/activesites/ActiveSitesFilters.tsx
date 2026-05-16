import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Filter, ChevronDown } from "lucide-react";

export interface ActiveSitesFiltersState {
  search: string;
  fileLogin: string[];
  subsidyType: string[];
  bankFileType: string[];
  loanStage: string[];
  workStatus: string[];
  discomStatus: string[];
  paymentStatus: string[];
}

interface ActiveSitesFiltersProps {
  filters: ActiveSitesFiltersState;
  onFiltersChange: (filters: ActiveSitesFiltersState) => void;
}

interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectFilter = ({ label, options, selected, onChange }: MultiSelectFilterProps) => {
  const [open, setOpen] = useState(false);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-8 text-xs gap-1 ${selected.length > 0 ? 'border-primary bg-primary/5' : ''}`}
        >
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-2xs">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 bg-popover" align="start">
        <div className="space-y-1">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => toggleOption(option.value)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={clearSelection}
          >
            Clear selection
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

const filterConfigs = {
  fileLogin: {
    label: "File Login",
    options: [
      { value: "pending", label: "Pending" },
      { value: "doc-received", label: "Doc Received" },
      { value: "file-login", label: "File Login" },
      { value: "submitted", label: "Submitted" },
      { value: "complete", label: "Complete" },
    ]
  },
  subsidyType: {
    label: "Subsidy",
    options: [
      { value: "center-78k", label: "Center (₹78K)" },
      { value: "state-17k", label: "State (₹17K)" },
      { value: "both", label: "Both (₹95K)" },
      { value: "not-applicable", label: "N/A" },
    ]
  },
  bankFileType: {
    label: "Bank/Cash",
    options: [
      { value: "cash", label: "Cash" },
      { value: "loan", label: "Loan" },
    ]
  },
  loanStage: {
    label: "Loan Stage",
    options: [
      { value: "file-prepare", label: "File Prepare" },
      { value: "file-into-bank", label: "File into Bank" },
      { value: "loan-apply", label: "Loan Apply" },
      { value: "approved", label: "Approved" },
    ]
  },
  workStatus: {
    label: "Work Status",
    options: [
      { value: "structure", label: "Structure" },
      { value: "panel", label: "Panel" },
      { value: "ac-dc", label: "AC/DC" },
      { value: "earthing", label: "Earthing" },
      { value: "inverter", label: "Inverter" },
      { value: "transport", label: "Transport" },
    ]
  },
  discomStatus: {
    label: "DISCOM",
    options: [
      { value: "meter-file-submit", label: "Meter & File Submit" },
      { value: "net-metering", label: "Net Metering" },
      { value: "subsidy-apply-photo", label: "Subsidy + Photos" },
      { value: "approved", label: "Approved" },
    ]
  },
  paymentStatus: {
    label: "Payment",
    options: [
      { value: "cash-to-mahi", label: "Cash to Mahi" },
      { value: "instalments", label: "Instalments" },
      { value: "first-paid", label: "1st Paid" },
      { value: "fully-paid", label: "Fully Paid" },
    ]
  },
};

const ActiveSitesFilters = ({ filters, onFiltersChange }: ActiveSitesFiltersProps) => {
  const updateFilter = (key: keyof ActiveSitesFiltersState, value: string[] | string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      fileLogin: [],
      subsidyType: [],
      bankFileType: [],
      loanStage: [],
      workStatus: [],
      discomStatus: [],
      paymentStatus: [],
    });
  };

  const totalActiveFilters = 
    filters.fileLogin.length +
    filters.subsidyType.length +
    filters.bankFileType.length +
    filters.loanStage.length +
    filters.workStatus.length +
    filters.discomStatus.length +
    filters.paymentStatus.length;

  const hasActiveFilters = filters.search || totalActiveFilters > 0;

  const getActiveFilterChips = () => {
    const chips: { key: keyof ActiveSitesFiltersState; label: string; value: string }[] = [];
    
    const addChips = (key: keyof ActiveSitesFiltersState, label: string, values: string[], options: FilterOption[]) => {
      values.forEach(value => {
        const option = options.find(o => o.value === value);
        if (option) {
          chips.push({ key, label, value: option.label });
        }
      });
    };

    addChips("fileLogin", "File", filters.fileLogin, filterConfigs.fileLogin.options);
    addChips("subsidyType", "Subsidy", filters.subsidyType, filterConfigs.subsidyType.options);
    addChips("bankFileType", "Bank", filters.bankFileType, filterConfigs.bankFileType.options);
    addChips("loanStage", "Loan", filters.loanStage, filterConfigs.loanStage.options);
    addChips("workStatus", "Work", filters.workStatus, filterConfigs.workStatus.options);
    addChips("discomStatus", "DISCOM", filters.discomStatus, filterConfigs.discomStatus.options);
    addChips("paymentStatus", "Payment", filters.paymentStatus, filterConfigs.paymentStatus.options);
    
    return chips;
  };

  const removeChip = (key: keyof ActiveSitesFiltersState, label: string) => {
    const config = filterConfigs[key as keyof typeof filterConfigs];
    if (!config) return;
    
    const option = config.options.find(o => o.label === label);
    if (option) {
      const currentValues = filters[key] as string[];
      updateFilter(key, currentValues.filter(v => v !== option.value));
    }
  };

  return (
    <div className="space-y-3 p-3 bg-card rounded-lg border">
      {/* Search + Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Filter Icon Separator */}
        <div className="h-6 w-px bg-border mx-1" />
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <MultiSelectFilter
            label={filterConfigs.fileLogin.label}
            options={filterConfigs.fileLogin.options}
            selected={filters.fileLogin}
            onChange={(v) => updateFilter("fileLogin", v)}
          />
          <MultiSelectFilter
            label={filterConfigs.subsidyType.label}
            options={filterConfigs.subsidyType.options}
            selected={filters.subsidyType}
            onChange={(v) => updateFilter("subsidyType", v)}
          />
          <MultiSelectFilter
            label={filterConfigs.bankFileType.label}
            options={filterConfigs.bankFileType.options}
            selected={filters.bankFileType}
            onChange={(v) => updateFilter("bankFileType", v)}
          />
          <MultiSelectFilter
            label={filterConfigs.loanStage.label}
            options={filterConfigs.loanStage.options}
            selected={filters.loanStage}
            onChange={(v) => updateFilter("loanStage", v)}
          />
          <MultiSelectFilter
            label={filterConfigs.workStatus.label}
            options={filterConfigs.workStatus.options}
            selected={filters.workStatus}
            onChange={(v) => updateFilter("workStatus", v)}
          />
          <MultiSelectFilter
            label={filterConfigs.discomStatus.label}
            options={filterConfigs.discomStatus.options}
            selected={filters.discomStatus}
            onChange={(v) => updateFilter("discomStatus", v)}
          />
          <MultiSelectFilter
            label={filterConfigs.paymentStatus.label}
            options={filterConfigs.paymentStatus.options}
            selected={filters.paymentStatus}
            onChange={(v) => updateFilter("paymentStatus", v)}
          />
        </div>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 text-xs text-muted-foreground ml-auto">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {getActiveFilterChips().length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t">
          <span className="text-xs text-muted-foreground mr-1">Active:</span>
          {getActiveFilterChips().map((chip, idx) => (
            <Badge 
              key={`${chip.key}-${chip.value}-${idx}`}
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-destructive/20 gap-1 py-0.5"
              onClick={() => removeChip(chip.key, chip.value)}
            >
              <span className="text-muted-foreground">{chip.label}:</span>
              {chip.value}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveSitesFilters;
