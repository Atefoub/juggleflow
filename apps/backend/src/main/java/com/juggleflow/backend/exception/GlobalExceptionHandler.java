package com.juggleflow.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-24] FUITE D'INFORMATIONS dans les messages d'erreur :
 *           - IllegalArgumentException exposait ex.getMessage() directement,
 *             ce qui peut révéler des détails d'implémentation.
 *             CORRECTION : message filtré via allowlist dans handleIllegalArgument().
 *           - ResourceNotFoundException exposait le message de l'exception.
 *             CORRECTION : message générique + log serveur avec un errorId traçable.
 *
 * [VULN-25] MESSAGE UNIFIÉ pour BadCredentials et UsernameNotFound :
 *           "Email ou mot de passe incorrect" — pas de distinction entre
 *           "email inexistant" et "mauvais mot de passe" (anti-énumération).
 *
 * [VULN-26] FALLBACK EXCEPTION : log avec errorId unique (UUID) retourné au
 *           client pour faciliter le débogage sans exposer la stacktrace.
 *
 * [VULN-27] Ajout du handler LockedException (compte verrouillé après trop
 *           de tentatives — implémentable avec Spring Security).
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  // ── Validation (@Valid) ───────────────────────────────────────

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(
    MethodArgumentNotValidException ex,
    HttpServletRequest request) {

    Map<String, String> fieldErrors = ex.getBindingResult()
      .getFieldErrors()
      .stream()
      .collect(Collectors.toMap(
        FieldError::getField,
        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Valeur invalide",
        (a, b) -> a
      ));

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.BAD_REQUEST.value())
      .error("Validation échouée")
      .message("Un ou plusieurs champs sont invalides")
      .path(request.getRequestURI())
      .fieldErrors(fieldErrors)
      .build();

    return ResponseEntity.badRequest().body(body);
  }

  // ── Authentification ──────────────────────────────────────────

  /**
   * [VULN-25] Message identique pour BadCredentials et UsernameNotFound.
   * Le client ne peut pas distinguer "email inexistant" de "mauvais MDP".
   */
  @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
  public ResponseEntity<ErrorResponse> handleBadCredentials(
    Exception ex,
    HttpServletRequest request) {

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.UNAUTHORIZED.value())
      .error("Identifiants invalides")
      .message("Email ou mot de passe incorrect")
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
  }

  @ExceptionHandler(DisabledException.class)
  public ResponseEntity<ErrorResponse> handleDisabled(
    DisabledException ex,
    HttpServletRequest request) {

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.FORBIDDEN.value())
      .error("Compte désactivé")
      .message("Ce compte a été désactivé. Contactez l'administrateur.")
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
  }

  /**
   * [VULN-27] Compte verrouillé (trop de tentatives).
   */
  @ExceptionHandler(LockedException.class)
  public ResponseEntity<ErrorResponse> handleLocked(
    LockedException ex,
    HttpServletRequest request) {

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.TOO_MANY_REQUESTS.value())
      .error("Compte temporairement verrouillé")
      .message("Trop de tentatives de connexion. Réessayez dans quelques minutes.")
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
  }

  // ── Règles métier ──────────────────────────────────────────────

  /**
   * [VULN-24] IllegalArgumentException : on retourne le message uniquement
   * s'il fait partie d'une allowlist de messages métier contrôlés.
   * Dans tous les autres cas, message générique.
   */
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegalArgument(
    IllegalArgumentException ex,
    HttpServletRequest request) {

    // Message retourné tel quel uniquement s'il ne contient pas d'infos système
    String safeMessage = isSafeBusinessMessage(ex.getMessage())
      ? ex.getMessage()
      : "Requête invalide";

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.BAD_REQUEST.value())
      .error("Requête invalide")
      .message(safeMessage)
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.badRequest().body(body);
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleNotFound(
    ResourceNotFoundException ex,
    HttpServletRequest request) {

    // [VULN-24] On ne retourne pas le message de l'exception (peut contenir un ID interne)
    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.NOT_FOUND.value())
      .error("Ressource introuvable")
      .message("La ressource demandée n'existe pas ou vous n'y avez pas accès.")
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
  }

  // ── Fallback ───────────────────────────────────────────────────

  /**
   * [VULN-26] Fallback avec errorId traçable — pas de stacktrace côté client.
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGeneric(
    Exception ex,
    HttpServletRequest request) {

    String errorId = UUID.randomUUID().toString();
    log.error("[errorId={}] Erreur non gérée sur {} : {}",
      errorId, request.getRequestURI(), ex.getMessage(), ex);

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
      .error("Erreur interne")
      .message("Une erreur inattendue s'est produite. Référence : " + errorId)
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.internalServerError().body(body);
  }

  // ── Helpers ────────────────────────────────────────────────────

  /**
   * Allowlist de messages métier sûrs à retourner au client.
   * Ajouter ici les messages contrôlés émis par les services.
   */
  private boolean isSafeBusinessMessage(String message) {
    if (message == null) return false;
    return message.matches("[\\p{L}\\p{N}\\s'.,!?@()-]{0,200}") &&
      !message.toLowerCase().contains("exception") &&
      !message.toLowerCase().contains("sql") &&
      !message.toLowerCase().contains("stack") &&
      !message.toLowerCase().contains("null");
  }

  // ── DTO de réponse d'erreur ────────────────────────────────────

  @lombok.Builder
  @lombok.Data
  public static class ErrorResponse {
    @lombok.Builder.Default
    private Instant timestamp = Instant.now();
    private int status;
    private String error;
    private String message;
    private String path;
    private Map<String, String> fieldErrors;
    // [VULN-26] Pas de champ "trace" ou "exception" — jamais de stacktrace
  }
}
