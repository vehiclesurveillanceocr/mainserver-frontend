"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";
import { Search, SlidersHorizontal, Download, Calendar, Gauge, Globe, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { SearchDetection } from "@/types/domain";

interface Filters {
  plate: string;
  dateFrom: string;
  dateTo: string;
  country: string;
  minConfidence: string;
}

export default function SearchPage() {
  const { dictionary, isRTL, formatDateTime } = useLanguage();
  const copy = dictionary.search;
  const common = dictionary.common;

  const [rows, setRows] = useState<SearchDetection[]>([]);
  const [filters, setFilters] = useState<Filters>({
    plate: "",
    dateFrom: "",
    dateTo: "",
    country: "",
    minConfidence: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .get<{ success: true; data: SearchDetection[] }>("/api/detections/search")
      .then((response) => {
        if (active) {
          setRows(response.data);
        }
      })
      .catch(() => {
        if (active) {
          setRows([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const plateMatch = !filters.plate || row.plate.toLowerCase().includes(filters.plate.toLowerCase());
      const countryMatch = !filters.country || row.country.toLowerCase().includes(filters.country.toLowerCase());
      const confidenceMatch =
        !filters.minConfidence || row.confidence >= Number(filters.minConfidence);

      const rowDate = new Date(row.timestamp);
      const fromMatch = !filters.dateFrom || rowDate >= new Date(`${filters.dateFrom}T00:00:00`);
      const toMatch = !filters.dateTo || rowDate <= new Date(`${filters.dateTo}T23:59:59`);

      return plateMatch && countryMatch && confidenceMatch && fromMatch && toMatch;
    });
  }, [filters, rows]);

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={filteredRows.length === 0}
          title={filteredRows.length ? copy.exportHint : copy.noExportHint}
          className={cn(filteredRows.length === 0 && "cursor-not-allowed opacity-50")}
        >
          <Download className="h-4 w-4" />
          {copy.exportCsv}
        </Button>
      </div>

      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                type="text"
                placeholder={copy.searchPlaceholder}
                value={filters.plate}
                onChange={(e) => updateFilter("plate", e.target.value)}
                className={isRTL ? "pr-10" : "pl-10"}
              />
            </div>
            <Button
              type="button"
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(!showFilters && "glass glass-hover")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {copy.filters}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> {copy.fromDate}
                </Label>
                <Input type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> {copy.toDate}
                </Label>
                <Input type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> {common.country}
                </Label>
                <Input type="text" placeholder={copy.countryPlaceholder} value={filters.country} onChange={(e) => updateFilter("country", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Gauge className="h-3 w-3" /> {copy.minConfidence}
                </Label>
                <Input type="number" min="0" max="100" placeholder={copy.confidencePlaceholder} value={filters.minConfidence}
                  onChange={(e) => updateFilter("minConfidence", e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{common.plate}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{common.timestamp}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{common.workstation}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{common.confidence}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{common.country}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{common.vehicle}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{common.snapshot}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground force-ltr">{row.plate}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(row.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-foreground">{row.workstationName}</span>
                      <span className="text-xs text-muted-foreground force-ltr">{row.workstationDeviceId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary force-ltr">
                      {row.confidence}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.country}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.vehicle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium border",
                        row.snapshotUrl
                          ? "border-success/20 bg-success/10 text-success"
                          : "border-border bg-muted/60 text-muted-foreground",
                      )}
                    >
                      {row.snapshotUrl ? common.available : copy.pending}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="glass rounded-full p-4 mb-4">
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-foreground font-medium mb-1">{copy.noMatchesTitle}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {copy.noMatchesBody}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
