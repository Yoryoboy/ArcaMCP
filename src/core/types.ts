export type MCPResponse = {
  [x: string]: unknown;
  content: Array<{
    [x: string]: unknown;
    type: "text";
    text: string;
    _meta?: { [x: string]: unknown };
  }>;
  _meta?: { [x: string]: unknown };
  isError?: boolean;
};
