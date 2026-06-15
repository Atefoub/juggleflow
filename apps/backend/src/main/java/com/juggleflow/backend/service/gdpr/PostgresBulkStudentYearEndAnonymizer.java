package com.juggleflow.backend.service.gdpr;

import com.juggleflow.backend.repository.PostgresStudentAnonymizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/**
 * Anonymisation bulk PostgreSQL ({@code gen_random_uuid()}).
 * Désactivé automatiquement quand la datasource pointe vers H2.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("!'${spring.datasource.url:}'.toLowerCase().contains('jdbc:h2')")
public class PostgresBulkStudentYearEndAnonymizer implements StudentYearEndAnonymizer {

  private final PostgresStudentAnonymizationRepository anonymizationRepository;

  @Override
  public YearEndAnonymizationResult anonymizeBySchoolYear(int schoolYear) {
    int anonymized = anonymizationRepository.anonymizeUsersBySchoolYear(schoolYear);
    int detached = anonymizationRepository.detachStudentsFromClassesBySchoolYear(schoolYear);
    return new YearEndAnonymizationResult(anonymized, detached);
  }
}
