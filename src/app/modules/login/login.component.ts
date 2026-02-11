// import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core"
// import { CommonModule, isPlatformBrowser } from "@angular/common"
// import { HttpClientModule } from "@angular/common/http"
// import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
// import { Router, ActivatedRoute } from "@angular/router"
// import { DbCallingService } from "src/app/core/services/db-calling.service"

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
//   loginError = ""
//   loginInfo = ""
   
//   constructor(
//     private fb: FormBuilder,
//     private router: Router,
//     private dbService: DbCallingService,
//    @Inject(PLATFORM_ID) private platformId: Object,
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

// ngOnInit() {
//   this.loginForm = this.fb.group({
//     username: ['', Validators.required],
//     password: ['', Validators.required],
//     rememberMe: [false],
//   });

//   if (isPlatformBrowser(this.platformId)) {
//     const existingToken = sessionStorage.getItem('token');
//     if (existingToken) {
//       this.router.navigate(['/dashboard']);
//     }
//   }

//   const reason = this.route?.snapshot?.queryParamMap?.get('reason');
//   if (reason === 'expired') {
//     this.loginInfo = 'Your session has expired. Please sign in again.';
//   } else if (reason === 'idle') {
//     this.loginInfo = 'You were signed out due to inactivity.';
//   }
// }


//   get f() {
//     return this.loginForm.controls
//   }

//   togglePasswordVisibility() {
//     this.showPassword = !this.showPassword
//   }

//   onLogin() {
//     if (this.loginForm.invalid) {
//       this.loginForm.markAllAsTouched()
//       return
//     }

//     this.isLoading = true
//     const { username, password } = this.loginForm.value
//     const deviceId = this.getDeviceId()
//     this.dbService.loginUser({ username, password, deviceId }).subscribe({
//       next: (res: any) => {
//         if (res && res.status === "success") {
//           // Login successful
//           sessionStorage.setItem("UserId", res.data.userId)
//           sessionStorage.setItem("SiteName", res.data.locationName)
//           sessionStorage.setItem("RoleName", res.data.roleName)
//           sessionStorage.setItem("token", res.data.token)
//           // localStorage.setItem("token", res.data.token)
//           sessionStorage.setItem("username", username)
//           sessionStorage.setItem("role", res.data.role)
//           // localStorage.setItem("RoleName", res.data.roleName)
//           this.router.navigate(["/dashboard"])
//         } else {
//           this.loginError = "Invalid username or password"
//         }
//         this.isLoading = false
//       },
//       error: (_err: any) => {
//         this.loginError = "Login failed. Please try again."
//         this.isLoading = false
//       },
//     })
//   }

//   onForgotPassword(event: Event) {
//     event.preventDefault()
//     console.log("Forgot password clicked")
//   }

//   onSignUp(event: Event) {
//     event.preventDefault()
//     console.log("Sign up clicked")
//   }
// }