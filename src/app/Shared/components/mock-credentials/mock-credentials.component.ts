import { Component, OnInit } from '@angular/core';
import { MockDataService } from 'src/app/core/Services/mock-data.service';

@Component({
    selector: 'app-mock-credentials',
    templateUrl: './mock-credentials.component.html',
    styleUrls: ['./mock-credentials.component.scss']
})
export class MockCredentialsComponent implements OnInit {
    mockCredentials: { email: string; password: string; role: string; department?: string; jobTitle?: string }[] = [];

    constructor(private mockDataService: MockDataService) { }

    ngOnInit(): void {
        this.mockCredentials = this.mockDataService.getMockCredentials();
    }

    copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard:', text);
        });
    }
}
