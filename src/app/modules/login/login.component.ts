// import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core"
// import { CommonModule, isPlatformBrowser } from "@angular/common"
// import { HttpClientModule } from "@angular/common/http"
// import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
// import { Router, ActivatedRoute } from "@angular/router"
// import { ApiClientService } from "src/app/core/services/api/apiClient"

// @Component({
//   selector: "app-login",
//   templateUrl: "./login.component.html",
//   styleUrls: ["./login.component.scss"],
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
// })
// export class LoginComponent implements OnInit {
//   loginForm!: FormGroup
//   showPassword = false
//   isLoading = false
//   errorMessage = '';  // ✅ Added property
//   deviceId = '';   
   
//   constructor(
//     private fb: FormBuilder,
//     private router: Router,
//     private apiClient: ApiClientService,
//     @Inject(PLATFORM_ID) private platformId: Object,
//     private route?: ActivatedRoute,
//   ) { }

//   getDeviceId(): string {
//     let deviceId = sessionStorage.getItem("deviceId")
//     if (!deviceId) {
//       deviceId = crypto.randomUUID()
//       sessionStorage.setItem("deviceId", deviceId)
//     }
//     return deviceId
//   }

//   ngOnInit() {
//     this.loginForm = this.fb.group({
//       username: ['', Validators.required],
//       password: ['', Validators.required],
//       rememberMe: [false],
//     });

//     if (isPlatformBrowser(this.platformId)) {
//       const existingToken = sessionStorage.getItem('token');
//       if (existingToken) {
//         this.router.navigate(['/dashboard']);
//       }
//     }

//     const reason = this.route?.snapshot?.queryParamMap?.get('reason');
//     if (reason === 'expired') {
//       this.loginInfo = 'Your session has expired. Please sign in again.';
//     } else if (reason === 'idle') {
//       this.loginInfo = 'You were signed out due to inactivity.';
//     }
//   }

//   get f() {
//     return this.loginForm.controls
//   }

//   togglePasswordVisibility() {
//     this.showPassword = !this.showPassword
//   }

//  onLogin() {
//   if (this.loginForm.valid) {
//     this.isLoading = true;
//     this.errorMessage = '';

//     const credentials = {
//       username: this.loginForm.value.username,
//       password: this.loginForm.value.password,
//       deviceId: this.deviceId
//     };

//     this.apiClient.loginUser(credentials).subscribe({
//         next: (response: any) => {  // ✅ Added type annotation
//           console.log('Login successful:', response);
        
//         // Response is already unwrapped by the service
//         if (response.accessToken) {
//           // Navigate to dashboard or home
//           this.router.navigate(['/dashboard']);
//         } else {
//           this.errorMessage = 'Invalid response from server';
//         }
        
//         this.isLoading = false;
//       },
//       error: (error: any) => {  // ✅ Added type annotation
//           console.error('Login error:', error);
//           this.errorMessage = error.message || 'Login failed. Please try again.';
//           this.isLoading = false;
//       }
//     });
//   }
// }

//   onForgotPassword(event: Event) {
//     event.preventDefault()
//     console.log("Forgot password clicked")
//   }

//   onSignUp(event: Event) {
//     event.preventDefault()
//     console.log("Sign up clicked")
//   }
// }


import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api/apiClient';

@Component({
  selector: 'app-login',
  standalone: true,  // ✅ Add this if it's a standalone component
  imports: [CommonModule, ReactiveFormsModule],  // ✅ Add this
  templateUrl: "./login.component.html",
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  loginError = '';
  loginInfo = '';
  showPassword = false;
  deviceId = '';
  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiClient: ApiClientService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Initialize the login form
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    // Generate or retrieve device ID (only in browser)
    if (this.isBrowser) {
      this.deviceId = this.getOrCreateDeviceId();
    }
  }

  // Getter for easy access to form fields in template
  get f() {
    return this.loginForm.controls;
  }

  // Generate a unique device ID
  private getOrCreateDeviceId(): string {
    if (!this.isBrowser) {
      return 'ssr-device-' + Date.now();
    }

    let deviceId = sessionStorage.getItem('deviceId');
    
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.loginError = '';

      const credentials = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password,
        deviceId: this.deviceId
      };

      this.apiClient.loginUser(credentials).subscribe({
        next: (response: any) => {
          console.log('Login successful:', response);
          
          if (response.accessToken) {
            this.router.navigate(['/dashboard']);
          } else {
            this.loginError = 'Invalid response from server. Please try again.';
          }
          
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Login error:', error);
          this.loginError = error.message || 'Invalid username or password. Please try again.';
          this.isLoading = false;
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}