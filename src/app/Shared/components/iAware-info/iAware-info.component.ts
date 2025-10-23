import { AfterViewInit, Component, ElementRef, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-iAware-info',
  templateUrl: './iAware-info.component.html',
  styleUrl: './iAware-info.component.scss'
})
export class IAwareInfoComponent implements OnInit, AfterViewInit {
  @Input() icon: string = 'fas fa-info-circle text-primary'; // Default icon
  @Input() severity: string = 'info'; // Default severity
  @Input() title: string = 'Title Here'; // Default Title
  @Input() description: string = 'Description here...'; // Default description
  @Input() isDynamic: boolean = false; // Determines if description is dynamic or static
  @Input() isDashboard: boolean = false; // Determines if description is dynamic or static
  safeDescription: SafeHtml = ''; 
  get boxClass() {
    return `color-box ${this.severity}`;
  }

  constructor(private sanitizer: DomSanitizer, private router: Router, private elementRef: ElementRef) { }

  ngAfterViewInit(): void {
      const links = this.elementRef.nativeElement.querySelectorAll('.dynamic-link');
      links.forEach((link: HTMLAnchorElement) => {
        link.addEventListener('click', (event: MouseEvent) => {
          event.preventDefault();
          const path = link.getAttribute('data-path');
          if (path) {
            this.router.navigateByUrl(path);
          }
        });
      });
  }

  ngOnInit(): void {
    if (this.isDynamic) {
      this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(this.description);
    }
  }
}