import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface ApiResponse {
    success?: boolean;
    message?: string;
    data?: any;
}

interface RequestOtpRequest {
    email: string;
}

interface VerifyOtpRequest {
    email: string;
    otp: string;
}

interface ResetPasswordRequest {
    email: string;
    otp: string;
    newPassword: string;
}

@Injectable({
    providedIn: 'root'
})
export class ForgotPasswordApiService {
    private baseUrl: string = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
    }

    
    requestOtp(email: string): Observable<ApiResponse> {
  const url = `${this.baseUrl}/Auth/forgot-password/request-otp`;  
  const body: RequestOtpRequest = { email };
  
  return this.http.post<ApiResponse>(url, body, { 
    headers: this.getHeaders() 
  }).pipe(
    catchError(this.handleError)
  );
}

    verifyOtp(email: string, otp: string): Observable<ApiResponse> {
        const url = `${this.baseUrl}/Auth/forgot-password/verify-otp`;
        const body: VerifyOtpRequest = { email, otp };

        return this.http.post<ApiResponse>(url, body, {
            headers: this.getHeaders()
        }).pipe(
            catchError(this.handleError)
        );
    }

    resetPassword(email: string, otp: string, newPassword: string): Observable<ApiResponse> {
        const url = `${this.baseUrl}/Auth/forgot-password/reset-password`;
        const body: ResetPasswordRequest = { email, otp, newPassword };

        return this.http.post<ApiResponse>(url, body, {
            headers: this.getHeaders()
        }).pipe(
            catchError(this.handleError)
        );
    }

    private handleError(error: any): Observable<never> {
        let errorMessage = 'An unknown error occurred';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Network Error: ${error.error.message}`;
        } else if (error.status === 0) {
            errorMessage = 'Cannot connect to the server. Please check your internet connection.';
        } else if (error.status === 404) {
            errorMessage = 'API endpoint not found. Please contact support.';
        } else if (error.status === 400) {
            if (error.error?.message) {
                errorMessage = error.error.message;
            } else {
                errorMessage = 'Invalid request. Please check your input.';
            }
        } else if (error.status === 429) {
            errorMessage = 'Too many attempts. Please try again later.';
        } else if (error.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
        } else {
            if (error.error?.message) {
                errorMessage = error.error.message;
            } else if (error.error?.title) {
                errorMessage = error.error.title;
            } else {
                errorMessage = `Error: ${error.status} - ${error.statusText}`;
            }
        }

        console.error('Forgot Password API Error:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            message: errorMessage,
            error: error.error
        });

        throw new Error(errorMessage);
    }
}