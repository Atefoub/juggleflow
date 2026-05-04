export type Role =
  | 'ROLE_ELEVE'
  | 'ROLE_ENSEIGNANT'
  | 'ROLE_ADMINISTRATEUR';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Réponse d'authentification reçue dans le body HTTP.
 *
 * Le refresh token n'est PAS présent ici — il est transmis exclusivement
 * via le cookie httpOnly posé par le backend (inaccessible à JavaScript).
 */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}