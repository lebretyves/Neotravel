export type Client = {
  id: string;
  organization: string | null;
  contactName: string | null;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
};

export type ClientInput = {
  organization: string | null;
  contactName?: string | null;
  email: string;
  phone?: string | null;
  active?: boolean;
};
