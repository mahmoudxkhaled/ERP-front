import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.component.html',
  styleUrl: './verify-code.component.scss'
})
export class VerifyCodeComponent {

  email: any = '';
  validationMessage: string = '';
  form : FormGroup;
  isLoading$: Observable<boolean>;
  unsubscribe: Subscription[] = [];
  
  constructor(
    private apiService: AuthService,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {
    this.isLoading$ = this.apiService.isLoadingSubject;
  }

  ngOnInit(): void {
    this.email = this.localStorageService.getItem('email');
    this.form = new FormGroup({
      code1: new FormControl<string>('', Validators.required),
      code2: new FormControl<string>('', Validators.required),
      code3: new FormControl<string>('', Validators.required),
      code4: new FormControl<string>('', Validators.required),
      code5: new FormControl<string>('', Validators.required),
    });
  }

  verifyCode() {
    this.validationMessage = ''
    const code = [
      this.form.controls?.['code1'].value,
      this.form.controls?.['code2'].value,
      this.form.controls?.['code3'].value,
      this.form.controls?.['code4'].value,
      this.form.controls?.['code5'].value,
    ].join('');

    if(code && this.email){
      this.apiService.verifyCode(this.email, code).subscribe({
        next: (res) => {
          if (res.isSuccess) { 
            this.router.navigateByUrl(`/auth/resetPassword/${this.email}`);
          }else{
            this.validationMessage = res.message;
          }
        },
        error: (error) => {
        }
      });
    }
  }

  moveToNext(event: any, nextInputId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length === 1 && /^[0-9]$/.test(input.value)) {
      const nextInput = document.getElementById(nextInputId) as HTMLInputElement;
      nextInput?.focus();
    }
  }
  
  moveToPrev(event: any, prevInputId: string): void {
    this.validationMessage = ''
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value === '') {
      const prevInput = document.getElementById(prevInputId) as HTMLInputElement;
      prevInput?.focus();
    }
  }
}