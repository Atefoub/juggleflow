package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.ConsentRequest;
import com.juggleflow.backend.dto.ConsentStatusResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
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

  /**
   * Retourne le statut du consentement parental de chaque élève d'une classe.
   */
  public List<ConsentStatusResponse> getClassConsentStatus(Long classId, String adminEmail) {
    assertClassExists(classId);
    List<Student> students = studentRepository.findBySchoolClass_Id(classId);

    return students.stream().map(student -> {
      Optional<GdprConsent> consent = gdprConsentRepository
        .findByUser_IdAndConsentType(student.getId(), ConsentType.PARENTAL_MINOR);
      boolean hasConsent = consent.map(GdprConsent::isConsentGiven).orElse(false);

      return ConsentStatusResponse.builder()
        .userId(student.getId())
        .firstName(student.getFirstName())
        .lastName(student.getLastName())
        .hasParentalConsent(hasConsent)
        .consentDate(consent.map(GdprConsent::getConsentAt).orElse(null))
        .policyVersion(consent.map(GdprConsent::getPolicyVersion).orElse(null))
        .build();
    }).toList();
  }

  /**
   * Enregistre ou met à jour un consentement RGPD.
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

    GdprConsent consent = GdprConsent.builder()
      .user(user)
      .consentType(request.getConsentType())
      .consentGiven(request.getConsentGiven())
      .policyVersion(request.getPolicyVersion())
      .ipAddress(ipAddress)
      .legalGuardian(legalGuardian)
      .build();

    gdprConsentRepository.save(consent);
    log.info("Consentement {} enregistré pour l'utilisateur {} (IP: {})",
      request.getConsentType(), user.getId(), ipAddress);

    return ConsentStatusResponse.builder()
      .userId(user.getId())
      .firstName(user.getFirstName())
      .lastName(user.getLastName())
      .hasParentalConsent(
        request.getConsentType() == ConsentType.PARENTAL_MINOR
          && request.getConsentGiven())
      .policyVersion(request.getPolicyVersion())
      .build();
  }

  /**
   * Révoque un consentement RGPD.
   * Si PARENTAL_MINOR, désactive immédiatement le compte de l'élève.
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

    return students.stream().map(student -> {
      Optional<GdprConsent> consent = gdprConsentRepository
        .findByUser_IdAndConsentType(student.getId(), ConsentType.PARENTAL_MINOR);

      return ConsentStatusResponse.builder()
        .userId(student.getId())
        .firstName(student.getFirstName())
        .lastName(student.getLastName())
        .hasParentalConsent(consent.map(GdprConsent::isConsentGiven).orElse(false))
        .consentDate(consent.map(GdprConsent::getConsentAt).orElse(null))
        .policyVersion(consent.map(GdprConsent::getPolicyVersion).orElse(null))
        .build();
    }).toList();
  }

  /**
   * Nombre d'élèves sans consentement parental dans une classe.
   */
  public long getPendingConsentsCount(Long classId) {
    assertClassExists(classId);
    return gdprConsentRepository.countPendingParentalConsentsByClassId(classId);
  }

  /**
   * Tâche planifiée : anonymisation des données élèves le 30 juin à 2h du matin.
   *
   * CORRECTION : on n'anonymise que les élèves dont la classe appartient à l'année
   * scolaire qui vient de se terminer (school_year == année courante).
   * Auparavant, TOUS les élèves de TOUTES les années étaient anonymisés, ce qui
   * détruisait les données des promotions précédentes non encore archivées et
   * des élèves inscrits pour l'année suivante.
   */
  @Scheduled(cron = "0 0 2 30 6 ?")
  @Transactional
  public void scheduleYearEndDeletion() {
    int currentYear = Year.now().getValue();
    log.info("Début de l'anonymisation annuelle RGPD — année scolaire {}", currentYear);

    // Seuls les élèves dont la classe est de l'année scolaire en cours
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

  // ── Helpers privés ───────────────────────────────────────────

  private void assertClassExists(Long classId) {
    if (!schoolClassRepository.existsById(classId)) {
      throw new ResourceNotFoundException("Classe", classId);
    }
  }
}
