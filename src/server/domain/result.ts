export type NextAction = {
  action: string;
  method?: "GET" | "POST";
  href?: string;
};

export type ServiceResult<T> = {
  status: string;
  reason_code: string;
  next_actions: NextAction[];
  resource: T | null;
};
