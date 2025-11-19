/**
 * New Reference Request Component
 *
 * Multi-step form for creating a new reference request:
 * Step 1: Referrer Information
 * Step 2: Question Selection (AI-generated + custom)
 * Step 3: Format Preferences
 * Step 4: Employer Reach-back Permission
 * Step 5: Review and Send
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { ReferenceRequestActions } from '../../../store/seeker.actions';
import { selectIsLoadingRequests, selectError } from '../../../store/seeker.selectors';
import {
  Question,
  ReferenceFormat,
  CreateReferenceRequestPayload,
} from '../../../models/seeker.models';

/**
 * New Request Component
 */
@Component({
  selector: 'app-new-request',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-request.component.html',
  styleUrls: ['./new-request.component.scss'],
})
export class NewRequestComponent implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);

  // Current step (1-5)
  currentStep = signal(1);
  totalSteps = 5;

  // Forms for each step
  referrerForm!: FormGroup;
  questionsForm!: FormGroup;
  formatForm!: FormGroup;
  permissionsForm!: FormGroup;

  // Data
  selectedQuestions = signal<Question[]>([]);
  aiGeneratedQuestions = signal<Question[]>([]);
  customQuestions = signal<string[]>([]);
  selectedFormats = signal<ReferenceFormat[]>([]);

  // Loading states
  isLoading$ = this.store.select(selectIsLoadingRequests);
  error$ = this.store.select(selectError);
  isGeneratingQuestions = signal(false);

  // Format options
  formatOptions = [
    { value: ReferenceFormat.VIDEO, label: 'Video', icon: 'pi-video' },
    { value: ReferenceFormat.AUDIO, label: 'Audio', icon: 'pi-microphone' },
    { value: ReferenceFormat.TEXT, label: 'Text', icon: 'pi-file-edit' },
  ];

  ngOnInit(): void {
    this.initializeForms();
  }

  initializeForms(): void {
    // Step 1: Referrer Information
    this.referrerForm = this.fb.group({
      referrerName: ['', [Validators.required, Validators.minLength(2)]],
      referrerEmail: ['', [Validators.required, Validators.email]],
      company: ['', [Validators.required]],
      role: ['', [Validators.required]],
      workingRelationship: [''],
    });

    // Step 2: Questions (handled separately with checkboxes)
    this.questionsForm = this.fb.group({});

    // Step 3: Format Preferences
    this.formatForm = this.fb.group({
      formats: [[], [Validators.required]],
    });

    // Step 4: Permissions
    this.permissionsForm = this.fb.group({
      allowEmployerReachback: [false],
    });
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep.update((step) => Math.min(step + 1, this.totalSteps));
    }
  }

  previousStep(): void {
    this.currentStep.update((step) => Math.max(step - 1, 1));
  }

  goToStep(step: number): void {
    if (step <= this.currentStep() || this.validateCurrentStep()) {
      this.currentStep.set(step);
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep()) {
      case 1:
        return this.referrerForm.valid;
      case 2:
        return this.selectedQuestions().length > 0;
      case 3:
        return this.selectedFormats().length > 0;
      case 4:
        return this.permissionsForm.valid;
      case 5:
        return true;
      default:
        return false;
    }
  }

  generateAiQuestions(): void {
    const { role, company } = this.referrerForm.value;
    this.isGeneratingQuestions.set(true);

    this.store.dispatch(
      ReferenceRequestActions.generateQuestions({
        request: {
          jobDescription: `${role} at ${company}`,
          role,
        },
      })
    );

    // Simulate AI generation (replace with actual response handling)
    setTimeout(() => {
      this.aiGeneratedQuestions.set([
        {
          id: '1',
          text: 'How would you describe their work ethic and reliability?',
          category: 'Work Performance',
          isAiGenerated: true,
          isRequired: false,
        },
        {
          id: '2',
          text: 'What were their key strengths in this role?',
          category: 'Strengths',
          isAiGenerated: true,
          isRequired: false,
        },
        {
          id: '3',
          text: 'How did they handle challenging situations or pressure?',
          category: 'Problem Solving',
          isAiGenerated: true,
          isRequired: false,
        },
        {
          id: '4',
          text: 'Would you hire them again? Why or why not?',
          category: 'Overall Assessment',
          isAiGenerated: true,
          isRequired: false,
        },
      ]);
      this.isGeneratingQuestions.set(false);
    }, 1500);
  }

  toggleQuestion(question: Question): void {
    const questions = this.selectedQuestions();
    const index = questions.findIndex((q) => q.id === question.id);

    if (index > -1) {
      this.selectedQuestions.set(questions.filter((q) => q.id !== question.id));
    } else {
      this.selectedQuestions.set([...questions, question]);
    }
  }

  isQuestionSelected(question: Question): boolean {
    return this.selectedQuestions().some((q) => q.id === question.id);
  }

  addCustomQuestion(questionText: string): void {
    if (questionText.trim()) {
      const newQuestion: Question = {
        id: `custom-${Date.now()}`,
        text: questionText.trim(),
        category: 'Custom',
        isAiGenerated: false,
        isRequired: false,
      };
      this.selectedQuestions.set([...this.selectedQuestions(), newQuestion]);
    }
  }

  toggleFormat(format: ReferenceFormat): void {
    const formats = this.selectedFormats();
    const index = formats.indexOf(format);

    if (index > -1) {
      this.selectedFormats.set(formats.filter((f) => f !== format));
    } else {
      this.selectedFormats.set([...formats, format]);
    }
    this.formatForm.patchValue({ formats: this.selectedFormats() });
  }

  isFormatSelected(format: ReferenceFormat): boolean {
    return this.selectedFormats().includes(format);
  }

  submitRequest(): void {
    if (!this.validateAllSteps()) {
      return;
    }

    const payload: CreateReferenceRequestPayload = {
      ...this.referrerForm.value,
      questions: this.selectedQuestions(),
      allowedFormats: this.selectedFormats(),
      allowEmployerReachback: this.permissionsForm.value.allowEmployerReachback,
    };

    this.store.dispatch(ReferenceRequestActions.createRequest({ payload }));
  }

  validateAllSteps(): boolean {
    return (
      this.referrerForm.valid &&
      this.selectedQuestions().length > 0 &&
      this.selectedFormats().length > 0 &&
      this.permissionsForm.valid
    );
  }

  cancel(): void {
    this.router.navigate(['/app/seeker/requests']);
  }
}
