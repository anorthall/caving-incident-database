import { useQuery } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDataQuality, type DataQualitySample } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function sampleHref(sample: DataQualitySample): string {
  if (sample.kind === "incident") return `/incidents/${sample.id}`;
  return `/admin/incidents/${sample.kind}/${sample.id}/change/`;
}

export function DataQualityPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["data-quality"],
    queryFn: getDataQuality,
    enabled: isAuthenticated && (user?.is_staff || user?.is_editor),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || (!user?.is_staff && !user?.is_editor)) {
    return <Navigate to="/staff/login" replace />;
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto w-full">
      <h1 className="text-2xl font-semibold">Data quality</h1>

      {error && (
        <p className="text-destructive">
          Error loading data quality. {error instanceof Error ? error.message : "Please try again."}
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading checks...</p>
        </div>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Checks</CardTitle>
            <CardDescription>Issues staff can find and fix.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead className="w-24">Count</TableHead>
                  <TableHead>Samples</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((check) => (
                  <TableRow key={check.key}>
                    <TableCell className="align-top whitespace-normal">
                      <div className="font-medium">{check.title}</div>
                      <div className="text-sm text-muted-foreground">{check.description}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={check.count > 0 ? "destructive" : "secondary"}>
                        {check.count}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {check.samples.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <ul className="space-y-1">
                          {check.samples.map((sample) => (
                            <li key={`${sample.kind}-${sample.id}-${sample.label}`}>
                              {sample.kind === "incident" ? (
                                <Link
                                  to={sampleHref(sample)}
                                  className="text-primary hover:underline"
                                >
                                  {sample.label}
                                </Link>
                              ) : (
                                <a
                                  href={sampleHref(sample)}
                                  className="text-primary hover:underline"
                                >
                                  {sample.label}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
