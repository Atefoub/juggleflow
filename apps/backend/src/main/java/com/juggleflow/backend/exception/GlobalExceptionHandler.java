package com.juggleflow.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Réponses d'erreur API : messages génériques côté client, errorId pour le fallback 500. */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {


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

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ErrorResponse> handleMissingRequestParam(
      MissingServletRequestParameterException ex,
      HttpServletRequest request) {

    ErrorResponse body = ErrorResponse.builder()
        .status(HttpStatus.BAD_REQUEST.value())
        .error("Requête invalide")
        .message("Paramètre obligatoire manquant : " + ex.getParameterName())
        .path(request.getRequestURI())
        .build();

    return ResponseEntity.badRequest().body(body);
  }


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
   * AccessDeniedException : levee par {@code @PreAuthorize} quand le
   * principal authentifie n'a pas l'autorite requise. Sans handler
   * dedie, l'aspect AOP la laisse remonter au DispatcherServlet qui la
   * traite via le fallback Exception (-> 500), ce qui est incorrect.
   * Mapping explicite vers 403, message generique cote client.
   */
  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDenied(
    AccessDeniedException ex,
    HttpServletRequest request) {

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.FORBIDDEN.value())
      .error("Accès refusé")
      .message("Vous n'avez pas les droits nécessaires pour effectuer cette action.")
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
  }

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

    ErrorResponse body = ErrorResponse.builder()
      .status(HttpStatus.NOT_FOUND.value())
      .error("Ressource introuvable")
      .message("La ressource demandée n'existe pas ou vous n'y avez pas accès.")
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
  }

  /**
   * ResponseStatusException : levee par les services pour signaler une regle
   * metier qui se traduit naturellement en code HTTP (409 conflit, 400 invalide,
   * etc.). Sans handler dedie, notre fallback {@code @ExceptionHandler(Exception.class)}
   * la capturait avant le {@code DefaultHandlerExceptionResolver} de Spring et
   * la transformait en 500.
   *
   * Le {@code reason} d'une ResponseStatusException est toujours emis par notre
   * propre code (jamais une cause externe), donc on peut le remonter au client
   * tel quel, en s'assurant qu'il reste court.
   */
  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ErrorResponse> handleResponseStatus(
    ResponseStatusException ex,
    HttpServletRequest request) {

    HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
    String reason = ex.getReason();
    if (reason == null || reason.length() > 200) {
      reason = status.getReasonPhrase();
    }

    ErrorResponse body = ErrorResponse.builder()
      .status(status.value())
      .error(status.getReasonPhrase())
      .message(reason)
      .path(request.getRequestURI())
      .build();

    return ResponseEntity.status(status).body(body);
  }


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
  }
}
