export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Auth Types
export interface SignupRequest {
  businessName: string;
  email: string;
  passwordHash: string; // Wait, password is sent plain from frontend, let's call it password
  password?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  businessName: string;
}

export interface AuthResponse {
  user: AuthUser;
}

// Form Types
export interface CreateFormRequest {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'rating' | 'select';
  required: boolean;
  options?: string[]; // for select dropdowns
}

export interface FormResponse {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  createdAt: string;
  userId: string;
  publicUrl: string;
}

// Feedback Types
export interface SubmitFeedbackRequest {
  formId: string;
  answers: Record<string, string | number>; // fieldId -> value
}

export interface FeedbackResponse {
  id: string;
  formId: string;
  answers: Record<string, string | number>;
  submittedAt: string;
}
