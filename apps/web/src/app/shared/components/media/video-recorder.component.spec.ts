/**
 * Video Recorder Component Tests
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VideoRecorderComponent } from './video-recorder.component';

describe('VideoRecorderComponent', () => {
  let component: VideoRecorderComponent;
  let fixture: ComponentFixture<VideoRecorderComponent>;

  // Mock MediaRecorder
  class MockMediaRecorder {
    state: 'inactive' | 'recording' | 'paused' = 'inactive';
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    mimeType: string;

    constructor(stream: MediaStream, options: any) {
      this.mimeType = options.mimeType;
    }

    start(timeslice?: number): void {
      this.state = 'recording';
    }

    pause(): void {
      this.state = 'paused';
    }

    resume(): void {
      this.state = 'recording';
    }

    stop(): void {
      this.state = 'inactive';
      if (this.onstop) {
        this.onstop();
      }
    }

    static isTypeSupported(type: string): boolean {
      return type === 'video/webm;codecs=vp9,opus' || type === 'video/webm';
    }
  }

  beforeEach(async () => {
    // Mock MediaRecorder
    (window as any).MediaRecorder = MockMediaRecorder;

    // Mock getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jasmine
          .createSpy('getUserMedia')
          .and.returnValue(Promise.resolve(new MediaStream())),
      },
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [VideoRecorderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoRecorderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (component) {
      component.ngOnDestroy();
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Browser Support', () => {
    it('should detect browser support correctly', () => {
      expect(component.isSupported()).toBe(true);
    });

    it('should detect lack of support', () => {
      delete (window as any).MediaRecorder;
      const unsupportedComponent = new VideoRecorderComponent();
      expect(unsupportedComponent.isSupported()).toBe(false);
    });
  });

  describe('Recording Controls', () => {
    it('should start recording', fakeAsync(() => {
      component.startRecording();
      tick(100);

      expect(component.isRecording()).toBe(true);
      expect(component.isInitializing()).toBe(false);
    }));

    it('should handle permission denied', fakeAsync(() => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      (navigator.mediaDevices.getUserMedia as jasmine.Spy).and.returnValue(
        Promise.reject(error)
      );

      component.startRecording();
      tick(100);

      expect(component.permissionDenied()).toBe(true);
      expect(component.error()).toContain('Camera permission denied');
    }));

    it('should pause recording', fakeAsync(() => {
      component.startRecording();
      tick(100);

      component.togglePause();

      expect(component.isPaused()).toBe(true);
      expect(component.isRecording()).toBe(false);
    }));

    it('should resume recording', fakeAsync(() => {
      component.startRecording();
      tick(100);

      component.togglePause();
      tick(100);

      component.togglePause();

      expect(component.isPaused()).toBe(false);
      expect(component.isRecording()).toBe(true);
    }));

    it('should stop recording', fakeAsync(() => {
      component.startRecording();
      tick(100);

      component.stopRecording();

      expect(component.isRecording()).toBe(false);
      expect(component.isPaused()).toBe(false);
    }));
  });

  describe('Recording Duration', () => {
    it('should track duration while recording', fakeAsync(() => {
      component.startRecording();
      tick(100);

      expect(component.duration()).toBe(0);

      tick(1000);
      expect(component.duration()).toBe(1);

      tick(2000);
      expect(component.duration()).toBe(3);
    }));

    it('should format duration correctly', () => {
      component.duration.set(0);
      expect(component.formattedDuration()).toBe('0:00');

      component.duration.set(65);
      expect(component.formattedDuration()).toBe('1:05');

      component.duration.set(125);
      expect(component.formattedDuration()).toBe('2:05');
    });
  });

  describe('Re-recording', () => {
    it('should clear previous recording on re-record', fakeAsync(() => {
      // First recording
      component.startRecording();
      tick(100);
      component.stopRecording();
      tick(100);

      expect(component.hasRecording()).toBe(true);

      // Re-record
      component.reRecord();
      tick(100);

      expect(component.hasRecording()).toBe(false);
      expect(component.duration()).toBe(0);
      expect(component.isRecording()).toBe(true);
    }));
  });

  describe('Recording Events', () => {
    it('should emit recordingComplete event', fakeAsync(() => {
      let emittedVideo: any = null;
      component.recordingComplete.subscribe((video) => {
        emittedVideo = video;
      });

      component.startRecording();
      tick(100);

      // Mock recording data
      if (component['mediaRecorder']) {
        const mockBlob = new Blob(['test'], { type: 'video/webm' });
        component['recordedChunks'] = [mockBlob];
      }

      component.stopRecording();
      tick(100);

      component.useRecording();

      expect(emittedVideo).toBeTruthy();
      expect(emittedVideo.blob).toBeTruthy();
      expect(emittedVideo.url).toBeTruthy();
    }));

    it('should emit recordingError event on error', fakeAsync(() => {
      let emittedError: any = null;
      component.recordingError.subscribe((error) => {
        emittedError = error;
      });

      const error = new Error('Test error');
      (navigator.mediaDevices.getUserMedia as jasmine.Spy).and.returnValue(
        Promise.reject(error)
      );

      component.startRecording();
      tick(100);

      expect(emittedError).toBeTruthy();
    }));
  });

  describe('MIME Type Support', () => {
    it('should get supported MIME type', () => {
      const mimeType = component['getSupportedMimeType']();
      expect(mimeType).toBeTruthy();
      expect(typeof mimeType).toBe('string');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on destroy', fakeAsync(() => {
      component.startRecording();
      tick(100);

      spyOn(component, 'stopRecording');

      component.ngOnDestroy();

      expect(component.stopRecording).toHaveBeenCalled();
    }));

    it('should revoke object URL on destroy', fakeAsync(() => {
      spyOn(URL, 'revokeObjectURL');

      const mockVideo = {
        blob: new Blob(['test'], { type: 'video/webm' }),
        url: 'blob:test',
        duration: 10,
        mimeType: 'video/webm',
      };

      component.recordedVideo.set(mockVideo);

      component.ngOnDestroy();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    }));
  });
});
