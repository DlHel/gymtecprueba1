export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const APP_NAME = 'GymTec';
export const TOKEN_KEY = 'gymtec_token';

export const ROUTES = {
  LOGIN: '/login',
  ADMIN_DASHBOARD: '/admin',
  USER_DASHBOARD: '/user',
  ADMIN_USERS: '/admin/users',
  ADMIN_CLASSES: '/admin/classes',
  USER_PROFILE: '/user/profile',
  USER_CLASSES: '/user/classes',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
