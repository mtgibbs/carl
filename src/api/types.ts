/**
 * Canvas LMS API Type Definitions
 * Based on: https://canvas.instructure.com/doc/api/
 */

/** Course object from Canvas API */
export interface Course {
  id: number;
  name: string;
  course_code: string;
  workflow_state: "unpublished" | "available" | "completed" | "deleted";
  account_id: number;
  start_at: string | null;
  end_at: string | null;
  enrollments?: Enrollment[];
  total_students?: number;
  term?: Term;
  time_zone?: string;
}

/** Term/semester information */
export interface Term {
  id: number;
  name: string;
  start_at: string | null;
  end_at: string | null;
}

/** Enrollment object with grade information */
export interface Enrollment {
  id: number;
  course_id: number;
  user_id: number;
  type: EnrollmentType;
  enrollment_state: "active" | "invited" | "inactive" | "completed" | "deleted";
  role: string;
  grades?: Grades;
  user?: User;
  observed_user?: User;
}

export type EnrollmentType =
  | "StudentEnrollment"
  | "TeacherEnrollment"
  | "TaEnrollment"
  | "ObserverEnrollment"
  | "DesignerEnrollment";

/** Grade information within an enrollment */
export interface Grades {
  html_url: string;
  current_grade: string | null;
  final_grade: string | null;
  current_score: number | null;
  final_score: number | null;
  current_points?: number;
  unposted_current_grade?: string | null;
  unposted_final_grade?: string | null;
  unposted_current_score?: number | null;
  unposted_final_score?: number | null;
}

/** User object */
export interface User {
  id: number;
  name: string;
  sortable_name: string;
  short_name: string;
  login_id?: string;
  email?: string;
  avatar_url?: string;
}

/** Assignment object */
export interface Assignment {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  unlock_at: string | null;
  lock_at: string | null;
  points_possible: number | null;
  course_id: number;
  submission_types: SubmissionType[];
  html_url: string;
  has_submitted_submissions: boolean;
  published: boolean;
  workflow_state: "published" | "unpublished" | "deleted";
  assignment_group_id: number;
  position: number;
  grading_type: GradingType;
  submission?: Submission;
  submissions_download_url?: string;
  external_tool_tag_attributes?: {
    url: string;
    new_tab: boolean;
    resource_link_id: string;
  };
  attachments?: Attachment[];
}

export type SubmissionType =
  | "online_text_entry"
  | "online_url"
  | "online_upload"
  | "media_recording"
  | "student_annotation"
  | "external_tool"
  | "on_paper"
  | "none";

export type GradingType =
  | "pass_fail"
  | "percent"
  | "letter_grade"
  | "gpa_scale"
  | "points"
  | "not_graded";

/** File attachment */
export interface Attachment {
  id: number;
  uuid: string;
  filename: string;
  display_name: string;
  content_type: string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
}

/** Submission object */
export interface Submission {
  id: number;
  assignment_id: number;
  user_id: number;
  submission_type: SubmissionType | null;
  submitted_at: string | null;
  grade: string | null;
  score: number | null;
  entered_grade: string | null;
  entered_score: number | null;
  late: boolean;
  missing: boolean;
  excused: boolean | null;
  late_policy_status: "late" | "missing" | "extended" | "none" | null;
  points_deducted: number | null;
  grading_period_id: number | null;
  workflow_state: "submitted" | "unsubmitted" | "graded" | "pending_review";
  grade_matches_current_submission: boolean;
  posted_at: string | null;
  assignment?: Assignment;
  user?: User;
  course?: Course;
  html_url?: string;
  preview_url?: string;
  attachments?: Attachment[];
  submission_comments?: SubmissionComment[];
}

/** Comment on a submission */
export interface SubmissionComment {
  id: number;
  author_id: number;
  author_name: string;
  comment: string;
  created_at: string;
  author?: User;
}

/** Missing submission (from /users/:id/missing_submissions) */
export interface MissingSubmission {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  unlock_at: string | null;
  lock_at: string | null;
  points_possible: number | null;
  course_id: number;
  html_url: string;
  submission_types: SubmissionType[];
  course?: Course;
  planner_override?: PlannerOverride;
}

/** Planner override for managing todo items */
export interface PlannerOverride {
  id: number;
  plannable_type: string;
  plannable_id: number;
  user_id: number;
  marked_complete: boolean;
  dismissed: boolean;
}

/** Upcoming event (assignment or calendar event) */
export interface UpcomingEvent {
  id: string;
  title: string;
  start_at: string;
  end_at?: string;
  type: "event" | "assignment";
  context_code: string;
  html_url: string;
  assignment?: Assignment;
}

/** Planner item (from /api/v1/planner/items) */
export interface PlannerItem {
  context_type: "Course" | "Group" | "User";
  course_id?: number;
  group_id?: number;
  user_id?: number;
  plannable_id: number;
  plannable_type: "assignment" | "quiz" | "discussion_topic" | "wiki_page" | "planner_note" | "calendar_event" | "announcement";
  planner_override: PlannerOverride | null;
  new_activity: boolean;
  submissions?: PlannerSubmissionStatus;
  plannable_date: string;
  plannable: {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
    points_possible: number | null;
    due_at: string | null;
  };
  html_url: string;
  context_name: string;
  context_image?: string | null;
}

/** Submission status in planner items */
export interface PlannerSubmissionStatus {
  submitted: boolean;
  excused: boolean;
  graded: boolean;
  posted_at: string | null;
  late: boolean;
  missing: boolean;
  needs_grading: boolean;
  has_feedback: boolean;
  redo_request: boolean;
}

/** Canvas API pagination info parsed from Link header */
export interface PaginationLinks {
  current?: string;
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

/** Generic API error response */
export interface ApiError {
  status: string;
  message: string;
  errors?: Array<{ message: string }>;
}

/** Options for listing courses */
export interface ListCoursesOptions {
  enrollment_type?: EnrollmentType;
  enrollment_state?: "active" | "invited" | "completed";
  include?: Array<"total_students" | "enrollments" | "term" | "course_image">;
  state?: Array<"unpublished" | "available" | "completed" | "deleted">;
}

/** Options for listing assignments */
export interface ListAssignmentsOptions {
  course_id: number;
  bucket?: "past" | "overdue" | "undated" | "ungraded" | "unsubmitted" | "upcoming" | "future";
  order_by?: "position" | "name" | "due_at";
  include?: Array<"submission" | "assignment_visibility" | "all_dates" | "overrides">;
  search_term?: string;
}

/** Options for listing submissions */
export interface ListSubmissionsOptions {
  course_id: number;
  assignment_ids?: number[];
  student_ids?: number[] | "all";
  grouped?: boolean;
  include?: Array<
    "submission_history" | "submission_comments" | "rubric_assessment" | "assignment" | "user"
  >;
  workflow_state?: "submitted" | "unsubmitted" | "graded" | "pending_review";
}

/** Options for missing submissions */
export interface MissingSubmissionsOptions {
  user_id?: string | number;
  observed_user_id?: string | number;
  course_ids?: number[];
  include?: Array<"planner_overrides" | "course">;
  filter?: Array<"submittable" | "current_grading_period">;
}
