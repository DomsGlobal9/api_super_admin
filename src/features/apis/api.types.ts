export interface ApiDTO {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  moduleId: string | null;
  moduleName?: string;
  createdAt: Date;
  updatedAt: Date;
  activeVersions?: number;
  totalEndpoints?: number;
  requestsToday?: number;
  documentation?: string | null;
  openapiSpecUrl?: string | null;
  environments?: any[];
}

export interface ApiOverviewDTO {
  api: ApiDTO;
  versions: any[];
  clients: any[];
  topEndpoints?: any[];
  usage: any; // To be expanded via usage service
  gateway: any; // To be expanded via gateway service
  health: any;
  logs: any[];
}
