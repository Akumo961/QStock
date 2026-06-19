/**
 * Review Types
 * Type definitions for review and rating data structures
 */

import { BaseEntity, IssueSeverity } from './index';
import { UserSummary } from './user';
import { ItemSummary } from './item';

/**
 * Review Interface
 */
export interface Review extends BaseEntity {
  user_id: number;
  item_id: number;
  transaction_id?: number;
  rating?: number;
  comment?: string;
  has_issue: boolean;
  issue_description?: string;
  issue_severity?: IssueSeverity;
  issue_type?: IssueType;
  is_verified: boolean;
  helpful_count: number;
  unhelpful_count: number;
  response?: AdminResponse;
  status: ReviewStatus;
  moderation_notes?: string;
  images?: string[];
}

/**
 * Review create data
 */
export interface ReviewCreateData {
  item_id: number;
  transaction_id?: number;
  rating?: number;
  comment?: string;
  has_issue: boolean;
  issue_description?: string;
  issue_severity?: IssueSeverity;
  issue_type?: IssueType;
  images?: string[];
}

/**
 * Review update data
 */
export interface ReviewUpdateData {
  rating?: number;
  comment?: string;
  has_issue?: boolean;
  issue_description?: string;
  issue_severity?: IssueSeverity;
  issue_type?: IssueType;
}

/**
 * Review status
 */
export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'flagged'
  | 'archived';

/**
 * Issue types
 */
export type IssueType =
  | 'damage'
  | 'malfunction'
  | 'missing_parts'
  | 'dirty'
  | 'incorrect_item'
  | 'performance'
  | 'other';

/**
 * Admin response to review
 */
export interface AdminResponse {
  respondent_id: number;
  respondent_name: string;
  message: string;
  action_taken?: string;
  responded_at: string;
}

/**
 * Review detail view
 */
export interface ReviewDetail extends Review {
  user: UserSummary;
  item: ItemSummary;
  transaction_code?: string;
  helpful_users?: number[];
  unhelpful_users?: number[];
}

/**
 * Review filter
 */
export interface ReviewFilter {
  user_id?: number;
  item_id?: number;
  rating?: number | number[];
  has_issue?: boolean;
  status?: ReviewStatus | ReviewStatus[];
  verified_only?: boolean;
  issue_type?: IssueType;
  issue_severity?: IssueSeverity;
  created_after?: string;
  created_before?: string;
}

/**
 * Review list params
 */
export interface ReviewListParams {
  page?: number;
  page_size?: number;
  sort_by?: ReviewSortField;
  sort_order?: 'asc' | 'desc';
  filters?: ReviewFilter;
}

/**
 * Review sort fields
 */
export type ReviewSortField =
  | 'created_at'
  | 'rating'
  | 'helpful_count'
  | 'user_name'
  | 'item_name';

/**
 * Review statistics
 */
export interface ReviewStats {
  total_reviews: number;
  avg_rating: number;
  rating_distribution: RatingDistribution;
  total_with_issues: number;
  issue_breakdown: IssueBreakdown[];
  verified_review_count: number;
  recent_reviews: ReviewSummary[];
}

/**
 * Rating distribution
 */
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/**
 * Issue breakdown
 */
export interface IssueBreakdown {
  issue_type: IssueType;
  count: number;
  severity_breakdown: {
    minor: number;
    moderate: number;
    severe: number;
  };
}

/**
 * Review summary
 */
export interface ReviewSummary {
  id: number;
  user_name: string;
  item_name: string;
  rating?: number;
  has_issue: boolean;
  created_at: string;
  comment_preview?: string;
}

/**
 * Helpful vote
 */
export interface HelpfulVote {
  review_id: number;
  user_id: number;
  is_helpful: boolean;
  voted_at: string;
}

/**
 * Review moderation
 */
export interface ReviewModeration {
  review_id: number;
  moderator_id: number;
  action: ModerationAction;
  reason?: string;
  notes?: string;
  moderated_at: string;
}

/**
 * Moderation actions
 */
export type ModerationAction =
  | 'approve'
  | 'reject'
  | 'flag'
  | 'archive'
  | 'delete';

/**
 * Review report
 */
export interface ReviewReport {
  id: number;
  review_id: number;
  reported_by: number;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  resolved_by?: number;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

/**
 * Report reasons
 */
export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'false_information'
  | 'offensive'
  | 'duplicate'
  | 'other';

/**
 * Report status
 */
export type ReportStatus =
  | 'pending'
  | 'under_review'
  | 'resolved'
  | 'dismissed';

/**
 * Item rating summary
 */
export interface ItemRatingSummary {
  item_id: number;
  item_name: string;
  avg_rating: number;
  total_reviews: number;
  rating_distribution: RatingDistribution;
  recommendation_rate: number;
  recent_rating_trend: 'improving' | 'stable' | 'declining';
}

/**
 * User review summary
 */
export interface UserReviewSummary {
  user_id: number;
  user_name: string;
  total_reviews: number;
  avg_rating_given: number;
  helpful_reviews: number;
  verified_reviews: number;
  issues_reported: number;
}

/**
 * Review template
 */
export interface ReviewTemplate {
  id: number;
  name: string;
  questions: ReviewQuestion[];
  is_active: boolean;
  item_categories?: string[];
}

/**
 * Review question
 */
export interface ReviewQuestion {
  id: number;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels?: Record<number, string>;
  };
}

/**
 * Question types
 */
export type QuestionType =
  | 'rating'
  | 'text'
  | 'multiple_choice'
  | 'checkbox'
  | 'scale'
  | 'yes_no';

/**
 * Structured review response
 */
export interface StructuredReviewResponse {
  review_id: number;
  template_id: number;
  responses: QuestionResponse[];
  overall_rating?: number;
}

/**
 * Question response
 */
export interface QuestionResponse {
  question_id: number;
  answer: string | number | string[] | boolean;
}

/**
 * Review sentiment
 */
export interface ReviewSentiment {
  review_id: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  analyzed_at: string;
}

/**
 * Review analytics
 */
export interface ReviewAnalytics {
  period: string;
  total_reviews: number;
  avg_rating: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  top_issues: IssueCount[];
  trending_keywords: KeywordCount[];
  review_velocity: number;
}

/**
 * Issue count
 */
export interface IssueCount {
  issue_type: IssueType;
  count: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Keyword count
 */
export interface KeywordCount {
  keyword: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * Review notification
 */
export interface ReviewNotification {
  id: number;
  review_id: number;
  recipient_id: number;
  notification_type: ReviewNotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

/**
 * Review notification types
 */
export type ReviewNotificationType =
  | 'new_review'
  | 'review_response'
  | 'helpful_vote'
  | 'issue_reported'
  | 'review_flagged'
  | 'review_approved'
  | 'review_rejected';

/**
 * Review export data
 */
export interface ReviewExportData {
  id: number;
  user_name: string;
  user_email: string;
  item_name: string;
  item_code: string;
  rating?: number;
  comment?: string;
  has_issue: boolean;
  issue_type?: IssueType;
  issue_severity?: IssueSeverity;
  status: ReviewStatus;
  helpful_count: number;
  created_at: string;
}

/**
 * Review bulk action
 */
export interface ReviewBulkAction {
  action: ReviewBulkActionType;
  review_ids: number[];
  data?: Record<string, any>;
}

/**
 * Review bulk action types
 */
export type ReviewBulkActionType =
  | 'approve'
  | 'reject'
  | 'flag'
  | 'archive'
  | 'delete'
  | 'export';

/**
 * Review quality score
 */
export interface ReviewQualityScore {
  review_id: number;
  score: number;
  factors: QualityFactor[];
  is_quality_review: boolean;
}

/**
 * Quality factors
 */
export interface QualityFactor {
  factor: string;
  weight: number;
  value: number;
  description: string;
}

/**
 * Featured review
 */
export interface FeaturedReview extends Review {
  featured_at: string;
  featured_by: number;
  featured_reason?: string;
  is_featured: boolean;
}

/**
 * Review incentive
 */
export interface ReviewIncentive {
  id: number;
  user_id: number;
  review_id: number;
  incentive_type: IncentiveType;
  reward_value: number;
  claimed: boolean;
  claimed_at?: string;
  expires_at?: string;
}

/**
 * Incentive types
 */
export type IncentiveType =
  | 'points'
  | 'discount'
  | 'badge'
  | 'extended_borrow_time';