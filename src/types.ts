export type AppView = 'chat' | 'steps' | 'selfcare' | 'support';

export type SupportCategory =
  | 'All'
  | 'Crisis & Suicide'
  | 'Substance Use'
  | 'GBV & Safety'
  | 'Youth & Family'
  | 'Legal & Advice';

export interface SupportResource {
  id: string;
  name: string;
  category: Exclude<SupportCategory, 'All'>;
  phone: string;
  telHref: string;
  secondaryContact?: string;
  hours: string;
  cost: string;
  description: string;
  whoItHelps: string;
  urgent?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  safetyAlert?: boolean;
  urgentContacts?: SupportResource[];
  piiNotice?: boolean;
}

export interface SmallStep {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  createdAtIso?: string;
  completedAtIso?: string;
  sourceNote?: string;
}

export interface TriggerNote {
  id: string;
  situation: string;
  thought: string;
  helpfulAction: string;
  createdAt: string;
}
