package com.juggleflow.backend.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Requêtes natives PostgreSQL pour l'anonymisation RGPD de fin d'année.
 * Bean absent quand la datasource pointe vers H2 (évite l'échec au démarrage).
 */
@Repository
@ConditionalOnExpression("!'${spring.datasource.url:}'.toLowerCase().contains('jdbc:h2')")
public class PostgresStudentAnonymizationRepository {

  @PersistenceContext
  private EntityManager entityManager;

  @Transactional
  public int anonymizeUsersBySchoolYear(int schoolYear) {
    return entityManager.createNativeQuery("""
        UPDATE users u
        SET email = gen_random_uuid()::text || '@deleted.juggleflow.fr',
            first_name = '[supprimé]',
            last_name = '[supprimé]',
            enabled = false
        FROM student s
        INNER JOIN school_class sc ON s.class_id = sc.class_id
        WHERE u.id = s.id
          AND sc.school_year = :schoolYear
        """)
      .setParameter("schoolYear", schoolYear)
      .executeUpdate();
  }

  @Transactional
  public int detachStudentsFromClassesBySchoolYear(int schoolYear) {
    return entityManager.createNativeQuery("""
        UPDATE student s
        SET class_id = NULL
        FROM school_class sc
        WHERE s.class_id = sc.class_id
          AND sc.school_year = :schoolYear
        """)
      .setParameter("schoolYear", schoolYear)
      .executeUpdate();
  }
}
