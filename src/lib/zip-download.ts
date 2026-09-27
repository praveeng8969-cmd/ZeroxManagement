import JSZip from 'jszip';
import { Submission } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

async function getSubmissionBlob(submission: Submission): Promise<Blob> {
  if (isSupabaseConfigured() && supabase && submission.file_path) {
    const { data, error } = await supabase.storage
      .from('submissions')
      .download(submission.file_path);

    if (error) throw new Error(error.message);
    return data;
  }

  if (submission.file_url) {
    const response = await fetch(submission.file_url);
    if (!response.ok) throw new Error('Unable to retrieve the uploaded file.');
    return response.blob();
  }

  throw new Error('No stored file is available for this submission.');
}

export async function downloadSubmissionFile(submission: Submission) {
  const blob = await getSubmissionBlob(submission);
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = submission.file_name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

export async function downloadSubmissionsAsZip(sectionTitle: string, submissions: Submission[]) {
  if (!submissions || submissions.length === 0) {
    alert('No submissions available to download.');
    return;
  }

  const zip = new JSZip();
  const failedFiles: string[] = [];

  // Prompt requires: "Rename downloaded files automatically. Format: ROLLNUMBER_NAME_FILENAME.
  // Example: 25CS174_PRAVEEN_G_Java_Project_Report.pdf"
  for (const sub of submissions) {
    const cleanRoll = sub.roll_number.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanName = sub.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = sub.file_name.trim().replace(/\s+/g, '_');
    const zipEntryName = `${cleanRoll}_${cleanName}_${cleanFileName}`;

    try {
      const blob = await getSubmissionBlob(sub);
      zip.file(zipEntryName, blob);
    } catch {
      failedFiles.push(sub.file_name);
    }
  }

  if (failedFiles.length === submissions.length) {
    throw new Error('None of the uploaded files could be downloaded from storage.');
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const cleanSection = sectionTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${cleanSection}_All_Submissions.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  if (failedFiles.length > 0) {
    alert(`${failedFiles.length} older file(s) were not found in storage and were skipped.`);
  }
}
