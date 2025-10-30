import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

@Component({
    selector: 'app-coming-soon',
    templateUrl: './coming-soon.component.html',
    styleUrls: ['./coming-soon.component.scss'],
    standalone: true,
    imports: [CommonModule, ButtonModule, SharedModule]
})
export class ComingSoonComponent {

    constructor() { }

}
