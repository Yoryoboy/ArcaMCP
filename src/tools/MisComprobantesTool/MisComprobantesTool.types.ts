export interface AutomationStartResponse {
  id: string;
  status: string; // expected values: 'in_process' | 'complete' (SDK may vary)
}
