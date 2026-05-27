package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AdminLicenseSettingsResponse;
import com.juggleflow.backend.model.EstablishmentSettings;
import com.juggleflow.backend.repository.EstablishmentSettingsRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

/**
 * Quota licence établissement : élèves + enseignants (hors administrateurs).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EstablishmentLicenseService {

    private final EstablishmentSettingsRepository settingsRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    public long countLicensedSeatsUsed() {
        return studentRepository.count() + teacherRepository.count();
    }

    public EstablishmentSettings getSettings() {
        return settingsRepository.findById(1L)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Paramètres établissement non configurés."));
    }

    public AdminLicenseSettingsResponse getLicenseSettingsResponse() {
        return toLicenseSettingsResponse(getSettings());
    }

    @Transactional
    public AdminLicenseSettingsResponse updateLicenseSettings(int seatCap, LocalDate expiresAt) {
        long used = countLicensedSeatsUsed();
        if (seatCap < used) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Le plafond ne peut pas être inférieur au nombre de comptes utilisés ("
                    + used + " élèves et enseignants).");
        }

        EstablishmentSettings settings = getSettings();
        settings.setLicenseSeatCap(seatCap);
        settings.setLicenseExpiresAt(expiresAt);
        EstablishmentSettings saved = settingsRepository.save(settings);
        return toLicenseSettingsResponse(saved);
    }

    private AdminLicenseSettingsResponse toLicenseSettingsResponse(EstablishmentSettings settings) {
        long used = countLicensedSeatsUsed();
        LocalDate expiresAt = settings.getLicenseExpiresAt();
        boolean expired = expiresAt != null && expiresAt.isBefore(LocalDate.now());
        int cap = settings.getLicenseSeatCap();

        return AdminLicenseSettingsResponse.builder()
            .establishmentName(settings.getEstablishmentName())
            .licenseSeatCap(cap)
            .licenseUsedCount(used)
            .licenseExpiresAt(expiresAt != null ? expiresAt.toString() : null)
            .licenseExpired(expired)
            .licenseAtCapacity(used >= cap)
            .build();
    }

    /**
     * Vérifie qu'un nouveau compte élève ou enseignant peut être créé.
     */
    public void assertSeatAvailableForNewAccount() {
        EstablishmentSettings settings = getSettings();

        if (settings.getLicenseExpiresAt() != null
                && settings.getLicenseExpiresAt().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "La licence établissement a expiré. Contactez JuggleFlow pour le renouvellement.");
        }

        long used = countLicensedSeatsUsed();
        if (used >= settings.getLicenseSeatCap()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Capacité licence atteinte (" + used + "/" + settings.getLicenseSeatCap()
                    + " utilisateurs). Supprimez ou désactivez un compte avant d'en créer un nouveau.");
        }
    }
}
