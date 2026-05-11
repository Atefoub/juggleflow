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
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GdprService {

  private static final String DELETED_EMAIL_SUFFIX = "@deleted.juggleflow.fr";
  private static final String ANONYMIZED_NAME = "[supprimé]";

  private final GdprConsentRepository gdprConsentRepository;
  private final UserRepository userRepository;
  private final StudentRepository studentRepository;
  private final SchoolClassRepository schoolClassRepository;
  private final GdprPdfExporter gdprPdfExporter;

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

  // -- Endpoints ---------------------------------------------------------------

  /**
   * Retourne le statut du consentement parental de chaque eleve d'une classe.
   */
  public List<ConsentStatusResponse> getClassConsentStatus(Long classId, String adminEmail) {
    assertClassExists(classId);
    List<Student> students = studentRepository.findBySchoolClass_Id(classId);

    return students.stream().map(this::buildStatusResponse).toList();
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
    return students.stream().map(this::buildStatusResponse).toList();
  }

  /**
   * Genere le registre des consentements au format PDF pour une classe.
   * Reutilise le calcul de statut centralise + le formatage delegue a
   * {@link GdprPdfExporter}, pour rester decouple du moteur PDF.
   */
  public byte[] exportConsentRegisterPdf(Long classId) {
    SchoolClass schoolClass = schoolClassRepository.findById(classId)
      .orElseThrow(() -> new ResourceNotFoundException("Classe", classId));
    List<ConsentStatusResponse> rows = studentRepository.findBySchoolClass_Id(classId)
      .stream()
      .map(this::buildStatusResponse)
      .toList();
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
    return studentRepository.findBySchoolClass_Id(classId).stream()
      .map(this::buildStatusResponse)
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

    List<Student> studentsToAnonymize = studentRepository.findAll().stream()
      .filter(s -> s.getSchoolClass() != null
        && s.getSchoolClass().getSchoolYear() == currentYear)
      .toList();

    int count = 0;
    for (Student student : studentsToAnonymize) {
      student.setEmail(UUID.randomUUID() + DELETED_EMAIL_SUFFIX);
      student.setFirstName(ANONYMIZED_NAME);
      student.setLastName(ANONYMIZED_NAME);
      student.setEnabled(false);
      student.setSchoolClass(null);
      studentRepository.save(student);
      count++;
    }

    log.info("Anonymisation terminée : {} compte(s) élève(s) traité(s) (année scolaire {})",
      count, currentYear);
  }

  // -- Helpers prives ----------------------------------------------------------

  private ConsentStatusResponse buildStatusResponse(Student student) {
    Optional<GdprConsent> consent = gdprConsentRepository
      .findByUser_IdAndConsentType(student.getId(), ConsentType.PARENTAL_MINOR);
    ConsentStatus status = consent.map(this::evaluateStatus).orElse(ConsentStatus.MISSING);

    return ConsentStatusResponse.builder()
      .userId(student.getId())
      .firstName(student.getFirstName())
      .lastName(student.getLastName())
      .hasParentalConsent(status == ConsentStatus.VALID)
      .consentDate(consent.map(GdprConsent::getConsentAt).orElse(null))
      .policyVersion(consent.map(GdprConsent::getPolicyVersion).orElse(null))
      .expiresAt(consent.map(GdprConsent::getExpiresAt).orElse(null))
      .status(status)
      .build();
  }

  private void assertClassExists(Long classId) {
    if (!schoolClassRepository.existsById(classId)) {
      throw new ResourceNotFoundException("Classe", classId);
    }
  }
}
