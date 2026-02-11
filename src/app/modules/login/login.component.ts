import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core"
import { CommonModule, isPlatformBrowser } from "@angular/common"
import { HttpClientModule } from "@angular/common/http"
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Router, ActivatedRoute } from "@angular/router"
import { ApiClientService } from "src/app/core/services/api/apiClient"

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup
  showPassword = false
  isLoading = false
  loginError = ""
  loginInfo = ""
   
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dbService: ApiClientService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private route?: ActivatedRoute,
  ) { }

  getDeviceId(): string {
    let deviceId = sessionStorage.getItem("deviceId")
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      sessionStorage.setItem("deviceId", deviceId)
    }
    return deviceId
  }

  ngOnInit() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      rememberMe: [false],
    });

    if (isPlatformBrowser(this.platformId)) {
      const existingToken = sessionStorage.getItem('token');
      if (existingToken) {
        this.router.navigate(['/dashboard']);
      }
    }

    const reason = this.route?.snapshot?.queryParamMap?.get('reason');
    if (reason === 'expired') {
      this.loginInfo = 'Your session has expired. Please sign in again.';
    } else if (reason === 'idle') {
      this.loginInfo = 'You were signed out due to inactivity.';
    }
  }

  get f() {
    return this.loginForm.controls
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched()
      return
    }

    this.isLoading = true
    this.loginError = ''
    
    const { username, password } = this.loginForm.value
    const deviceId = this.getDeviceId()
    
    console.log('Attempting login...', { username, deviceId });
    
    this.dbService.loginUser({ username, password, deviceId }).subscribe({
      next: (res: any) => {
        console.log('Login response:', res);
        
        // Handle response structure - check multiple possible formats
        if (res && res.status === "success" && res.data) {
          // Format 1: Nested data structure
          sessionStorage.setItem("UserId", res.data.userId || res.data.id || '')
          sessionStorage.setItem("SiteName", res.data.locationName || '')
          sessionStorage.setItem("RoleName", res.data.roleName || res.data.role || '')
          sessionStorage.setItem("token", res.data.token || res.data.accessToken || '')
          sessionStorage.setItem("username", username)
          sessionStorage.setItem("role", res.data.role || '')
          
          if (res.data.refreshToken) {
            sessionStorage.setItem("refreshToken", res.data.refreshToken)
          }
          
          this.router.navigate(["/dashboard"])
        } 
        else if (res && (res.token || res.accessToken)) {
          // Format 2: Direct response structure
          sessionStorage.setItem("UserId", res.userId || res.id || '')
          sessionStorage.setItem("SiteName", res.locationName || '')
          sessionStorage.setItem("RoleName", res.roleName || res.role || '')
          sessionStorage.setItem("token", res.token || res.accessToken || '')
          sessionStorage.setItem("username", username)
          sessionStorage.setItem("role", res.role || '')
          
          if (res.refreshToken) {
            sessionStorage.setItem("refreshToken", res.refreshToken)
          }
          
          this.router.navigate(["/dashboard"])
        } 
        else {
          this.loginError = "Invalid response from server. Please try again."
          console.error('Unexpected response format:', res)
        }
        
        this.isLoading = false
      },
      error: (err: any) => {
        console.error('Login error:', err);
        
        if (err.message && err.message.includes('Cannot connect')) {
          this.loginError = "Cannot connect to server. Please ensure the API is running."
        } else if (err.message) {
          this.loginError = err.message
        } else {
          this.loginError = "Login failed. Please check your credentials and try again."
        }
        
        this.isLoading = false
      },
    })
  }

  onForgotPassword(event: Event) {
    event.preventDefault()
    console.log("Forgot password clicked")
  }

  onSignUp(event: Event) {
    event.preventDefault()
    console.log("Sign up clicked")
  }
}