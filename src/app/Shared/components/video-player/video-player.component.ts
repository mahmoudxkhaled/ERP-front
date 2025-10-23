import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-video-player',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './video-player.component.html',
    styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
    @Input() videoUrl: string = '';
    @Output() videoCompleted = new EventEmitter<void>();
    @Output() videoProgress = new EventEmitter<number>();

    safeVideoUrl: SafeResourceUrl | null = null;

    constructor(private sanitizer: DomSanitizer) { }

    ngOnInit(): void {
        this.initializeVideo();
    }

    private initializeVideo(): void {
        this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.videoUrl);
    }

    onTimeUpdate(event: Event): void {
        const video = event.target as HTMLVideoElement;
        if (video) {
            this.videoProgress.emit(video.currentTime);
        }
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }
} 