export type UploadSectionStatus = 'open' | 'closed';

export type FileStatus = 'Uploaded' | 'Verified' | 'Rejected';

export type XeroxStatus = 'Pending' | 'Ready to Print' | 'Printed' | 'Taken';

export type PaymentStatus = 'Pending' | 'Paid';

export interface UploadSection {
  id: string;
  title: string;
  slug: string;
  description: string;
  deadline: string;
  xerox_rate: number;
  allowed_file_types: string[]; // e.g. ['pdf', 'docx', 'pptx', 'images']
  max_file_size: number; // in MB
  status: UploadSectionStatus;
  public_submission_list: boolean;
  created_at?: string;
  updated_at?: string;
  submissions_count?: number;
}

export interface Submission {
  id: string;
  upload_section_id: string;
  name: string;
  roll_number: string;
  department?: string;
  file_name: string;
  file_path: string;
  file_url?: string;
  file_size: number;
  mime_type: string;
  page_count: number;
  amount: number;
  submission_status: FileStatus;
  xerox_status: XeroxStatus;
  payment_status: PaymentStatus;
  uploaded_at: string;
  updated_at?: string;
  upload_section?: UploadSection;
}

export interface DashboardStats {
  total_sections: number;
  total_submissions: number;
  ready_to_print: number;
  printed: number;
  xerox_taken: number;
  expected_amount: number;
  received_amount: number;
  pending_amount: number;
}

export interface SectionFinancialSummary {
  section_id: string;
  title: string;
  slug: string;
  status: UploadSectionStatus;
  submissions_count: number;
  paid_count: number;
  pending_count: number;
  expected_amount: number;
  received_amount: number;
  pending_amount: number;
}

export interface CreateSectionInput {
  title: string;
  slug: string;
  description: string;
  deadline: string;
  allowed_file_types: string[];
  max_file_size: number;
  status: UploadSectionStatus;
  public_submission_list: boolean;
}

export interface CreateSubmissionInput {
  upload_section_id: string;
  name: string;
  roll_number: string;
  department?: string;
  file: File;
  replace_existing?: boolean;
}
