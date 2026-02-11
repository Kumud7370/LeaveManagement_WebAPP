import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiClientService } from './apiClient';
import { environment } from '../../../../environments/environment';

describe('ApiClientService', () => {
  let service: ApiClientService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiClientService]
    });
    service = TestBed.inject(ApiClientService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ==================== Authentication Token Tests ====================

  describe('Token Management', () => {
    it('should set and get auth token', () => {
      const token = 'test-token-123';
      service.setAuthToken(token);
      
      const storedToken = localStorage.getItem('accessToken');
      expect(storedToken).toBe(token);
    });

    it('should set refresh token', () => {
      const refreshToken = 'refresh-token-123';
      service.setRefreshToken(refreshToken);
      
      const storedToken = localStorage.getItem('refreshToken');
      expect(storedToken).toBe(refreshToken);
    });

    it('should clear tokens', () => {
      service.setAuthToken('access-token');
      service.setRefreshToken('refresh-token');
      service.clearTokens();
      
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  // ==================== HTTP Method Tests ====================

  describe('HTTP GET', () => {
    it('should make a GET request', () => {
      const mockResponse = { data: 'test' };
      
      service.get<any>('test-endpoint').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include Authorization header when token exists', () => {
      const token = 'test-token';
      service.setAuthToken(token);
      
      service.get('test-endpoint').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({});
    });
  });

  describe('HTTP POST', () => {
    it('should make a POST request', () => {
      const mockData = { name: 'test' };
      const mockResponse = { id: 1, name: 'test' };
      
      service.post<any>('test-endpoint', mockData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockData);
      req.flush(mockResponse);
    });
  });

  describe('HTTP PUT', () => {
    it('should make a PUT request', () => {
      const mockData = { id: 1, name: 'updated' };
      const mockResponse = { success: true };
      
      service.put<any>('test-endpoint', mockData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockData);
      req.flush(mockResponse);
    });
  });

  describe('HTTP PATCH', () => {
    it('should make a PATCH request', () => {
      const mockData = { name: 'patched' };
      
      service.patch<any>('test-endpoint', mockData).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });
  });

  describe('HTTP DELETE', () => {
    it('should make a DELETE request', () => {
      service.delete<any>('test-endpoint').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  // ==================== Authentication Endpoint Tests ====================

  describe('Authentication Endpoints', () => {
    it('should login and store tokens', () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      const mockResponse = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: { id: 1, email: 'test@example.com' }
      };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('accessToken')).toBe(mockResponse.accessToken);
        expect(localStorage.getItem('refreshToken')).toBe(mockResponse.refreshToken);
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });

    it('should register a new user', () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password',
        name: 'New User'
      };

      service.register(userData).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush({ success: true });
    });

    it('should logout and clear tokens', () => {
      service.setAuthToken('token');
      service.setRefreshToken('refresh');

      service.logout().subscribe(() => {
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('should refresh token', () => {
      const refreshToken = 'old-refresh-token';
      localStorage.setItem('refreshToken', refreshToken);
      
      const mockResponse = { accessToken: 'new-access-token' };

      service.refreshToken().subscribe(response => {
        expect(localStorage.getItem('accessToken')).toBe(mockResponse.accessToken);
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken });
      req.flush(mockResponse);
    });

    it('should request forgot password', () => {
      const email = 'test@example.com';

      service.forgotPassword(email).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });
      req.flush({ success: true });
    });

    it('should reset password', () => {
      const resetData = { token: 'reset-token', newPassword: 'newpass123' };

      service.resetPassword(resetData).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(resetData);
      req.flush({ success: true });
    });
  });

  // ==================== User Endpoint Tests ====================

  describe('User Endpoints', () => {
    it('should get current user', () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

      service.getCurrentUser().subscribe(user => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${baseUrl}/users/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should update user profile', () => {
      const updateData = { name: 'Updated Name' };

      service.updateProfile(updateData).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/users/me`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush({ success: true });
    });

    it('should get all users', () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' }
      ];

      service.getUsers().subscribe(users => {
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(`${baseUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('should get user by ID', () => {
      const userId = '123';
      const mockUser = { id: userId, email: 'user@example.com' };

      service.getUserById(userId).subscribe(user => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${baseUrl}/users/${userId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  // ==================== Attendance Endpoint Tests ====================

  describe('Attendance Endpoints', () => {
    it('should mark attendance', () => {
      const attendanceData = {
        userId: '123',
        status: 'present',
        date: '2024-01-01'
      };

      service.markAttendance(attendanceData).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/attendance`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(attendanceData);
      req.flush({ success: true });
    });

    it('should get attendance records', () => {
      const mockAttendance = [{ id: 1, status: 'present' }];

      service.getAttendance().subscribe(attendance => {
        expect(attendance).toEqual(mockAttendance);
      });

      const req = httpMock.expectOne(`${baseUrl}/attendance`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAttendance);
    });

    it('should get attendance with query parameters', () => {
      const params = { userId: '123', date: '2024-01-01' };

      service.getAttendance(params).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes(`${baseUrl}/attendance`) && 
               request.url.includes('userId=123') &&
               request.url.includes('date=2024-01-01');
      });
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should get attendance by ID', () => {
      const attendanceId = '123';
      const mockAttendance = { id: attendanceId, status: 'present' };

      service.getAttendanceById(attendanceId).subscribe(attendance => {
        expect(attendance).toEqual(mockAttendance);
      });

      const req = httpMock.expectOne(`${baseUrl}/attendance/${attendanceId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAttendance);
    });

    it('should update attendance', () => {
      const attendanceId = '123';
      const updateData = { status: 'absent' };

      service.updateAttendance(attendanceId, updateData).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/attendance/${attendanceId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush({ success: true });
    });

    it('should delete attendance', () => {
      const attendanceId = '123';

      service.deleteAttendance(attendanceId).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/attendance/${attendanceId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('should handle HTTP error responses', () => {
      const errorMessage = 'Server error occurred';

      service.get('test-endpoint').subscribe(
        () => fail('should have failed with 500 error'),
        (error) => {
          expect(error).toBeTruthy();
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      req.flush({ message: errorMessage }, { status: 500, statusText: 'Server Error' });
    });

    it('should handle network errors', () => {
      service.get('test-endpoint').subscribe(
        () => fail('should have failed with network error'),
        (error) => {
          expect(error).toBeTruthy();
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/test-endpoint`);
      req.error(new ErrorEvent('Network error'));
    });
  });
});