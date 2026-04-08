// filename: backend/src/main/java/com/juggleflow/backend/service/GdprService.java
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
     * Utilisé par l'écran Admin RGPD (wireframe 17) pour les 3 compteurs
     * Accordés / Manquants / Expirés.
     *
     * @param classId   l'identifiant de la classe
     * @param adminEmail l'email de l'administrateur authentifié (pour journalisation)
     * @return la liste des statuts de consentement par élève
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
     * Capture l'adresse IP pour la traçabilité légale.
     * Si un consentement du même type existe déjà pour cet utilisateur,
     * il est remplacé par le nouveau.
     *
     * @param request   les données du consentement
     * @param ipAddress l'adresse IP du client (extraite de HttpServletRequest)
     * @return le consentement enregistré sous forme de DTO
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

        // Suppression de l'éventuel consentement précédent du même type
        // pour éviter les doublons (l'historique n'est pas conservé dans ce modèle)
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
     * Si le consentement révoqué est de type PARENTAL_MINOR, le compte
     * de l'élève est immédiatement désactivé (user.enabled = false)
     * conformément aux exigences RGPD pour les mineurs.
     *
     * @param userId     l'identifiant de l'utilisateur concerné
     * @param consentType le type de consentement à révoquer
     * @param adminEmail l'email de l'administrateur authentifié
     */
    @Transactional
    public void revokeConsent(Long userId, ConsentType consentType, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));

        gdprConsentRepository.deleteByUser_IdAndConsentType(userId, consentType);

        // Désactivation immédiate du compte si révocation du consentement parental
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
     * Retourne la liste des statuts de consentement d'une classe pour export CSV.
     * Alias lisible de getClassConsentStatus, sans vérification d'ownership
     * (déjà garanti par la sécurité Spring au niveau du controller).
     *
     * @param classId l'identifiant de la classe
     * @return la liste exportable des statuts de consentement
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
     * Compte le nombre d'élèves d'une classe sans consentement parental accordé.
     * Alimente le bouton "Relancer (N)" de l'écran Admin RGPD (wireframe 17).
     *
     * @param classId l'identifiant de la classe
     * @return le nombre d'élèves sans consentement
     */
    public long getPendingConsentsCount(Long classId) {
        assertClassExists(classId);
        return gdprConsentRepository.countPendingParentalConsentsByClassId(classId);
    }

    /**
     * Tâche planifiée : anonymisation des données élèves le 30 juin à 2h du matin.
     * Remplace email, prénom et nom par des valeurs neutres pour respecter
     * le droit à l'oubli RGPD appliqué aux mineurs en contexte scolaire.
     * Les données de progression sont conservées sous forme anonymisée
     * pour les bilans institutionnels.
     */
    @Scheduled(cron = "0 0 2 30 6 ?")
    @Transactional
    public void scheduleYearEndDeletion() {
        log.info("Début de l'anonymisation annuelle des données élèves (RGPD)");

        List<Student> allStudents = studentRepository.findAll();
        int count = 0;

        for (Student student : allStudents) {
            student.setEmail(UUID.randomUUID() + DELETED_EMAIL_SUFFIX);
            student.setFirstName(ANONYMIZED_NAME);
            student.setLastName(ANONYMIZED_NAME);
            student.setEnabled(false);
            // Dissociation de la classe pour l'année suivante
            student.setSchoolClass(null);
            studentRepository.save(student);
            count++;
        }

        log.info("Anonymisation terminée : {} compte(s) élève(s) traité(s)", count);
    }

    // ── Helpers privés ───────────────────────────────────────────

    private void assertClassExists(Long classId) {
        if (!schoolClassRepository.existsById(classId)) {
            throw new ResourceNotFoundException("Classe", classId);
        }
    }
}
