import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { EcncryptionService } from 'src/app/core/Services/ecncryption.service';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss'
})
export class ForgetPasswordComponent implements OnInit, OnDestroy {

  loginCreditials: FormGroup;
  validationMessage : string = '';
  isLoading$: Observable<boolean>;
  unsubscribe: Subscription[] = [];

  get email() {
    return this.loginCreditials.get('email');
  }

  constructor(private router: Router,
    private apiService: AuthService, 
    private localStorageService : LocalStorageService,    
    private ecncrypServ: EcncryptionService) {
    this.isLoading$ = this.apiService.isLoadingSubject;
   }

  ngOnInit(): void {
    this.initForm();
  }

  initForm() {
    this.loginCreditials = new FormGroup({
      email: new FormControl<String>('', [Validators.required, Validators.email]),
    });
  }

  sendCode() {
    this.validationMessage = ''
    if (this.email && this.email.value) {
      this.apiService.forgetPassword(this.email.value).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.localStorageService.setItem('email', this.ecncrypServ.encryptText(res.data));
            this.router.navigateByUrl('/auth/verify-code')
          }else{
            this.validationMessage = 'Email doesn’t exist';
          }
        },
        error: (err) => {
          console.log(err)
        }
      })
    } else {
      this.loginCreditials.controls['email'].setErrors({ invalid: true });
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((u) => {
        u.unsubscribe();
    });
  }
}