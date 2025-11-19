import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SentryService } from '../../../core/monitoring/services/sentry.service';

@Component({
  selector: 'app-sentry-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sentry-feedback.component.html',
  styleUrls: ['./sentry-feedback.component.scss'],
})
export class SentryFeedbackComponent {
  @Input() eventId?: string;
  @Input() autoShow = false;

  isVisible = false;
  isSubmitting = false;
  isSubmitted = false;

  feedbackData = {
    name: '',
    email: '',
    comments: '',
  };

  errorMessage = '';

  constructor(private sentryService: SentryService) {}

  ngOnInit(): void {
    if (this.autoShow) {
      this.show();
    }
  }

  show(): void {
    this.isVisible = true;
  }

  hide(): void {
    this.isVisible = false;
    this.reset();
  }

  async submitFeedback(): Promise<void> {
    if (!this.feedbackData.comments.trim()) {
      this.errorMessage = 'Please provide some feedback';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Use Sentry's built-in feedback dialog
      const eventId = this.eventId || this.sentryService.getLastEventId();
      if (eventId) {
        this.sentryService.showReportDialog(eventId);
        this.hide();
      } else {
        // If no event ID, create a new message
        this.sentryService.captureMessage('User Feedback', 'info', {
          extra: {
            name: this.feedbackData.name,
            email: this.feedbackData.email,
            comments: this.feedbackData.comments,
          },
        });
        this.isSubmitted = true;
        setTimeout(() => this.hide(), 2000);
      }
    } catch (error) {
      this.errorMessage = 'Failed to submit feedback. Please try again.';
      console.error('Feedback submission error:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private reset(): void {
    this.feedbackData = {
      name: '',
      email: '',
      comments: '',
    };
    this.isSubmitted = false;
    this.errorMessage = '';
  }
}
