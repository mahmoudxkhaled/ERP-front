import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';

@Component({
    selector: 'app-entity-form',
    templateUrl: './entity-form.component.html',
    styleUrls: ['./entity-form.component.scss'],
    providers: [MessageService]
})
export class EntityFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    entityId: string = '';
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.entityId = this.route.snapshot.paramMap.get('id') || '';
        this.isEdit = !!this.entityId;
        this.initForm();

        if (this.isEdit) {
            this.loadEntity();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            name: ['', [Validators.required]],
            countryCode: ['', [Validators.required]],
            timezone: [''],
            taxId: ['']
        });
    }

    loadEntity(): void {

    }

    submit(): void {

    }

    cancel(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    get f() {
        return this.form.controls;
    }
}

