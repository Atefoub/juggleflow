package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GdprConsentRepository extends JpaRepository<GdprConsent, Long> {

    /**
     * Retourne tous les consentements d'un utilisateur.
     */
    List<GdprConsent> findByUser_Id(Long userId);

    /**
     * Recherche un consentement précis par utilisateur et type.
     */
    Optional<GdprConsent> findByUser_IdAndConsentType(Long userId, ConsentType consentType);

    /**
     * Compte les élèves d'une classe sans consentement parental (PARENTAL_MINOR)
     * accordé (consentGiven = false ou consentement absent).
     */
    @Query("""
        SELECT COUNT(DISTINCT s.id)
        FROM Student s
        WHERE s.schoolClass.id = :classId
        AND s.id NOT IN (
            SELECT gc.user.id
            FROM GdprConsent gc
            WHERE gc.consentType = 'PARENTAL_MINOR'
            AND gc.consentGiven = true
        )
        """)
    long countPendingParentalConsentsByClassId(@Param("classId") Long classId);

    /**
     * Retourne les élèves d'une classe sans consentement parental accordé.
     */
    @Query("""
        SELECT s
        FROM Student s
        WHERE s.schoolClass.id = :classId
        AND s.id NOT IN (
            SELECT gc.user.id
            FROM GdprConsent gc
            WHERE gc.consentType = 'PARENTAL_MINOR'
            AND gc.consentGiven = true
        )
        """)
    List<com.juggleflow.backend.model.Student> findPendingConsentsByClassId(
            @Param("classId") Long classId);

    /**
     * Supprime tous les consentements d'un utilisateur et d'un type donné.
     * Utilisé lors de la révocation.
     */
    void deleteByUser_IdAndConsentType(Long userId, ConsentType consentType);
}
