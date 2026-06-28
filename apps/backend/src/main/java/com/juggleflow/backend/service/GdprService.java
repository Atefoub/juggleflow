package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.ConsentRequest;
import com.juggleflow.backend.dto.ConsentStatusResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.GdprConsent.ConsentStatus;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.User;
import org.springframework.security.authentication.DisabledException;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.service.gdpr.StudentYearEndAnonymizer;
import com.juggleflow.backend.service.gdpr.YearEndAnonymizationResult;
import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GdprService {

  private static final int CONSENT_IN_CLAUSE_CHUNK_SIZE = 500;

  private final GdprConsentRepository gdprConsentRepository;
  private final UserRepository userRepository;
  private final StudentRepository studentRepository;
  private final SchoolClassRepository schoolClassRepository;
  private final GdprPdfExporter gdprPdfExporter;
  private final StudentYearEndAnonymizer studentYearEndAnonymizer;

  /**
   * Version courante de la politique de confidentialite (injectee depuis
   * {@code application.properties}). Si la {@code policy_version} d'un
   * consentement enregistre differe, le statut bascule en EXPIRED.
   */
  @Value("${gdpr.current-policy-version:2026-1}")
  private String currentPolicyVersion;

  /**
   * Duree de validite par defaut (en jours) appliquee quand la requete
   * d'enregistrement ne fournit pas explicitement {@code expiresAt}.
   */
  @Value("${gdpr.consent-default-validity-days:400}")
  private long defaultValidityDays;

  @Value("${gdpr.enforce-parental-consent-on-auth:true}")
  private boolean enforceParentalConsentOnAuth;

  // -- Endpoints ---------------------------------------------------------------

  /**
   * Retourne le statut du consentement parental de chaque eleve d'une classe.
   */
  public List<ConsentStatusResponse> getClassConsentStatus(Long classId, String adminEmail) {
    assertClassExists(classId);
    List<Student> students = studentRepository.findBySchoolClass_Id(classId);

    return buildStatusResponses(students);
  }

  /**
   * Enregistre ou met a jour un consentement RGPD.
   */
  @Transactional
  public ConsentStatusResponse recordConsent(ConsentRequest request, String ipAddress) {
    User user = userRepository.findById(request.getUserId())
      .orElseThrow(() -> new ResourceNotFoundException(
        "Utilisateur", request.getUserId()));

    User legalGuardian = null;
    if (request.getLegalGuardianId() != null) {
      legalGuardian = userRepository.findById(request.getLegalGuardianId())
        .orElseThrow(() -> new ResourceNotFoundException(
          "Représentant légal", request.getLegalGuardianId()));
    }

    gdprConsentRepository.deleteByUser_IdAndConsentType(
      user.getId(), request.getConsentType());

    Instant expiresAt = request.getExpiresAt();
    if (expiresAt == null && request.getConsentGiven()) {
      expiresAt = Instant.now().plus(defaultValidityDays, ChronoUnit.DAYS);
    }

    GdprConsent consent = GdprConsent.builder()
      .user(user)
      .consentType(request.getConsentType())
      .consentGiven(request.getConsentGiven())
      .policyVersion(request.getPolicyVersion())
      .ipAddress(ipAddress)
      .legalGuardian(legalGuardian)
      .expiresAt(expiresAt)
      .build();

    gdprConsentRepository.save(consent);
    log.info("Consentement {} enregistré pour l'utilisateur {} (IP: {})",
      request.getConsentType(), user.getId(), ipAddress);

    ConsentStatus status = evaluateStatus(consent);

    if (request.getConsentType() == ConsentType.PARENTAL_MINOR
        && status == ConsentStatus.VALID
        && request.getConsentGiven()
        && !user.isEnabled()) {
      user.setEnabled(true);
      userRepository.save(user);
      log.info("Compte élève {} réactivé suite à enregistrement du consentement parental",
        user.getId());
    }
    return ConsentStatusResponse.builder()
      .userId(user.getId())
      .firstName(user.getFirstName())
      .lastName(user.getLastName())
      .hasParentalConsent(
        request.getConsentType() == ConsentType.PARENTAL_MINOR
          && status == ConsentStatus.VALID)
      .policyVersion(request.getPolicyVersion())
      .consentDate(consent.getConsentAt())
      .expiresAt(consent.getExpiresAt())
      .status(status)
      .build();
  }

  /**
   * Revoque un consentement RGPD.
   * Si PARENTAL_MINOR, desactive immediatement le compte de l'eleve.
   */
  @Transactional
  public void revokeConsent(Long userId, ConsentType consentType, String adminEmail) {
    User user = userRepository.findById(userId)
      .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));

    gdprConsentRepository.deleteByUser_IdAndConsentType(userId, consentType);

    if (consentType == ConsentType.PARENTAL_MINOR) {
      user.setEnabled(false);
      userRepository.save(user);
      log.warn(
        "Compte utilisateur {} désactivé suite à révocation du consentement "
          + "parental par l'admin {}",
        userId, adminEmail);
    }

    log.info("Consentement {} révoqué pour l'utilisateur {} par {}",
      consentType, userId, adminEmail);
  }

  /**
   * Export du registre des consentements d'une classe.
   */
  public List<ConsentStatusResponse> exportConsentRegister(Long classId) {
    assertClassExists(classId);
    List<Student> students = studentRepository.findBySchoolClass_Id(classId);
    return buildStatusResponses(students);
  }

  /**
   * Genere le registre des consentements au format PDF pour une classe.
   * Reutilise le calcul de statut centralise + le formatage delegue a
   * {@link GdprPdfExporter}, pour rester decouple du moteur PDF.
   */
  public byte[] exportConsentRegisterPdf(Long classId) {
    SchoolClass schoolClass = schoolClassRepository.findById(classId)
      .orElseThrow(() -> new ResourceNotFoundException("Classe", classId));
    List<ConsentStatusResponse> rows = buildStatusResponses(
      studentRepository.findBySchoolClass_Id(classId));
    return gdprPdfExporter.export(schoolClass, rows, currentPolicyVersion);
  }

  /**
   * Nombre d'eleves sans consentement parental VALID dans une classe
   * (inclut MISSING + REVOKED + EXPIRED). Pre-existant : la requete repository
   * ne comptait que les consentements manquants ; on enrichit ici pour couvrir
   * aussi les expires (cas d'usage : alerte cote dashboard).
   */
  public long getPendingConsentsCount(Long classId) {
    assertClassExists(classId);
    return buildStatusResponses(studentRepository.findBySchoolClass_Id(classId)).stream()
      .filter(r -> r.getStatus() != ConsentStatus.VALID)
      .count();
  }

  /**
   * Statut effectif d'un consentement individuel. Centralise la logique
   * pour eviter qu'elle ne se duplique entre endpoints et export PDF.
   *
   * Visible package pour les tests / autres services (AdminService).
   */
  public ConsentStatus evaluateStatus(GdprConsent consent) {
    if (consent == null) return ConsentStatus.MISSING;
    if (!consent.isConsentGiven()) return ConsentStatus.REVOKED;
    Instant expires = consent.getExpiresAt();
    if (expires != null && expires.isBefore(Instant.now())) {
      return ConsentStatus.EXPIRED;
    }
    if (consent.getPolicyVersion() != null
        && !consent.getPolicyVersion().equals(currentPolicyVersion)) {
      return ConsentStatus.EXPIRED;
    }
    return ConsentStatus.VALID;
  }

  /**
   * Resout le statut d'un eleve, sans charger le consentement en double.
   * Utilise par les rapports cote admin (cf. AdminService).
   */
  public ConsentStatus getParentalConsentStatus(Long userId) {
    Optional<GdprConsent> consent = gdprConsentRepository
      .findByUser_IdAndConsentType(userId, ConsentType.PARENTAL_MINOR);
    return consent.map(this::evaluateStatus).orElse(ConsentStatus.MISSING);
  }

  /**
   * Vérifie qu'un élève peut s'authentifier (login, refresh, requêtes API).
   * Désactive le compte si le consentement parental n'est plus valide.
   */
  @Transactional
  public void assertStudentMayAuthenticate(User user) {
    if (!enforceParentalConsentOnAuth || !(user instanceof Student)) {
      return;
    }
    ConsentStatus status = getParentalConsentStatus(user.getId());
    if (status == ConsentStatus.VALID) {
      return;
    }
    syncDisabledForInvalidParentalConsent(user, status);
    throw new DisabledException(consentBlockedMessage(status));
  }

  /**
   * Contrôle d'accès pour le filtre JWT (sans lever d'exception).
   */
  @Transactional
  public boolean isStudentAuthenticationAllowed(User user) {
    if (!enforceParentalConsentOnAuth || !(user instanceof Student)) {
      return true;
    }
    ConsentStatus status = getParentalConsentStatus(user.getId());
    if (status == ConsentStatus.VALID) {
      return true;
    }
    syncDisabledForInvalidParentalConsent(user, status);
    return false;
  }

  private void syncDisabledForInvalidParentalConsent(User user, ConsentStatus status) {
    if (user.isEnabled()) {
      user.setEnabled(false);
      userRepository.save(user);
      log.warn("Compte élève {} désactivé : consentement parental invalide ({})",
        user.getId(), status);
    }
  }

  private static String consentBlockedMessage(ConsentStatus status) {
    return switch (status) {
      case EXPIRED ->
        "Consentement parental expiré. Contactez votre établissement.";
      case REVOKED ->
        "Consentement parental révoqué. Contactez votre établissement.";
      case MISSING, VALID ->
        "Consentement parental requis. Contactez votre établissement.";
    };
  }

  /**
   * Charge les statuts de consentement parental pour une liste d'IDs en batch.
   * Utilisé par AdminService pour éviter N+1 dans getAllUsers().
   */
  public Map<Long, ConsentStatus> getBulkParentalConsentStatuses(List<Long> userIds) {
    if (userIds.isEmpty()) {
      return Map.of();
    }

    Map<Long, GdprConsent> consentsByUserId = loadParentalConsentsByUserId(userIds);

    return userIds.stream().collect(Collectors.toMap(
      id -> id,
      id -> {
        GdprConsent consent = consentsByUserId.get(id);
        return consent != null ? evaluateStatus(consent) : ConsentStatus.MISSING;
      }
    ));
  }

  /**
   * Tache planifiee : anonymisation des donnees eleves le 30 juin a 2h.
   *
   * Seuls les eleves de l'annee scolaire qui vient de se terminer sont
   * anonymises (school_year == annee courante), pour ne pas detruire les
   * donnees des promotions precedentes non archivees ni les eleves
   * inscrits pour l'annee suivante.
   */
  @Scheduled(cron = "0 0 2 30 6 ?")
  @Transactional
  public void scheduleYearEndDeletion() {
    int currentYear = Year.now().getValue();
    log.info("Début de l'anonymisation annuelle RGPD — année scolaire {}", currentYear);

    YearEndAnonymizationResult result =
      studentYearEndAnonymizer.anonymizeBySchoolYear(currentYear);

    log.info(
      "Anonymisation terminée : {} compte(s) élève(s) traité(s), {} détaché(s) de leur classe "
        + "(année scolaire {})",
      result.anonymized(), result.detached(), currentYear);

    if (result.anonymized() > 0 && result.detached() == 0) {
      log.warn(
        "Anonymisation sans détachement de classe pour l'année {} — vérifier la cohérence des données",
        currentYear);
    }
  }

  // -- Helpers prives ----------------------------------------------------------

  private List<ConsentStatusResponse> buildStatusResponses(List<Student> students) {
    if (students.isEmpty()) {
      return List.of();
    }

    List<Long> userIds = students.stream().map(Student::getId).toList();
    Map<Long, GdprConsent> consentsByUserId = loadParentalConsentsByUserId(userIds);

    return students.stream()
      .map(student -> buildStatusResponse(student, consentsByUserId.get(student.getId())))
      .toList();
  }

  private Map<Long, GdprConsent> loadParentalConsentsByUserId(Collection<Long> userIds) {
    if (userIds.isEmpty()) {
      return Map.of();
    }

    List<Long> idList = userIds instanceof List<Long> list
      ? list
      : new ArrayList<>(userIds);
    Map<Long, GdprConsent> consentsByUserId = new HashMap<>();

    for (int offset = 0; offset < idList.size(); offset += CONSENT_IN_CLAUSE_CHUNK_SIZE) {
      List<Long> chunk = idList.subList(
        offset, Math.min(offset + CONSENT_IN_CLAUSE_CHUNK_SIZE, idList.size()));
      gdprConsentRepository
        .findByUser_IdInAndConsentType(chunk, ConsentType.PARENTAL_MINOR)
        .forEach(consent -> consentsByUserId.putIfAbsent(consent.getUser().getId(), consent));
    }

    return consentsByUserId;
  }

  private ConsentStatusResponse buildStatusResponse(Student student, GdprConsent consent) {
    ConsentStatus status = consent != null
      ? evaluateStatus(consent)
      : ConsentStatus.MISSING;

    return ConsentStatusResponse.builder()
      .userId(student.getId())
      .firstName(student.getFirstName())
      .lastName(student.getLastName())
      .hasParentalConsent(status == ConsentStatus.VALID)
      .consentDate(consent != null ? consent.getConsentAt() : null)
      .policyVersion(consent != null ? consent.getPolicyVersion() : null)
      .expiresAt(consent != null ? consent.getExpiresAt() : null)
      .status(status)
      .build();
  }

  private void assertClassExists(Long classId) {
    if (!schoolClassRepository.existsById(classId)) {
      throw new ResourceNotFoundException("Classe", classId);
    }
  }
}
